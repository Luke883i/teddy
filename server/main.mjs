import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SecretStore } from './lib/secrets.mjs';
import { StateStore } from './lib/state.mjs';
import { readDefaultConfig, mergeConfig } from './lib/config.mjs';
import { buildRealtimeSession, relayRealtime, classifyRealtimeFailure, RealtimeBackoff, validateRealtimeEndpoint } from './lib/realtime.mjs';
import { json, readBody, readJson, requireContentType, serveStatic } from './lib/http.mjs';
import { deploymentPolicy, guardRequest, SECURITY_HEADERS } from './lib/security.mjs';
import { normalizeProvider, providerCapabilities } from './lib/provider.mjs';
import { createLocalService } from './lib/local-service.mjs';
import { createRuntimeManager } from './lib/runtime-manager.mjs';

process.umask(0o077);
const VERSION='0.8.0';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HOME=process.env.TEDDY_HOME||path.join(process.env.HOME||process.cwd(),'.teddy');
const PORT=Number(process.env.TEDDY_PORT||8787),HOST=process.env.TEDDY_HOST||'127.0.0.1';
const PUBLIC_ORIGIN=process.env.TEDDY_PUBLIC_ORIGIN||'',AUTH_PASSWORD=process.env.TEDDY_AUTH_PASSWORD||'',MASTER_KEY=process.env.TEDDY_SECRET_MASTER_KEY||'';
const PROVIDER=normalizeProvider(process.env.TEDDY_PROVIDER||'local');
const policy=deploymentPolicy({listenHost:HOST,publicOrigin:PUBLIC_ORIGIN,authPassword:AUTH_PASSWORD,secretMasterKey:MASTER_KEY});
if(!policy.ok)throw new Error(`unsafe_deployment:${policy.error}`);
const REALTIME_URL=validateRealtimeEndpoint(process.env.TEDDY_OPENAI_REALTIME_URL||'https://api.openai.com/v1/realtime/calls');
const secrets=new SecretStore(HOME,{externalMasterKey:MASTER_KEY}),state=new StateStore(HOME),defaults=readDefaultConfig(ROOT);let config=mergeConfig(defaults,state.getSetting('config')||{});
const realtimeGate=new RealtimeBackoff(),runtime=createRuntimeManager({home:HOME}),localService=createLocalService({runtime});
if(PROVIDER==='local')runtime.start().catch(e=>console.error('local runtime:',e?.code||e?.message||e));
const localAvailability=()=>runtime.status();
const bootstrap=()=>({
  version:VERSION,
  ai:{provider:PROVIDER,...providerCapabilities(PROVIDER),...(PROVIDER==='local'?localService.status():{})},
  availability:PROVIDER==='local'?localAvailability():{availability:secrets.status().configured?'pronto':'degradato',ready:secrets.status().configured,installPhase:'not_applicable',engines:{}},
  secret:secrets.status(),config,
  persistence:{engine:'sqlite',durable:true,wal:true},
  security:{mode:policy.mode,authenticated:!!AUTH_PASSWORD,publicOrigin:policy.publicOrigin},
  realtime:{optional:PROVIDER!=='openai',transport:'webrtc',model:config.model,cooldownSeconds:realtimeGate.remaining()},
  render:{backend:'client-negotiated',webgl2:true,canvas2dFallback:true,webgpuOptional:true,presenceRig:'v4',morphology:'v5',anatomy:'v6',correctedDepth:true,audioReactive:true,adaptiveNoise:true},
  install:{id:String(state.getSetting('install_id')).slice(0,8)}
});

async function route(req,res){
  const guard=guardRequest(req,{listenHost:HOST,publicOrigin:PUBLIC_ORIGIN,authPassword:AUTH_PASSWORD});if(!guard.ok)return json(res,guard.status,{error:guard.error},guard.headers||{});
  const u=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,service:'teddy',version:VERSION,provider:PROVIDER,security:policy.mode,liveness:'up'});
  if(req.method==='GET'&&u.pathname==='/api/availability'){const a=PROVIDER==='local'?localAvailability():bootstrap().availability;return json(res,200,a)}
  if(req.method==='GET'&&u.pathname==='/api/ready'){const a=PROVIDER==='local'?localAvailability():bootstrap().availability;return json(res,a.ready?200:503,a)}
  if(req.method==='GET'&&u.pathname==='/api/bootstrap')return json(res,200,bootstrap());
  if(req.method==='GET'&&u.pathname==='/api/local/status')return json(res,200,localService.status());
  if(req.method==='POST'&&u.pathname==='/api/local/turn'){
    if(PROVIDER!=='local')return json(res,409,{error:'local_provider_disabled'});
    const localStatus=localService.status();if(!localStatus.ready)return json(res,503,{error:'local_runtime_not_ready',status:localStatus});
    requireContentType(req,'audio/wav');
    const controller=new AbortController(),abort=()=>controller.abort(Object.assign(new Error('client_aborted'),{name:'AbortError',code:'client_aborted'}));
    req.once('aborted',abort);res.once('close',()=>{if(!res.writableEnded)abort()});
    const audio=await readBody(req,2_000_000);if(audio.length<44||audio.subarray(0,4).toString()!=='RIFF'||audio.subarray(8,12).toString()!=='WAVE')return json(res,400,{error:'invalid_wav'});
    return localService.stream(audio,res,{signal:controller.signal});
  }
  if(req.method==='PUT'&&u.pathname==='/api/config'){const patch=await readJson(req,64_000);config=mergeConfig(defaults,patch);state.setSetting('config',config);return json(res,200,{config})}
  if(req.method==='POST'&&u.pathname==='/api/secrets/openai'){const body=await readJson(req,4_000);try{const secret=secrets.saveOpenAI(body.key);realtimeGate.clear();return json(res,200,{secret})}catch{return json(res,400,{error:'invalid_api_key'})}}
  if(req.method==='DELETE'&&u.pathname==='/api/secrets/openai'){secrets.clearOpenAI();realtimeGate.clear();return json(res,200,{secret:secrets.status()})}
  if(req.method==='POST'&&u.pathname==='/api/conversations')return json(res,201,{id:state.startConversation()});
  if(req.method==='POST'&&/^\/api\/conversations\/[^/]+\/end$/.test(u.pathname)){state.endConversation(u.pathname.split('/')[3]);return json(res,200,{ok:true})}
  if(req.method==='POST'&&u.pathname==='/api/turns'){const b=await readJson(req,64_000);if(!b.conversationId||!['user','assistant'].includes(b.role)||!b.text?.trim())return json(res,400,{error:'invalid_turn'});try{state.addTurn(b.conversationId,b.role,b.text)}catch{return json(res,409,{error:'conversation_missing'})}return json(res,201,{ok:true})}
  if(req.method==='GET'&&u.pathname==='/api/history')return json(res,200,{turns:state.history(Number(u.searchParams.get('limit')||100))});
  if(req.method==='GET'&&u.pathname==='/api/memories')return json(res,200,{memories:state.listMemories()});
  if(req.method==='POST'&&u.pathname==='/api/memories'){const b=await readJson(req,8_000);if(!b.text?.trim())return json(res,400,{error:'text_required'});return json(res,201,{id:state.addMemory(b.text,b.salience)})}
  if(req.method==='DELETE'&&/^\/api\/memories\/\d+$/.test(u.pathname)){state.deleteMemory(u.pathname.split('/').pop());return json(res,200,{ok:true})}
  if(req.method==='POST'&&u.pathname==='/api/realtime/session'){
    if(PROVIDER!=='openai')return json(res,409,{error:'cloud_provider_not_selected'});
    requireContentType(req,'application/sdp');
    let apiKey;try{apiKey=secrets.getOpenAI()}catch{return json(res,409,{error:'openai_key_corrupt'})}if(!apiKey)return json(res,409,{error:'openai_key_missing'});
    const cooldown=realtimeGate.current();if(cooldown)return json(res,cooldown.status||429,cooldown,{'retry-after':String(cooldown.retryAfterSeconds)});
    const sdp=(await readBody(req,1_000_000)).toString('utf8');if(!sdp.startsWith('v=0'))return json(res,400,{error:'invalid_sdp'});const session=buildRealtimeSession(config,state.listMemories());let upstream;
    try{upstream=await relayRealtime({apiKey,sdp,session,installId:state.getSetting('install_id'),url:REALTIME_URL,timeoutMs:Number(process.env.TEDDY_REALTIME_TIMEOUT_MS||20_000)})}catch(e){const timeout=e?.name==='TimeoutError'||e?.name==='AbortError',oversized=e?.code==='realtime_response_too_large',problem={error:timeout?'realtime_timeout':oversized?'realtime_invalid_response':'realtime_unreachable',status:timeout?504:502,kind:oversized?'upstream':'network',retryable:true,retryAfterSeconds:timeout?3:2};realtimeGate.register(problem);return json(res,problem.status,problem,{'retry-after':String(problem.retryAfterSeconds)})}
    if(!upstream.ok){const problem=classifyRealtimeFailure(upstream);realtimeGate.register(problem);return json(res,problem.status>=400&&problem.status<600?problem.status:502,problem,problem.retryAfterSeconds?{'retry-after':String(problem.retryAfterSeconds)}:{})}
    if(!upstream.text.startsWith('v=0')){const problem={error:'realtime_invalid_response',status:502,kind:'upstream',retryable:true,retryAfterSeconds:2};realtimeGate.register(problem);return json(res,502,problem,{'retry-after':'2'})}
    realtimeGate.clear();res.writeHead(201,{...SECURITY_HEADERS,'content-type':'application/sdp','cache-control':'no-store','content-length':Buffer.byteLength(upstream.text)});return res.end(upstream.text)
  }
  if(req.method==='GET'&&serveStatic(path.join(ROOT,'web'),req,res))return;
  return json(res,404,{error:'not_found'})
}
const server=http.createServer((req,res)=>{Promise.resolve(route(req,res)).catch(e=>{console.error(e?.publicCode||e?.code||e?.message||e);if(!res.headersSent)json(res,e.status||500,{error:e.publicCode||e.code||'internal_error'});else res.destroy()})});
server.requestTimeout=30_000;server.headersTimeout=10_000;server.keepAliveTimeout=5_000;server.maxHeadersCount=100;server.maxRequestsPerSocket=1000;
server.on('clientError',(_err,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')});
server.listen(PORT,HOST,()=>console.log(`Teddy ${VERSION} listening on http://${HOST}:${PORT} (${policy.mode}, ${PROVIDER})`));
let closing=false;function shutdown(){if(closing)return;closing=true;runtime.stop();server.close(()=>{state.close();process.exit(0)});setTimeout(()=>process.exit(1),3000).unref()}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);

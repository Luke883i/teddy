import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SecretStore } from './lib/secrets.mjs';
import { StateStore } from './lib/state.mjs';
import { readDefaultConfig, mergeConfig } from './lib/config.mjs';
import { buildRealtimeSession, relayRealtime } from './lib/realtime.mjs';
import { json, readBody, readJson, serveStatic } from './lib/http.mjs';
import { guardRequest, SECURITY_HEADERS } from './lib/security.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HOME=process.env.TEDDY_HOME||path.join(process.env.HOME||process.cwd(),'.teddy');
const PORT=Number(process.env.TEDDY_PORT||8787);const HOST=process.env.TEDDY_HOST||'127.0.0.1';
const secrets=new SecretStore(HOME),state=new StateStore(HOME),defaults=readDefaultConfig(ROOT);let config=mergeConfig(defaults,state.getSetting('config')||{});
const bootstrap=()=>({secret:secrets.status(),config,persistence:{engine:'sqlite',durable:true,wal:true},realtime:{transport:'webrtc',model:config.model},render:{backend:'client-negotiated',webgl2:true,canvas2dFallback:true,webgpuOptional:true},install:{id:String(state.getSetting('install_id')).slice(0,8)}});

async function route(req,res){
  const guard=guardRequest(req,{listenHost:HOST,port:PORT});if(!guard.ok)return json(res,guard.status,{error:guard.error});
  const u=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,service:'teddy',version:'0.1.0'});
  if(req.method==='GET'&&u.pathname==='/api/bootstrap')return json(res,200,bootstrap());
  if(req.method==='PUT'&&u.pathname==='/api/config'){const patch=await readJson(req);config=mergeConfig(defaults,patch);state.setSetting('config',config);return json(res,200,{config})}
  if(req.method==='POST'&&u.pathname==='/api/secrets/openai'){const body=await readJson(req,100_000);try{return json(res,200,{secret:secrets.saveOpenAI(body.key)})}catch{return json(res,400,{error:'invalid_api_key'})}}
  if(req.method==='DELETE'&&u.pathname==='/api/secrets/openai'){secrets.clearOpenAI();return json(res,200,{secret:secrets.status()})}
  if(req.method==='POST'&&u.pathname==='/api/conversations')return json(res,201,{id:state.startConversation()});
  if(req.method==='POST'&&/^\/api\/conversations\/[^/]+\/end$/.test(u.pathname)){state.endConversation(u.pathname.split('/')[3]);return json(res,200,{ok:true})}
  if(req.method==='POST'&&u.pathname==='/api/turns'){const b=await readJson(req);if(!b.conversationId||!['user','assistant'].includes(b.role)||!b.text?.trim())return json(res,400,{error:'invalid_turn'});try{state.addTurn(b.conversationId,b.role,b.text)}catch{return json(res,409,{error:'conversation_missing'})}return json(res,201,{ok:true})}
  if(req.method==='GET'&&u.pathname==='/api/history')return json(res,200,{turns:state.history(Number(u.searchParams.get('limit')||100))});
  if(req.method==='GET'&&u.pathname==='/api/memories')return json(res,200,{memories:state.listMemories()});
  if(req.method==='POST'&&u.pathname==='/api/memories'){const b=await readJson(req);if(!b.text?.trim())return json(res,400,{error:'text_required'});return json(res,201,{id:state.addMemory(b.text,b.salience)})}
  if(req.method==='DELETE'&&/^\/api\/memories\/\d+$/.test(u.pathname)){state.deleteMemory(u.pathname.split('/').pop());return json(res,200,{ok:true})}
  if(req.method==='POST'&&u.pathname==='/api/realtime/session'){
    let apiKey;try{apiKey=secrets.getOpenAI()}catch{return json(res,409,{error:'openai_key_corrupt'})}if(!apiKey)return json(res,409,{error:'openai_key_missing'});
    const sdp=(await readBody(req,2_000_000)).toString('utf8');if(!sdp.startsWith('v=0'))return json(res,400,{error:'invalid_sdp'});
    const session=buildRealtimeSession(config,state.listMemories());
    let upstream;try{upstream=await relayRealtime({apiKey,sdp,session,installId:state.getSetting('install_id'),url:process.env.TEDDY_OPENAI_REALTIME_URL||undefined,timeoutMs:Number(process.env.TEDDY_REALTIME_TIMEOUT_MS||20_000)})}catch(e){console.error('realtime relay failed',e?.name||e);const timeout=e?.name==='TimeoutError'||e?.name==='AbortError';return json(res,timeout?504:502,{error:timeout?'realtime_timeout':'realtime_unreachable'})}
    if(!upstream.ok){console.error('realtime upstream',upstream.status,upstream.text.slice(0,800));return json(res,upstream.status>=400&&upstream.status<600?upstream.status:502,{error:'realtime_upstream',status:upstream.status})}
    res.writeHead(201,{...SECURITY_HEADERS,'content-type':'application/sdp','cache-control':'no-store'});return res.end(upstream.text)
  }
  if(req.method==='GET'&&serveStatic(path.join(ROOT,'web'),req,res))return;
  return json(res,404,{error:'not_found'})
}
const server=http.createServer((req,res)=>{Promise.resolve(route(req,res)).catch(e=>{console.error(e);if(!res.headersSent)json(res,e.status||500,{error:e.publicCode||'internal_error'});else res.destroy()})});
server.listen(PORT,HOST,()=>console.log(`Teddy listening on http://${HOST}:${PORT}`));
function shutdown(){server.close(()=>{state.close();process.exit(0)});setTimeout(()=>process.exit(1),2000).unref()}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);

// Production GGUF proof: never uses TEDDY_LOCAL_ENGINE_MOCK or a fake completion server.
// Runs in a connected CI runner to install; replay forbids all non-loopback HTTP.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {createRuntimeManager,QWEN_SHA256} from '../server/lib/runtime-manager.mjs';
import {createLocalService} from '../server/lib/local-service.mjs';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-real-text-v20-')),home=path.join(tmp,'home');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=async()=>{const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p};
const port=await freePort(),appPort=await freePort();
const env={...process.env,TEDDY_PROVIDER:'local',TEDDY_HOME:home,TEDDY_TEXT_ONLY:'1',TEDDY_RUNTIME_AUTOINSTALL:'1',TEDDY_LOCAL_ENGINE_MOCK:'0',TEDDY_LLAMA_PORT:String(port),TEDDY_RUNTIME_FETCH_ATTEMPTS:'2',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0'};
let runtime=null,offline=null,app=null;
const report={type:'genuine_gguf_local_inference',schema:1,model:'QuantFactory/Qwen3-0.6B-GGUF Q4_K_M',pinnedSha256:QWEN_SHA256,realModel:false,appHttp:false,networklessRestart:false};
async function freeOfListener(port,limit=12000){
  const deadline=Date.now()+limit;
  while(Date.now()<deadline){
    const active=await new Promise(resolve=>{const socket=net.createConnection({port,host:'127.0.0.1'});socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.setTimeout(500,()=>{socket.destroy();resolve(false)})});
    if(!active)return;await sleep(120);
  }
  throw Error('managed_llm_listener_not_closed');
}
async function waitLocalReady(port,limit=90000){
  const deadline=Date.now()+limit;
  while(Date.now()<deadline){
    try{const r=await fetch(`http://127.0.0.1:${port}/api/availability`,{signal:AbortSignal.timeout(3000)});const data=await r.json();if(data.textReady===true)return data;if(data.installPhase==='failed')throw Error('app_llm_install_failed:'+JSON.stringify(data.lastProblem))}catch(e){if(String(e.message).startsWith('app_llm_install_failed'))throw e}
    await sleep(250);
  }
  throw Error('real_app_text_readiness_timeout');
}
try{
  const begin=Date.now();
  runtime=createRuntimeManager({home,env});
  const state=await runtime.start();
  assert.equal(state.mode,'text');assert.equal(state.ready,true,'real GGUF must complete self-test: '+JSON.stringify(state.lastProblem));
  assert.equal(state.textReady,true);
  assert.deepEqual(state.artifacts.map(a=>a.id),['llama-runtime','qwen3-0.6b']);
  assert.ok(state.artifacts.every(a=>a.verified===true));
  assert.equal(state.artifacts.find(a=>a.id==='qwen3-0.6b').sha256,QWEN_SHA256);
  const current=JSON.parse(fs.readFileSync(path.join(home,'runtime','current.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(home,'runtime','generations',current.id,'runtime.json'),'utf8'));
  const modelStats=fs.statSync(manifest.llama.model);
  assert.equal(modelStats.size,484220000);
  report.realModel=true;report.installMs=Date.now()-begin;report.bytes=modelStats.size;
  const response=await createLocalService({runtime,env}).text('Rispondi soltanto con un saluto in italiano.',{context:{turns:[],memories:[]}});
  assert.ok(response.length>=2&&response.length<=1200,'real inference returned invalid text');
  report.responseSha256=crypto.createHash('sha256').update(response).digest('hex');
  report.responseChars=response.length;
  runtime.stop();await freeOfListener(port);
  const networkDenied=async(url,options)=>{
    if(String(url).startsWith(`http://127.0.0.1:${port}/`))return fetch(url,options);
    throw Error('external_network_forbidden_after_install');
  };
  offline=createRuntimeManager({home,env:{...env,TEDDY_RUNTIME_AUTOINSTALL:'0'},fetchImpl:networkDenied});
  const restarted=await offline.start();
  assert.equal(restarted.textReady,true,'offline restart must re-self-test real model');
  assert.ok((await createLocalService({runtime:offline,env,fetchImpl:networkDenied}).text('Ciao.',{context:{turns:[],memories:[]}})).length>=2);
  report.networklessRestart=true;
  offline.stop();await freeOfListener(port);
  app=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env:{...env,TEDDY_PORT:String(appPort),TEDDY_RUNTIME_AUTOINSTALL:'0'},stdio:['ignore','pipe','pipe']});
  let stderr='';app.stderr.on('data',chunk=>{stderr+=String(chunk).slice(-800);});
  await waitLocalReady(appPort);
  const responseHttp=await fetch(`http://127.0.0.1:${appPort}/api/text/turn`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Ciao, Teddy.'}),signal:AbortSignal.timeout(60000)});
  const result=await responseHttp.json();assert.equal(responseHttp.status,200,JSON.stringify(result));
  assert.equal(result.provider,'local');assert.ok(result.reply.length>=2);assert.ok(result.conversationId);
  const history=await (await fetch(`http://127.0.0.1:${appPort}/api/history?limit=10`)).json();
  assert.ok(history.turns.some(t=>t.role==='user'&&t.text==='Ciao, Teddy.'));
  assert.ok(history.turns.some(t=>t.role==='assistant'&&t.text===result.reply));
  report.appHttp=true;report.turns=history.turns.length;report.httpReplySha256=crypto.createHash('sha256').update(result.reply).digest('hex');
  report.elapsedMs=Date.now()-begin;
  const out=path.join(process.env.RUNNER_TEMP||tmp,'teddy-real-text-v20-proof.json');
  fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.log('TEDDY_REAL_TEXT_E2E_PASS',JSON.stringify(report));
}catch(error){
  report.failure={code:error?.code||null,message:String(error?.message||error).slice(0,700),stack:String(error?.stack||'').slice(0,1800)};
  const out=path.join(process.env.RUNNER_TEMP||tmp,'teddy-real-text-v20-proof.json');
  fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.error('TEDDY_REAL_TEXT_E2E_FAILURE',JSON.stringify(report.failure));
  throw error;
}finally{
  app?.kill('SIGTERM');offline?.stop();runtime?.stop();
  await sleep(350);
  fs.rmSync(tmp,{recursive:true,force:true});
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function port(){const s=net.createServer();await new Promise(ok=>s.listen(0,'127.0.0.1',ok));const n=s.address().port;await new Promise(ok=>s.close(ok));return n}
async function scenario(provider){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-text-boundary-'+provider+'-')),n=await port(),url='http://127.0.0.1:'+n;
 const env={...process.env,TEDDY_HOME:home,TEDDY_PORT:String(n),TEDDY_PROVIDER:provider,TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_TEXT_ONLY:'1',TEDDY_RUNTIME_AUTOINSTALL:'0'};
 delete env.TEDDY_ENABLE_VOICE_ENDPOINTS;
 const server=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',x=>stderr=(stderr+String(x)).slice(-900));
 try{
  let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(url+'/api/bootstrap',{signal:AbortSignal.timeout(900)});if(r.ok){ready=true;break}}catch{}await sleep(100)}
  assert.ok(ready,'server startup '+stderr);
  const boot=await(await fetch(url+'/api/bootstrap')).json();
  assert.deepEqual(boot.interaction,{mode:'text',voiceUi:false,voiceEndpoints:false});
  assert.ok(!Object.hasOwn(boot,'realtime'),'no voice data in Step0 public bootstrap');
  const html=await(await fetch(url+'/')).text();
  assert.ok(html.includes('id="chatForm"'));assert.ok(!html.includes('id="talkBtn"'));assert.ok(!html.includes('id="remoteAudio"'));
  for(const endpoint of ['/api/local/turn','/api/realtime/session']){
   const response=await fetch(url+endpoint,{method:'POST',headers:{'content-type':endpoint.includes('realtime')?'application/sdp':'audio/wav'},body:endpoint.includes('realtime')?'v=0\r\n':'not-a-wav'});
   assert.equal(response.status,404,endpoint+' must be inert');
   assert.equal((await response.json()).error,'voice_not_enabled');
  }
  if(provider==='local'){
   const response=await fetch(url+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'chi sei?'})});
   assert.equal(response.status,200);const body=await response.json();assert.equal(body.semantic.path,'deterministic');assert.match(body.reply,/Teddy/);
  }else{
   const response=await fetch(url+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'chi sei?'})});
   assert.equal(response.status,200);assert.equal((await response.json()).semantic.path,'deterministic');
   const open=await fetch(url+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'spiega la gravità'})});
   assert.equal(open.status,409);assert.equal((await open.json()).error,'openai_key_missing');
  }
  console.log('TEDDY_STEP0_TEXT_ONLY_E2E',JSON.stringify({provider,voiceRoutesDenied:2,uiVoiceElements:0,chatHttp:true}));
 }finally{server.kill('SIGTERM');await sleep(230);if(server.exitCode===null)server.kill('SIGKILL');fs.rmSync(home,{recursive:true,force:true})}
}
await scenario('local');await scenario('openai');

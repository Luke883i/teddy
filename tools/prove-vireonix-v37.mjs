// HTTP + SQLite product proof using explicit MOCK upstream; never a real Vireonix eloquence benchmark.
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v37-proof-'));
const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});s.on('error',reject)});
const child=spawn(process.execPath,['--import',path.join(root,'tests/fixtures/vireonix-fetch-mock.mjs'),path.join(root,'server/main.mjs')],{cwd:root,env:{...process.env,TEDDY_PORT:String(port),TEDDY_HOME:home,TEDDY_PROVIDER:'vireonix',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_TEXT_ONLY:'1'},stdio:['ignore','pipe','pipe']});
let err='';child.stderr.on('data',chunk=>err+=chunk.toString());
let reported={schema:'teddy.vireonix.v37.mock_http',simulated:true,provider:'vireonix',sessions:0,turns:0,replay:false,switches:[],persistence:false};
const base='http://127.0.0.1:'+port;
async function api(route,method='GET',body){const resp=await fetch(base+route,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:resp.status,data:await resp.json()}}
try{
 let healthy=false;for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Teddy exited: '+err);try{const r=await api('/api/health');if(r.status===200){healthy=true;break}}catch{}await new Promise(r=>setTimeout(r,40))}assert.ok(healthy,'Teddy failed to start: '+err);
 const boot=await api('/api/bootstrap');assert.equal(boot.data.ai.provider,'vireonix');assert.equal(boot.data.ai.accountRequired,false);
 let first;
 for(let session=0;session<30;session++){
  let id=null;for(let j=0;j<3;j++){
   const text=['Spiega perché il cielo è blu','E se il treno è in ritardo?','Perché hai scelto questa risposta?'][j];
   const requestId=crypto.randomUUID();
   const r=await api('/api/text/turn','POST',{conversationId:id,text,requestId});
   assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.provider,'vireonix');assert.ok(r.data.reply.length>25);assert.equal(r.data.requestId,requestId);
   if(!id)id=r.data.conversationId;else assert.equal(id,r.data.conversationId);
   reported.turns++;if(session===0&&j===0)first={id,text,requestId,reply:r.data.reply};
  }reported.sessions++;
 }
 const replay=await api('/api/text/turn','POST',{conversationId:null,text:first.text,requestId:first.requestId});assert.equal(replay.status,200);assert.equal(replay.data.reply,first.reply);assert.equal(replay.data.replayed,true);reported.replay=true;
 const local=await api('/api/provider','PUT',{provider:'local'});assert.equal(local.status,200);assert.equal(local.data.ai.provider,'local');reported.switches.push('local');
 const localTurn=await api('/api/text/turn','POST',{text:'spiega perché il cielo è blu',requestId:crypto.randomUUID()});assert.equal(localTurn.status,200);assert.equal(localTurn.data.provider,'local');assert.match(localTurn.data.reply,/Ho sentito/);
 const remote=await api('/api/provider','PUT',{provider:'vireonix'});assert.equal(remote.status,200);reported.switches.push('vireonix');
 const openai=await api('/api/provider','PUT',{provider:'openai'});assert.equal(openai.status,200);reported.switches.push('openai');
 const missing=await api('/api/text/turn','POST',{text:'spiega perché il cielo è blu',requestId:crypto.randomUUID()});assert.equal(missing.status,409);assert.equal(missing.data.error,'openai_key_missing');
 const back=await api('/api/provider','PUT',{provider:'vireonix'});assert.equal(back.status,200);reported.switches.push('vireonix');
 const invalid=await api('/api/provider','PUT',{provider:'arbitrary-url'});assert.equal(invalid.status,400);
 const history=await api('/api/history?limit=300');assert.equal(history.status,200);assert.ok(history.data.turns.length>=180);reported.persistence=true;
 console.log(JSON.stringify({...reported,historyTurnCount:history.data.turns.length,port,pass:true},null,2));
}catch(error){console.error('FAIL',error,err);process.exitCode=1}
finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,2000)}});fs.rmSync(home,{recursive:true,force:true})}

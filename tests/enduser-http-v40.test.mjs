// Actual Node server + HTTP + SQLite. No external model is queried by greetings.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const password='a-hosted-test-password-that-is-sufficiently-long';
const auth='Basic '+Buffer.from('teddy:'+password).toString('base64');
const host='teddy-v40.onrender.com',origin='https://'+host;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
test('hosted HTTP: deterministic greeting, SQLite replay, denied Origin, provider switch', {timeout:30000},async()=>{
 const port=await freePort(),home=mkdtempSync(join(tmpdir(),'teddy-v40-greeting-'));
 let output='',child=spawn(process.execPath,['server/main.mjs'],{cwd:root,
  env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'0.0.0.0',TEDDY_PORT:String(port),TEDDY_PROVIDER:'local',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_TEXT_ONLY:'1',TEDDY_PUBLIC_ORIGIN:'https://teddy-bear.onrender.com',TEDDY_ALLOWED_HOSTS:host,TEDDY_AUTH_PASSWORD:password,TEDDY_SECRET_MASTER_KEY:'a'.repeat(64)},
  stdio:['ignore','ignore','pipe']});
 child.stderr.on('data',part=>{output+=String(part).slice(0,2000)});
 async function call(endpoint,method='GET',body,{requestOrigin=origin,authorization=auth,site='same-origin'}={}){
  const headers={host,origin:requestOrigin,authorization,'sec-fetch-site':site,...(body?{'content-type':'application/json'}:{})};
  return await new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:endpoint,method,headers},res=>{
   let raw='';res.setEncoding('utf8');res.on('data',b=>raw+=b);res.once('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(raw)})}catch(e){reject(e)}});
  });req.once('error',reject);req.end(body?JSON.stringify(body):undefined)})
 }
 try{
  let ready=false;for(let i=0;i<140;i++){if(child.exitCode!==null)throw Error('Teddy aborted: '+output);try{const x=await call('/api/bootstrap');if(x.status===200){ready=true;break}}catch{}await wait(50)}assert.ok(ready,output);
  const requestId=crypto.randomUUID();
  const greeting=await call('/api/text/turn','POST',{text:'ciao',conversationId:null,requestId});
  assert.equal(greeting.status,200,JSON.stringify(greeting));assert.equal(greeting.body.provider,'local');assert.equal(greeting.body.semantic.path,'deterministic');assert.ok(greeting.body.reply.trim().length>10);
  const replay=await call('/api/text/turn','POST',{text:'ciao',conversationId:null,requestId});
  assert.equal(replay.status,200);assert.equal(replay.body.reply,greeting.body.reply);assert.equal(replay.body.replayed,true);
  const history=await call('/api/history?limit=10');assert.equal(history.status,200);assert.equal(history.body.turns.length,2);
  const denied=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()},{requestOrigin:'https://evil.example'});
  assert.equal(denied.status,403);assert.equal(denied.body.error,'origin_not_allowed');
  const after=await call('/api/history?limit=10');assert.equal(after.body.turns.length,2);
  const selected=await call('/api/provider','PUT',{provider:'vireonix'});assert.equal(selected.status,200);assert.equal(selected.body.ai.provider,'vireonix');
  const remoteGreeting=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()});
  assert.equal(remoteGreeting.status,200);assert.equal(remoteGreeting.body.provider,'vireonix');assert.equal(remoteGreeting.body.semantic.path,'deterministic');
  const invalidAuth=await call('/api/provider','PUT',{provider:'local'},{authorization:'Basic '+Buffer.from('teddy:no').toString('base64')});assert.equal(invalidAuth.status,401);
  console.log('TEDDY_ENDUSER_HTTP_V40_PASS',JSON.stringify({greetingLength:greeting.body.reply.length,replayed:true,storedTurns:history.body.turns.length,blockedOrigin:denied.body.error,providerSwitch:'vireonix',noExternalLLMCalls:true}));
 }finally{child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),wait(1800)]);if(child.exitCode===null)child.kill('SIGKILL');rmSync(home,{recursive:true,force:true})}
});

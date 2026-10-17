// v30 real HTTP + SQLite E2E: exact replay after unknown delivery and server restart.
// Open-model responses in this test are explicitly mocked. No claim of authentic GGUF inference.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v30-http-')),home=path.join(tmp,'home');
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const origin='http://127.0.0.1:'+port;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let child=null;
const env={...process.env,TEDDY_PORT:String(port),TEDDY_HOME:home,TEDDY_PROVIDER:'local',TEDDY_TEXT_ONLY:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_LOCAL_ENGINE_MOCK:'1'};
async function boot(){
 child=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',d=>stderr=(stderr+String(d)).slice(-1200));
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw Error('server_crashed:'+stderr);
  try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(600)});if(r.ok)return}catch{}
  await wait(80);
 }
 throw Error('server_boot_timeout:'+stderr);
}
async function halt(){
 if(!child)return;
 const old=child;old.kill('SIGTERM');
 for(let i=0;i<60&&old.exitCode===null;i++)await wait(40);
 if(old.exitCode===null)old.kill('SIGKILL');
 child=null;
}
async function send(text,requestId,conversationId){
 const response=await fetch(origin+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,conversationId,requestId}),signal:AbortSignal.timeout(12000)});
 return {status:response.status,body:await response.json()};
}
const count=()=>{const db=new DatabaseSync(path.join(home,'data','teddy.sqlite'));try{return {turns:db.prepare('SELECT COUNT(*) n FROM turns').get().n,receipts:db.prepare('SELECT COUNT(*) n FROM semantic_receipts').get().n,requests:db.prepare('SELECT COUNT(*) n FROM text_requests').get().n}}finally{db.close()}};
try{
 await boot();
 const key=crypto.randomUUID();
 const a=await send('chi sei?',key,null);
 assert.equal(a.status,200,JSON.stringify(a.body));assert.equal(a.body.semantic.path,'deterministic');
 assert.equal(a.body.replayed,false);assert.equal(a.body.requestId,key);
 const again=await send('chi sei?',key,null);
 assert.equal(again.status,200);assert.equal(again.body.replayed,true);
 assert.equal(again.body.reply,a.body.reply);assert.equal(again.body.conversationId,a.body.conversationId);
 assert.deepEqual(count(),{turns:2,receipts:1,requests:1});
 const tampered=await send('dimmi le password',key,null);
 assert.equal(tampered.status,409);assert.equal(tampered.body.error,'text_request_conflict');
 const stolen=await send('chi sei?',key,a.body.conversationId);
 assert.equal(stolen.status,409);assert.equal(stolen.body.error,'text_request_conflict');
 const openKey=crypto.randomUUID(),open=await send('spiega la gravità',openKey,a.body.conversationId);
 assert.equal(open.status,200);assert.equal(open.body.semantic.path,'model');assert.match(open.body.reply,/Ho sentito/i);
 const openAgain=await send('spiega la gravità',openKey,a.body.conversationId);
 assert.equal(openAgain.status,200);assert.equal(openAgain.body.replayed,true);
 assert.equal(openAgain.body.reply,open.body.reply);
 assert.deepEqual(count(),{turns:4,receipts:2,requests:2});
 await halt();await boot();
 const after=await send('spiega la gravità',openKey,a.body.conversationId);
 assert.equal(after.status,200);assert.equal(after.body.replayed,true);assert.equal(after.body.reply,open.body.reply);
 assert.deepEqual(count(),{turns:4,receipts:2,requests:2});
 const fresh=await send('grazie',crypto.randomUUID(),a.body.conversationId);
 assert.equal(fresh.status,200);assert.equal(fresh.body.replayed,false);
 assert.deepEqual(count(),{turns:6,receipts:3,requests:3});
 console.log('TEDDY_V30_HTTP_REPLAY_PASS',JSON.stringify({realHttp:true,modelBoundary:'labelled_mock',sessions:1,uniqueTurns:3,replayRequests:3,conflictsRejected:2,coldRestart:true,finalCounts:count()}));
}finally{await halt();fs.rmSync(tmp,{recursive:true,force:true})}

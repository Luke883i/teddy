// Actual Teddy server + SQLite ten-turn acceptance using explicit mock ONLY for model questions.
// Separate genuine-GGUF workflow proves the authentic llama.cpp provider.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function freePort(){const s=net.createServer();await new Promise(ok=>s.listen(0,'127.0.0.1',ok));const p=s.address().port;await new Promise(ok=>s.close(ok));return p}
async function runScenario({mock,provider='local',cases}){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v26-interaction-')),port=await freePort(),url='http://127.0.0.1:'+port;
 const env={...process.env,TEDDY_HOME:home,TEDDY_PORT:String(port),TEDDY_PROVIDER:provider,TEDDY_TEXT_ONLY:'1',TEDDY_LOCAL_ENGINE_MOCK:mock?'1':'0',TEDDY_RUNTIME_AUTOINSTALL:'0'};
 const child=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 let logs='';child.stderr.on('data',c=>logs=(logs+String(c)).slice(-1500));let db;
 try{
   let live=false;for(let i=0;i<140;i++){try{const response=await fetch(url+'/api/bootstrap',{signal:AbortSignal.timeout(900)});if(response.ok){live=true;break}}catch{}await sleep(90)}
   assert.ok(live,'server not ready: '+logs);
   let conversationId=null;const receipts=[],timings=[];
   for(const [index,{input,act,path:mode,expected,status=200}] of cases.entries()){
     const started=performance.now();
     const response=await fetch(url+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:input,conversationId}),signal:AbortSignal.timeout(15000)});
     const data=await response.json();timings.push(Math.round(performance.now()-started));
     assert.equal(response.status,status,'turn '+index+': '+JSON.stringify(data));
     if(status!==200){assert.equal(data.error,expected);continue}
     assert.ok(data.reply?.length>10&&data.reply.length<4000,'turn '+index+' text');
     assert.equal(data.semantic?.act,act,'turn '+index);
     assert.equal(data.semantic?.path,mode,'turn '+index);
     if(expected)assert.match(data.reply,expected,'turn '+index);
     conversationId=data.conversationId;receipts.push(data);
   }
   const rows=await(await fetch(url+'/api/history?limit=50')).json();
   assert.equal(rows.turns.length,receipts.length*2,'every actual HTTP turn persists exactly two rows');
   db=new DatabaseSync(path.join(home,'data','teddy.sqlite'));
   const stored=db.prepare('SELECT receipt_json FROM semantic_receipts ORDER BY id').all().map(x=>JSON.parse(x.receipt_json));
   assert.equal(stored.length,receipts.length);
   assert.deepEqual(stored.map(x=>x.path),receipts.map(x=>x.semantic.path));
   console.log('TEDDY_V26_HTTP_E2E_PASS',JSON.stringify({mock,provider,requests:cases.length,persistedTurns:rows.turns.length,receipts:stored.length,maxMs:Math.max(...timings),medianMs:[...timings].sort((a,b)=>a-b)[Math.floor(timings.length/2)],modelPathCount:stored.filter(x=>x.path==='model').length}));
 }finally{try{db?.close()}catch{}child.kill('SIGTERM');await sleep(200);if(child.exitCode===null)child.kill('SIGKILL');fs.rmSync(home,{recursive:true,force:true})}
}
await runScenario({mock:true,cases:[
 {input:'chi sei?',act:'identity',path:'deterministic',expected:/Teddy/},
 {input:'sei in gamba',act:'praise',path:'deterministic',expected:/complimento|giudizio|valutazione/i},
 {input:'Mi chiamo Luca',act:'introduction',path:'deterministic',expected:/Luca/},
 {input:'come mi chiamo?',act:'name_query',path:'deterministic',expected:/Luca/},
 {input:'non mi chiamo Luca',act:'open',path:'model',expected:/Ho sentito/},
 {input:'come mi chiamo?',act:'name_query',path:'deterministic',expected:/non me lo|non lo ritrovo/i},
 {input:'Chiamami Elena',act:'introduction',path:'deterministic',expected:/Elena/},
 {input:'come mi chiamo?',act:'name_query',path:'deterministic',expected:/Elena/},
 {input:'spiega perché piove',act:'open',path:'model',expected:/Ho sentito/},
 {input:'grazie di cuore',act:'thanks',path:'deterministic'}
]});
await runScenario({mock:false,cases:[
 {input:'chi sei?',act:'identity',path:'deterministic',expected:/Teddy/},
 {input:'perché piove?',status:503,expected:'local_text_not_ready'}
]});
await runScenario({mock:false,provider:'openai',cases:[
 {input:'chi sei?',act:'identity',path:'deterministic',expected:/Teddy/},
 {input:'spiega le stelle',status:409,expected:'openai_key_missing'}
]});

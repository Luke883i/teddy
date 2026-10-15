import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v24-chat-e2e-'));
const home=path.join(tmp,'home');
const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
const child=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env:{...process.env,TEDDY_PORT:String(port),TEDDY_HOME:home,TEDDY_PROVIDER:'local',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_TEXT_ONLY:'1'},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',d=>stderr=(stderr+String(d)).slice(-1700));
const url='http://127.0.0.1:'+port;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function send(text,conversationId){
 const res=await fetch(url+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,conversationId}),signal:AbortSignal.timeout(12000)});
 const json=await res.json();assert.equal(res.status,200,JSON.stringify(json));return json;
}
let db;
try{
 let healthy=false;
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)throw Error('server_exited:'+stderr);
  try{const z=await fetch(url+'/api/bootstrap',{signal:AbortSignal.timeout(600)});if(z.ok){healthy=true;break}}catch{}
  await wait(80);
 }
 assert.ok(healthy,'server startup failed '+stderr);
 const id=await send('chi sei?');
 assert.equal(id.semantic.path,'deterministic');assert.equal(id.semantic.act,'identity');assert.match(id.reply,/Teddy/i);
 const intro=await send('Mi chiamo Luca',id.conversationId);
 assert.equal(intro.semantic.path,'deterministic');assert.equal(intro.conversationId,id.conversationId);
 const recall=await send('come mi chiamo?',id.conversationId);
 assert.equal(recall.semantic.act,'name_query');assert.match(recall.reply,/Luca/);
 const open=await send('spiega la gravità',id.conversationId);
 assert.equal(open.semantic.path,'model');assert.match(open.reply,/Ho sentito/i);
 const other=await send('come mi chiamo?');
 assert.notEqual(other.conversationId,id.conversationId);
 assert.doesNotMatch(other.reply,/Luca/);
 const hist=await(await fetch(url+'/api/history?limit=20')).json();
 assert.equal(hist.turns.length,10);
 db=new DatabaseSync(path.join(home,'data','teddy.sqlite'));
 const turns=db.prepare('SELECT COUNT(*) n FROM turns').get().n;
 const receipts=db.prepare('SELECT receipt_json FROM semantic_receipts ORDER BY id').all().map(x=>JSON.parse(x.receipt_json));
 assert.equal(turns,10);assert.equal(receipts.length,5);
 assert.deepEqual(receipts.slice(0,4).map(x=>x.path),['deterministic','deterministic','deterministic','model']);
 assert.ok(receipts.every(x=>!JSON.stringify(x).includes('Mi chiamo Luca')));
 console.log('TEDDY_SEMANTIC_HTTP_E2E_PASS',JSON.stringify({messages:5,turns,receipts:receipts.length,identity:'rules',recall:'same_thread',open:'actual_mock_boundary',foreignThread:'isolated'}));
}finally{
 try{db?.close()}catch{}
 child.kill('SIGTERM');
 await wait(180);
 if(child.exitCode===null)child.kill('SIGKILL');
 fs.rmSync(tmp,{recursive:true,force:true});
}

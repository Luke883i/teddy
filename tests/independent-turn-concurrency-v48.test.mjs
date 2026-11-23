import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';import crypto from 'node:crypto';import {spawn} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n}
test('slow instrumented model in chat B does not block deterministic chat A; same chat remains serialized', {timeout:25000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-turns-v48-'));const p=await port();
 const child=spawn(process.execPath,['--import',path.join(root,'tests/fixtures/slow-vireonix-v48.mjs'),path.join(root,'server/main.mjs')],{cwd:root,env:{...process.env,TEDDY_HOME:home,TEDDY_PORT:String(p),TEDDY_PROVIDER:'vireonix',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_TEXT_ONLY:'1'},stdio:['ignore','pipe','pipe']});
 const call=async(endpoint,body)=>{const r=await fetch(`http://127.0.0.1:${p}${endpoint}`,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{});return {status:r.status,body:await r.json()}};
 try{
  let alive=false;for(let i=0;i<100;i++){try{if((await call('/api/bootstrap')).status===200){alive=true;break}}catch{}await sleep(35)}assert.ok(alive);
  const a=await call('/api/text/turn',{text:'ciao',requestId:crypto.randomUUID()});assert.equal(a.status,200);
  const b=await call('/api/text/turn',{text:'ciao',requestId:crypto.randomUUID()});assert.equal(b.status,200);
  const model=call('/api/text/turn',{text:'raccontami una storia originale',conversationId:b.body.conversationId,requestId:crypto.randomUUID()});
  await sleep(105);
  const parallel=await call('/api/text/turn',{text:'ciao',conversationId:a.body.conversationId,requestId:crypto.randomUUID()});
  const overlap=await call('/api/text/turn',{text:'grazie',conversationId:b.body.conversationId,requestId:crypto.randomUUID()});
  const done=await model;
  assert.equal(parallel.status,200,JSON.stringify(parallel));assert.equal(overlap.status,429,JSON.stringify(overlap));assert.equal(done.status,200,JSON.stringify(done));
  assert.equal((await call('/api/history?limit=20')).body.turns.length,8);
  console.log('INSTRUMENTED_CONCURRENCY_PASS',JSON.stringify({parallel:parallel.status,overlap:overlap.status,model:done.status,modelWasStub:true}));
 }finally{child.kill('SIGTERM');await sleep(150);if(child.exitCode===null)child.kill('SIGKILL');fs.rmSync(home,{recursive:true,force:true})}
});

import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=path.resolve(new URL('..',import.meta.url).pathname),home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v02-')),port=8791,mockPort=8991;let upstreamCalls=0;
const mock=http.createServer(async(req,res)=>{for await(const _ of req){}upstreamCalls++;res.writeHead(429,{'content-type':'application/json','retry-after':'7','x-request-id':'req_ci_429'});res.end(JSON.stringify({error:{type:'rate_limit_error',code:'rate_limit_exceeded',message:'rate limited'}}))});
await new Promise((resolve,reject)=>{mock.once('error',reject);mock.listen(mockPort,'127.0.0.1',resolve)});
const child=spawn(process.execPath,['server/main.mjs'],{cwd:root,env:{...process.env,TEDDY_PROVIDER:'openai',TEDDY_ENABLE_VOICE_ENDPOINTS:'1',TEDDY_HOME:home,TEDDY_PORT:String(port),TEDDY_OPENAI_REALTIME_URL:`http://127.0.0.1:${mockPort}/v1/realtime/calls`},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',d=>stderr+=d);
async function wait(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,50))}throw Error(`Teddy did not start: ${stderr}`)}
try{
  await wait();
  let r=await fetch(`http://127.0.0.1:${port}/api/secrets/openai`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:'sk-test-abcdefghijklmnopqrstuvwxyz'})});assert.equal(r.status,200);
  r=await fetch(`http://127.0.0.1:${port}/api/realtime/session`,{method:'POST',headers:{'content-type':'application/sdp'},body:'v=0\r\no=ci-offer'});assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'7');let b=await r.json();assert.equal(b.error,'openai_rate_limited');assert.equal(b.kind,'rate_limit');assert.equal(b.retryAfterSeconds,7);assert.equal(b.requestId,'req_ci_429');assert.equal(upstreamCalls,1);
  r=await fetch(`http://127.0.0.1:${port}/api/realtime/session`,{method:'POST',headers:{'content-type':'application/sdp'},body:'v=0\r\no=ci-offer-2'});assert.equal(r.status,429);b=await r.json();assert.equal(b.localCooldown,true);assert.ok(b.retryAfterSeconds>=6&&b.retryAfterSeconds<=7);assert.equal(upstreamCalls,1,'cooldown must prevent a second upstream request');
  console.log('realtime 429/cooldown smoke ok');
}finally{child.kill('SIGTERM');mock.close();fs.rmSync(home,{recursive:true,force:true});}

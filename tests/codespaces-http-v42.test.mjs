import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const codespace='fearful-poltergeist-7gxv5959w9g2rx64';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=async()=>{const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;};
test('Oct 29 Codespaces: actual Node HTTP/SQLite, Qwen greeting and model MOCK, Vireonix MOCK, strict origin', {timeout:35000},async()=>{
 const port=await freePort(),origin='https://'+codespace+'-'+port+'.app.github.dev';
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-codespaces-v42-'));
 let child=null,stderr='';
 async function call(route,method='GET',body,override={}){
  const headers={host:'127.0.0.1:'+port,origin,
    'sec-fetch-site':'same-origin','sec-fetch-mode':'cors','sec-fetch-dest':'empty',
    ...(body?{'content-type':'application/json'}:{}),...override};
  return new Promise((resolve,reject)=>{
   const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers},res=>{
    let raw='';res.setEncoding('utf8');res.on('data',b=>raw+=b);
    res.once('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(raw)})}catch(e){reject(e)}});
   });req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
  });
 }
 try{
  child=spawn(process.execPath,['--import',path.join(root,'tests/fixtures/vireonix-fetch-mock.mjs'),path.join(root,'server/main.mjs')],{
   cwd:root,stdio:['ignore','ignore','pipe'],
   env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'127.0.0.1',TEDDY_PORT:String(port),
    CODESPACE_NAME:codespace,TEDDY_PROVIDER:'local',TEDDY_TEXT_ONLY:'1',
    TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',
    TEDDY_PUBLIC_ORIGIN:'',TEDDY_AUTH_PASSWORD:'',TEDDY_ENABLE_VOICE_ENDPOINTS:'0'}
  });
  child.stderr.on('data',buf=>stderr=(stderr+String(buf)).slice(-1600));
  let boot;
  for(let i=0;i<160;i++){
   if(child.exitCode!==null)throw Error('server exited: '+stderr);
   try{const r=await call('/api/bootstrap');if(r.status===200){boot=r.data;break}}catch{}
   await sleep(40);
  }
  assert.ok(boot,'server not ready '+stderr);
  assert.equal(boot.security.mode,'loopback');
  assert.equal(boot.security.publicOrigin,null);
  assert.equal(boot.ai.provider,'local');
  assert.ok(typeof boot.security.csrfToken==='string'&&boot.security.csrfToken.length>=40);
  const csrf={'x-teddy-csrf':boot.security.csrfToken};
  const unproven=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()});
  assert.equal(unproven.status,403);assert.equal(unproven.data.error,'origin_not_allowed');
  const greeting=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()},csrf);
  assert.equal(greeting.status,200,JSON.stringify(greeting));assert.equal(greeting.data.provider,'local');
  assert.equal(greeting.data.semantic.path,'deterministic');assert.ok(greeting.data.reply.length>8);
  const qwen=await call('/api/text/turn','POST',{text:'spiega perché il cielo è blu',requestId:crypto.randomUUID()},csrf);
  assert.equal(qwen.status,200,JSON.stringify(qwen));assert.equal(qwen.data.provider,'local');
  assert.equal(qwen.data.semantic.path,'model');assert.match(qwen.data.reply,/Ho sentito/);
  const switched=await call('/api/provider','PUT',{provider:'vireonix'},csrf);
  assert.equal(switched.status,200,JSON.stringify(switched));assert.equal(switched.data.ai.provider,'vireonix');
  const remote=await call('/api/text/turn','POST',{text:'spiega perché il cielo è blu',requestId:crypto.randomUUID()},csrf);
  assert.equal(remote.status,200,JSON.stringify(remote));assert.equal(remote.data.provider,'vireonix');
  assert.equal(remote.data.semantic.path,'model');assert.match(remote.data.reply,/atmosfera/);
  const denied=await call('/api/provider','PUT',{provider:'local'},{...csrf,'sec-fetch-site':'cross-site'});
  assert.equal(denied.status,403);assert.equal(denied.data.error,'cross_site_request_rejected');
  const wrongPort=await call('/api/provider','PUT',{provider:'local'},{...csrf,origin:'https://'+codespace+'-9999.app.github.dev'});
  assert.equal(wrongPort.status,403);assert.equal(wrongPort.data.error,'origin_not_allowed');
  const history=await call('/api/history?limit=20');assert.equal(history.status,200);
  assert.equal(history.data.turns.length,6);
  const stillRemote=await call('/api/bootstrap');assert.equal(stillRemote.data.ai.provider,'vireonix');
  console.log('TEDDY_CODESPACES_V42_HTTP_PASS',JSON.stringify({originMode:'codespaces-loopback',
   genuineNodeHttp:true,sqliteTurns:6,localModel:'MOCK',remoteModel:'MOCK',
   deterministicGreeting:'PASS',providerChange:'PASS',csrfAndCrossSite:'PASS'}));
 }finally{
  child?.kill('SIGTERM');
  if(child?.exitCode===null)await Promise.race([new Promise(r=>child.once('exit',r)),sleep(1800)]);
  if(child?.exitCode===null)child.kill('SIGKILL');
  fs.rmSync(home,{recursive:true,force:true});
 }
});

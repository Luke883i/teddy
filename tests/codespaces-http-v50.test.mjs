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
import {browserOriginClaim,fetchWithCsrf} from '../web/fetch-with-csrf-v41.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const identity='fresh-codespace-mock112233';
const oldName='previous-codespace-mock445566';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=async()=>{const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;};

test('real HTTP/SQLite: screenshot Codespaces origin with stale server alias can chat and switch', {timeout:45000},async()=>{
 const port=await freePort(),origin=`https://${identity}-${port}.app.github.dev`;
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-codespaces-v50-'));
 let child=null,stderr='';
 async function call(route,method='GET',body,override={}){
  const headers={host:'127.0.0.1:'+port,origin,'sec-fetch-site':'same-origin',
   'sec-fetch-mode':'cors','sec-fetch-dest':'empty',
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
   cwd:root,stdio:['ignore','ignore','pipe'],env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'127.0.0.1',TEDDY_PORT:String(port),
    CODESPACE_NAME:oldName,TEDDY_PROVIDER:'local',TEDDY_TEXT_ONLY:'1',TEDDY_LOCAL_ENGINE_MOCK:'1',
    TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_PUBLIC_ORIGIN:'',TEDDY_AUTH_PASSWORD:'',TEDDY_ENABLE_VOICE_ENDPOINTS:'0'}
  });child.stderr.on('data',buf=>stderr=(stderr+String(buf)).slice(-1800));
  let boot;
  for(let i=0;i<160;i++){
   if(child.exitCode!==null)throw Error('server exited: '+stderr);
   try{const r=await call('/api/bootstrap','GET',null,{'x-teddy-page-origin':origin});if(r.status===200){boot=r.data;break}}catch{}
   await sleep(40);
  }
  assert.ok(boot,'server not ready '+stderr);
  assert.ok(typeof boot.security.csrfToken==='string'&&boot.security.csrfToken.length>=40);
  assert.equal(boot.security.mode,'loopback');
  const unproven=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()});
  assert.equal(unproven.status,403);assert.equal(unproven.data.error,'origin_not_allowed');
  const csrf={'x-teddy-csrf':boot.security.csrfToken};
  const hello=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()},csrf);
  assert.equal(hello.status,200,JSON.stringify(hello));assert.equal(hello.data.provider,'local');
  assert.ok(hello.data.reply.length>8);
  const qwen=await call('/api/text/turn','POST',{text:'spiega perché il cielo è blu',requestId:crypto.randomUUID()},csrf);
  assert.equal(qwen.status,200,JSON.stringify(qwen));assert.equal(qwen.data.semantic.path,'model');assert.match(qwen.data.reply,/Ho sentito/);
  const switched=await call('/api/provider','PUT',{provider:'vireonix'},csrf);
  assert.equal(switched.status,200,JSON.stringify(switched));assert.equal(switched.data.ai.provider,'vireonix');
  const remote=await call('/api/text/turn','POST',{text:'spiega perché il cielo è blu',requestId:crypto.randomUUID()},csrf);
  assert.equal(remote.status,200,JSON.stringify(remote));assert.equal(remote.data.provider,'vireonix');assert.match(remote.data.reply,/atmosfera/);
  const history=await call('/api/history?limit=20');assert.equal(history.status,200);assert.equal(history.data.turns.length,6);
  const outsider=await call('/api/provider','PUT',{provider:'local'},{...csrf,origin:`https://other-codespace-${port}.app.github.dev`});
  assert.equal(outsider.status,403);assert.equal(outsider.data.error,'origin_not_allowed');
  const cross=await call('/api/provider','PUT',{provider:'local'},{...csrf,'sec-fetch-site':'cross-site'});
  assert.equal(cross.status,403);assert.equal(cross.data.error,'cross_site_request_rejected');
  const still=await call('/api/bootstrap','GET',null,{'x-teddy-page-origin':origin});assert.equal(still.data.ai.provider,'vireonix');
  assert.equal(still.data.security.csrfToken,csrf['x-teddy-csrf']);
  console.log('TEDDY_ORIGIN_V50_HTTP_PASS',JSON.stringify({realHttp:true,sqliteTurns:6,source:'user-diagnostic-origin',
   processCodespaceName:'mismatched-fixture',localModel:'MOCK',remoteModel:'MOCK',
   originScopedCapability:'PASS',session:'PASS',providers:'PASS',crossOriginDenied:'PASS'}));
 }finally{
  child?.kill('SIGTERM');if(child?.exitCode===null)await Promise.race([new Promise(r=>child.once('exit',r)),sleep(1800)]);
  if(child?.exitCode===null)child.kill('SIGKILL');fs.rmSync(home,{recursive:true,force:true});
 }
});

test('client sends an explicit browser-Origin bootstrap claim and preserves retry identity',async()=>{
 const ui=fs.readFileSync(path.join(root,'web/app.js'),'utf8');
 assert.match(ui,/fetch\('\/api\/bootstrap',\{headers:browserOriginClaim\(\)/,'real app bootstrap must send the origin claim');
 const original=globalThis.window;
 try{
  globalThis.window={location:{origin:'https://fresh-codespace-mock112233-8787.app.github.dev'}};
  assert.equal(browserOriginClaim()['x-teddy-page-origin'],globalThis.window.location.origin);
  const old='old-token',fresh='a-new-origin-bound-token-that-is-long-enough';
  const boot={ai:{provider:'local'},security:{csrfToken:old}};
  const calls=[],json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  const fetchImpl=async(url,init)=>{calls.push({url,init});return calls.length===1?json({error:'origin_not_allowed'},403):
   calls.length===2?json({security:{csrfToken:fresh},ai:{provider:'local'}}):
   json({reply:'Ecco.',conversationId:'session-v50'})};
  const req={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'ciao',requestId:'unchanged-id'})};
  const reply=await fetchWithCsrf('/api/text/turn',req,{boot,fetchImpl});
  assert.equal(reply.status,200);assert.equal(calls.length,3);
  assert.equal(calls[1].init.headers['x-teddy-page-origin'],globalThis.window.location.origin);
  assert.equal(calls[0].init.body,calls[2].init.body);
  assert.equal(calls[2].init.headers['x-teddy-csrf'],fresh);
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original}
});

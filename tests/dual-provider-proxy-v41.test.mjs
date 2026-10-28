import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {guardRequest} from '../server/lib/security.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const password='enduser-auth-password-over-sixteen';
const auth='Basic '+Buffer.from('teddy:'+password).toString('base64');
const host='teddy-bear.onrender.com',origin='https://preview.example.test';
const policy={listenHost:'0.0.0.0',publicOrigin:'https://'+host,authPassword:password,csrfToken:'opaque-256-bit-token-for-test'};
const req=(headers={})=>({url:'/api/text/turn',method:'POST',socket:{encrypted:false},headers:{host,origin,authorization:auth,'sec-fetch-site':'same-origin','sec-fetch-mode':'cors','sec-fetch-dest':'empty','x-teddy-csrf':policy.csrfToken,...headers}});
test('hosted proxy browser proof is scoped and cannot bypass browser cross-site denial',()=>{
 const accept=guardRequest(req(),policy);assert.equal(accept.ok,true);
 for(const [change,code] of [
  [{'x-teddy-csrf':''},'origin_not_allowed'],
  [{'x-teddy-csrf':'wrong'},'origin_not_allowed'],
  [{'sec-fetch-site':'cross-site'},'cross_site_request_rejected'],
  [{'sec-fetch-mode':'navigate'},'origin_not_allowed'],
  [{'sec-fetch-dest':'document'},'origin_not_allowed'],
  [{origin:'null'},'origin_not_allowed'],
  [{host:'unlisted.attacker.tld'},'host_not_allowed'],
  [{authorization:''},'authentication_required']
 ]){const denied=guardRequest(req(change),policy);assert.equal(denied.ok,false,JSON.stringify(change));assert.equal(denied.error,code,JSON.stringify(change))}
 assert.equal(guardRequest(req({'x-teddy-csrf':'' ,origin:'https://'+host}),policy).ok,true,'canonical Origin remains backward-compatible');
});
async function getFreePort(){const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port}
test('genuine HTTP/SQLite path: accepted proxy browser turns use selected providers and never fake Vireonix', {timeout:45000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-dual-provider-v41-'));
 const port=await getFreePort();
 let child=null,stderr='';
 try{
  child=spawn(process.execPath,['--import',path.join(root,'tests/fixtures/vireonix-fetch-mock.mjs'),path.join(root,'server/main.mjs')],{
   cwd:root,stdio:['ignore','ignore','pipe'],env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'0.0.0.0',TEDDY_PORT:String(port),TEDDY_PUBLIC_ORIGIN:'https://'+host,TEDDY_AUTH_PASSWORD:password,TEDDY_SECRET_MASTER_KEY:'a'.repeat(64),TEDDY_PROVIDER:'local',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_TEXT_ONLY:'1',TEDDY_ENABLE_VOICE_ENDPOINTS:'0'}
  });
  child.stderr.on('data',b=>stderr=(stderr+String(b)).slice(-2000));
  async function call(pathname,method='GET',body,overrides={}){
   const headers={host,origin,authorization:auth,'sec-fetch-site':'same-origin','sec-fetch-mode':'cors','sec-fetch-dest':'empty',...(body?{'content-type':'application/json'}:{}),...overrides};
   const data=await new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:pathname,method,headers},response=>{
     let chunks='';response.setEncoding('utf8');response.on('data',chunk=>chunks+=chunk);
     response.once('end',()=>{let json;try{json=JSON.parse(chunks)}catch(error){reject(error);return}resolve({status:response.statusCode,json})});
    });req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
   });
   return data;
  }
  let boot=null;
  for(let i=0;i<150;i++){
   if(child.exitCode!==null)throw Error('Teddy exited: '+stderr);
   try{const r=await call('/api/bootstrap');if(r.status===200){boot=r.json;break}}catch{}
   await sleep(40);
  }
  assert.ok(boot,'real Teddy did not boot: '+stderr);
  assert.equal(boot.ai.provider,'local');assert.match(boot.security.csrfToken,/^[a-zA-Z0-9_-]{40,}$/);
  const csrf={'x-teddy-csrf':boot.security.csrfToken};
  const noProof=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()});
  assert.equal(noProof.status,403);assert.equal(noProof.json.error,'origin_not_allowed');
  const text='spiega perché il cielo è blu';
  const local=await call('/api/text/turn','POST',{text,requestId:crypto.randomUUID()},csrf);
  assert.equal(local.status,200,JSON.stringify(local));assert.equal(local.json.provider,'local');
  assert.equal(local.json.semantic.path,'model');assert.match(local.json.reply,/Ho sentito/i,'local response comes from explicit MOCK');
  const switchRes=await call('/api/provider','PUT',{provider:'vireonix'},csrf);
  assert.equal(switchRes.status,200,JSON.stringify(switchRes));assert.equal(switchRes.json.ai.provider,'vireonix');
  const remote=await call('/api/text/turn','POST',{text,requestId:crypto.randomUUID()},csrf);
  assert.equal(remote.status,200,JSON.stringify(remote));assert.equal(remote.json.provider,'vireonix');
  assert.equal(remote.json.semantic.path,'model');assert.match(remote.json.reply,/atmosfera/,'remote response comes from explicit MOCK fixture');
  const recorded=await call('/api/history?limit=20');
  assert.equal(recorded.status,200);assert.equal(recorded.json.turns.length,4);
  const denied=await call('/api/provider','PUT',{provider:'local'},{...csrf,'sec-fetch-site':'cross-site'});
  assert.equal(denied.status,403);assert.equal(denied.json.error,'cross_site_request_rejected');
  console.log('TEDDY_DUAL_PROVIDER_PROXY_V41_PASS',JSON.stringify({schema:'teddy.dual-provider.proxy.v41',realHttp:true,sqliteTurns:4,local:'mock',remote:'mock',security:'strict',originMismatchResolved:true}));
 }finally{
  child?.kill('SIGTERM');if(child?.exitCode===null)await Promise.race([new Promise(r=>child.once('exit',r)),sleep(1800)]);
  if(child?.exitCode===null)child.kill('SIGKILL');fs.rmSync(home,{recursive:true,force:true});
 }
});

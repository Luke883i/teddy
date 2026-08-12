import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deploymentPolicy, guardRequest, validBasicAuthorization } from '../server/lib/security.mjs';
import { readBody, readJson, requireContentType } from '../server/lib/http.mjs';
import { relayRealtime, validateRealtimeEndpoint, RealtimeBackoff } from '../server/lib/realtime.mjs';
import { SecretStore } from '../server/lib/secrets.mjs';
import { StateStore } from '../server/lib/state.mjs';

const MASTER='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
function req({host='teddy.example.invalid',method='GET',origin,auth,fetchSite,url='/api/bootstrap'}={}){return {method,url,headers:{host,...origin?{origin}:{},...auth?{authorization:auth}:{},...fetchSite?{'sec-fetch-site':fetchSite}:{}},socket:{encrypted:false}}}
const basic='Basic '+Buffer.from('teddy:strong-password-123').toString('base64');

test('remote deployment fails closed without HTTPS origin, auth and external master',()=>{
  assert.equal(deploymentPolicy({listenHost:'0.0.0.0'}).ok,false);
  assert.equal(deploymentPolicy({listenHost:'0.0.0.0',publicOrigin:'http://teddy.example',authPassword:'strong-password-123',secretMasterKey:MASTER}).ok,false);
  assert.equal(deploymentPolicy({listenHost:'0.0.0.0',publicOrigin:'https://teddy.example',authPassword:'strong-password-123',secretMasterKey:MASTER}).mode,'authenticated-proxy');
});
test('basic auth and origin boundary are exact and timing-safe path is exercised',()=>{
  assert.equal(validBasicAuthorization(basic,'strong-password-123'),true);assert.equal(validBasicAuthorization(basic,'wrong-password-123'),false);
  const opts={listenHost:'0.0.0.0',publicOrigin:'https://teddy.example.invalid',authPassword:'strong-password-123'};
  assert.equal(guardRequest(req(),opts).status,401);
  assert.equal(guardRequest(req({auth:basic}),opts).ok,true);
  assert.equal(guardRequest(req({method:'POST',auth:basic,origin:'http://teddy.example.invalid'}),opts).status,403);
  assert.equal(guardRequest(req({method:'POST',auth:basic,origin:'https://teddy.example.invalid'}),opts).ok,true);
  assert.equal(guardRequest(req({method:'POST',auth:basic,origin:'https://teddy.example.invalid',fetchSite:'cross-site'}),opts).status,403);
});
test('body contracts reject encoding, oversized declared bodies and wrong media types early',async()=>{
  assert.throws(()=>requireContentType({headers:{'content-type':'text/plain'}},'application/json'),e=>e.status===415);
  await assert.rejects(readBody({headers:{'content-length':'1001'},async *[Symbol.asyncIterator](){}},1000),e=>e.status===413);
  await assert.rejects(readBody({headers:{'content-encoding':'gzip'},async *[Symbol.asyncIterator](){}},1000),e=>e.status===415);
  await assert.rejects(readJson({headers:{'content-type':'application/json'},async *[Symbol.asyncIterator](){yield Buffer.from('{bad')}},1000),e=>e.status===400);
});
test('Realtime egress is HTTPS except explicit loopback test endpoints and response size is bounded',async()=>{
  assert.equal(validateRealtimeEndpoint('https://api.openai.com/v1/realtime/calls').startsWith('https://'),true);
  assert.equal(validateRealtimeEndpoint('http://127.0.0.1:9999/mock').startsWith('http://'),true);
  assert.throws(()=>validateRealtimeEndpoint('http://evil.example/realtime'),/unsafe_realtime_endpoint/);
  assert.throws(()=>validateRealtimeEndpoint('https://user:pass@api.openai.com/x'),/invalid_realtime_endpoint/);
  const fetchImpl=async()=>new Response('x',{status:200,headers:{'content-length':'1000001'}});
  await assert.rejects(relayRealtime({apiKey:'sk-test-abcdefghijklmnopqrstuvwxyz',sdp:'v=0\r\n',session:{},installId:'x',url:'http://127.0.0.1:9999/mock',fetchImpl,maxResponseBytes:1_000_000}),/realtime_response_too_large/);
});
test('transient network pressure participates in backoff',()=>{let now=0;const b=new RealtimeBackoff({now:()=>now});b.register({error:'x',kind:'network',retryable:true,retryAfterSeconds:4,status:502});assert.equal(b.remaining(),4);now=5000;assert.equal(b.current(),null)});
test('external secret master produces v2 AAD ciphertext without local master key',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-secret-'));try{const s=new SecretStore(home,{externalMasterKey:MASTER});const key='sk-test-abcdefghijklmnopqrstuvwxyz123';const status=s.saveOpenAI(key);assert.equal(status.protection,'external');assert.equal(s.getOpenAI(),key);assert.equal(fs.existsSync(path.join(home,'secrets','master.key')),false);const raw=fs.readFileSync(path.join(home,'secrets','openai.json'),'utf8');assert.equal(raw.includes(key),false);assert.equal(JSON.parse(raw).v,2)}finally{fs.rmSync(home,{recursive:true,force:true})}
});
test('SQLite store is private, hardened and passes quick_check',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-db-'));try{const s=new StateStore(home);s.addMemory('durable');assert.equal(s.quickCheck(),true);const mode=fs.statSync(path.join(home,'data','teddy.sqlite')).mode&0o777;assert.equal(mode&0o077,0);s.close()}finally{fs.rmSync(home,{recursive:true,force:true})}
});

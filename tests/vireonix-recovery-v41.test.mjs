import test from 'node:test';
import assert from 'node:assert/strict';
import {vireonixTextTurn,classifyVireonixHttp,VIREONIX_URL} from '../server/lib/vireonix-text.mjs';
const ok=()=>new Response(JSON.stringify({choices:[{message:{content:'Il cielo appare blu a causa della diffusione della luce solare nell’atmosfera.'},finish_reason:'stop'}]}),{status:200,headers:{'content-type':'application/json'}});
test('provider HTTP status preserves upstream truth as a bounded public diagnostic',()=>{
 for(const [status,code] of [[400,'vireonix_request_rejected'],[404,'vireonix_request_rejected'],[403,'vireonix_forbidden'],[429,'vireonix_rate_limited'],[500,'vireonix_upstream_unavailable'],[503,'vireonix_upstream_unavailable']]){
  const e=classifyVireonixHttp(status);assert.equal(e.code,code);assert.equal(e.upstreamStatus,status);
 }
});
test('single transient upstream 503 retries SAME provider, same payload, then validates answer',async()=>{
 const requests=[];const fetchImpl=async(url,options)=>{
  requests.push({url,body:options.body,signal:options.signal});
  return requests.length===1?new Response('',{status:503}):ok();
 };
 const reply=await vireonixTextTurn({text:'Spiega il cielo',fetchImpl});
 assert.match(reply,/atmosfera/);assert.equal(requests.length,2);
 assert.equal(requests[0].url,VIREONIX_URL);assert.equal(requests[0].body,requests[1].body);
 assert.ok(requests.every(x=>x.signal));
});
test('two upstream 502 failures remain failures, with real upstream status visible',async()=>{
 let calls=0;
 await assert.rejects(vireonixTextTurn({text:'Spiega il cielo',fetchImpl:async()=>{calls++;return new Response('',{status:502})}}),error=>{
  assert.equal(error.code,'vireonix_upstream_unavailable');assert.equal(error.upstreamStatus,502);return true;
 });
 assert.equal(calls,2);
});
test('nonretryable 400, 403 and 429 cannot waste free API capacity',async()=>{
 for(const status of [400,403,429]){
  let calls=0;await assert.rejects(vireonixTextTurn({text:'Spiega il cielo',fetchImpl:async()=>{calls++;return new Response('{}',{status})}}),e=>e.upstreamStatus===status);
  assert.equal(calls,1);
 }
});
test('network errors and invalid JSON are never laundered into a fabricated reply',async()=>{
 let calls=0;await assert.rejects(vireonixTextTurn({text:'Spiega il cielo',fetchImpl:async()=>{calls++;throw Error('DNS blocked')}}),e=>e.code==='vireonix_unreachable');assert.equal(calls,1);
 await assert.rejects(vireonixTextTurn({text:'Spiega il cielo',fetchImpl:async()=>new Response('BROKEN',{status:200,headers:{'content-type':'application/json'}})}),e=>e.code==='vireonix_invalid_json');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWithCsrf} from '../web/fetch-with-csrf-v41.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const option={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'ciao',requestId:'stable-id'})};
test('after Render restart, refresh token and retry the SAME human intent at most once',async()=>{
 const boot={ai:{provider:'local'},security:{csrfToken:'old-token-value'}},calls=[];
 const fetchImpl=async(url,init)=>{calls.push({url,init});
  if(calls.length===1)return json({error:'origin_not_allowed'},403);
  if(calls.length===2)return json({ai:{provider:'local'},security:{csrfToken:'new-token-value-long-enough-12345'}});
  return json({reply:'Eccomi.',provider:'local',conversationId:'persisted'});
 };
 const result=await fetchWithCsrf('/api/text/turn',option,{boot,fetchImpl});
 assert.equal(result.status,200);assert.equal(calls.length,3);
 assert.deepEqual(calls.map(x=>x.url),['/api/text/turn','/api/bootstrap','/api/text/turn']);
 assert.equal(calls[0].init.body,calls[2].init.body,'idempotent request body must be identical');
 assert.equal(calls[0].init.headers['x-teddy-csrf'],'old-token-value');
 assert.equal(calls[2].init.headers['x-teddy-csrf'],'new-token-value-long-enough-12345');
 assert.equal(boot.security.csrfToken,'new-token-value-long-enough-12345');
});
test('no retry for authentication, cross-site, rate-limit or ordinary model failure',async()=>{
 for(const [status,code] of [[401,'authentication_required'],[403,'cross_site_request_rejected'],[429,'text_turn_in_progress'],[502,'vireonix_unreachable']]){
  let calls=0;const response=await fetchWithCsrf('/api/text/turn',option,{boot:{security:{csrfToken:'old'}},fetchImpl:async()=>{calls++;return json({error:code},status)}});
  assert.equal(response.status,status);assert.equal(calls,1,code);
 }
});
test('unchanged or invalid bootstrap token does not send a duplicate user turn',async()=>{
 for(const token of ['old-token-value','short',null]){
  let calls=0;
  const response=await fetchWithCsrf('/api/text/turn',option,{boot:{security:{csrfToken:'old-token-value'}},fetchImpl:async()=>{
   calls++;return calls===1?json({error:'origin_not_allowed'},403):json({security:{csrfToken:token}});
  }});
  assert.equal(response.status,403);assert.equal(calls,2);
 }
});
test('human cancel suppresses a post-refresh resend',async()=>{
 const controller=new AbortController();let calls=0;
 const response=await fetchWithCsrf('/api/text/turn',{...option,signal:controller.signal},{boot:{security:{csrfToken:'old'}},fetchImpl:async()=>{
  calls++;if(calls===1)return json({error:'origin_not_allowed'},403);
  controller.abort();return json({security:{csrfToken:'a-new-token-value-of-sufficient-length'}});
 }});
 assert.equal(response.status,403);assert.equal(calls,2);
});

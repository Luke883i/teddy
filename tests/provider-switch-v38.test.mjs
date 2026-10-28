import test from 'node:test';
import assert from 'node:assert/strict';
import {guardRequest} from '../server/lib/security.mjs';
import {requestProviderSwitch,explainProviderSwitchFailure} from '../web/provider-switch-v38.js';
import {evaluateRenderDeployment} from '../server/lib/render-deployment-v35.mjs';

const password='a-long-proxy-auth-password-for-testing';
const auth='Basic '+Buffer.from('teddy:'+password).toString('base64');
const policy={listenHost:'0.0.0.0',publicOrigin:'https://teddy-bear.onrender.com',allowedHosts:'teddy-pr51.onrender.com',authPassword:password};
const req=(method='PUT',{host='teddy-pr51.onrender.com',origin='https://teddy-pr51.onrender.com',site='same-origin',authorization=auth}={})=>({
  method,url:method==='GET'?'/api/bootstrap':'/api/provider',
  headers:{host,origin,authorization,'sec-fetch-site':site},socket:{encrypted:false}
});
test('trusted HTTPS alias: bootstrap GET and provider PUT both pass with same-origin authorization',()=>{
  assert.deepEqual(guardRequest(req('GET'),policy),{ok:true});
  assert.deepEqual(guardRequest(req('PUT'),policy),{ok:true});
});
test('trusted HTTPS canonical domain works unchanged',()=>{
  assert.deepEqual(guardRequest(req('PUT',{host:'teddy-bear.onrender.com',origin:'https://teddy-bear.onrender.com'}),policy),{ok:true});
});
test('unlisted Host and malicious Origins stay blocked for mutating requests',()=>{
  for(const [opts,status,code] of [
    [{host:'evil.example',origin:'https://evil.example'},421,'host_not_allowed'],
    [{origin:'https://evil.example'},403,'origin_not_allowed'],
    [{origin:'http://teddy-pr51.onrender.com'},403,'origin_not_allowed'],
    [{origin:'https://teddy-pr51.onrender.com.evil.example'},403,'origin_not_allowed'],
    [{origin:'https://teddy-pr51.onrender.com:444'},403,'origin_not_allowed'],
    [{origin:'https://teddy-pr51.onrender.com',site:'cross-site'},403,'cross_site_request_rejected'],
    [{authorization:'Basic '+Buffer.from('teddy:wrong-pass').toString('base64')},401,'authentication_required']
  ]){
    const result=guardRequest(req('PUT',opts),policy);
    assert.equal(result.status,status,JSON.stringify(opts));assert.equal(result.error,code,JSON.stringify(opts));
  }
});
test('client sends one same-origin authenticated mutation and honors server result',async()=>{
  let captured;
  const reply=await requestProviderSwitch('vireonix',{fetchImpl:async(url,options)=>{
    captured={url,options};return new Response(JSON.stringify({ai:{provider:'vireonix'},availability:{ready:true}}),{status:200,headers:{'content-type':'application/json'}})
  }});
  assert.equal(captured.url,'/api/provider');assert.equal(captured.options.credentials,'same-origin');
  assert.equal(captured.options.method,'PUT');assert.equal(JSON.parse(captured.options.body).provider,'vireonix');
  assert.equal(reply.ai.provider,'vireonix');
});
test('client never reports a rejected or malformed response as a successful switch',async()=>{
  for(const [status,body,expected] of [
    [403,{error:'origin_not_allowed'},'origin_not_allowed'],
    [401,{error:'authentication_required'},'authentication_required'],
    [409,{error:'provider_switch_busy'},'provider_switch_busy'],
    [503,{error:'provider_persistence_failed'},'provider_persistence_failed'],
    [404,{error:'not_found'},'not_found']]){
    const response=()=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
    await assert.rejects(requestProviderSwitch('vireonix',{fetchImpl:async()=>response()}),e=>e.status===status&&e.code===expected);
  }
  await assert.rejects(requestProviderSwitch('vireonix',{fetchImpl:async()=>new Response('not json',{status:200})}),e=>e.code==='provider_switch_invalid_response');
  await assert.rejects(requestProviderSwitch('vireonix',{fetchImpl:async()=>{throw Error('offline')}}),e=>e.code==='provider_switch_network');
  await assert.rejects(requestProviderSwitch('attacker'),e=>e.code==='provider_invalid');
  assert.match(explainProviderSwitchFailure({status:403,code:'origin_not_allowed'}),/403.*origin_not_allowed/);
  assert.match(explainProviderSwitchFailure({status:401,code:'authentication_required'}),/401/);
});
test('hosted startup accepts explicit Vireonix without weakening proxy preflight',()=>{
  const env={RENDER:'true',RENDER_EXTERNAL_URL:'https://teddy-bear.onrender.com',
    RENDER_EXTERNAL_HOSTNAME:'teddy-bear.onrender.com',PORT:'10000',
    TEDDY_HOME:'/var/data/teddy',TEDDY_RENDER_MASTER_B64:Buffer.alloc(32,42).toString('base64'),
    TEDDY_AUTH_PASSWORD:'strong-private-password-456',TEDDY_PROVIDER:'vireonix',TEDDY_ENABLE_VOICE_ENDPOINTS:'0'};
  assert.equal(evaluateRenderDeployment(env,{nodeMajor:24}).valid,true);
  assert.equal(evaluateRenderDeployment({...env,TEDDY_PROVIDER:'unknown'},{nodeMajor:24}).valid,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapCsrfToken,codespacesOriginToken,guardRequest} from '../server/lib/security.mjs';

// Captured from the actual failed browser diagnostic (23 Nov 2026).
const actual='https://fresh-codespace-mock112233-8787.app.github.dev';
const staleCodespace='previous-codespace-mock445566';
const secret='opaque-process-token-used-only-in-this-test';
const policy={listenHost:'127.0.0.1',listenPort:8787,codespaceName:staleCodespace,csrfToken:secret};
const headers=(extra={})=>({host:'127.0.0.1:8787',origin:actual,'sec-fetch-site':'same-origin',
 'sec-fetch-mode':'cors','sec-fetch-dest':'empty','x-teddy-csrf':secret,...extra});
const request=(method='POST',extra={})=>({url:method==='PUT'?'/api/provider':'/api/text/turn',method,
 socket:{encrypted:false},headers:headers(extra)});
const boot=(extra={})=>({url:'/api/bootstrap',method:'GET',socket:{encrypted:false},
 headers:headers({'x-teddy-page-origin':actual,...extra})});

test('RED baseline: exact user Codespace alias is blocked by stale process CODESPACE_NAME',()=>{
 assert.deepEqual(guardRequest(request(),policy),{ok:false,status:403,error:'origin_not_allowed'});
 assert.deepEqual(guardRequest(request('PUT'),policy),{ok:false,status:403,error:'origin_not_allowed'});
});
test('V50: signed bootstrap origin capability repairs both chat and provider switching',()=>{
 const token=bootstrapCsrfToken(boot(),policy);
 assert.ok(token&&token!==secret&&token.length>=40);
 assert.equal(token,codespacesOriginToken(secret,actual,{listenPort:8787}));
 for(const method of ['POST','PUT'])assert.deepEqual(guardRequest(request(method,{'x-teddy-csrf':token}),policy),{ok:true});
 assert.equal(bootstrapCsrfToken(request('PUT',{'x-teddy-csrf':token}),policy),token);
});
test('V50: cross-Origin token replay and copied legacy token remain denied',()=>{
 const token=bootstrapCsrfToken(boot(),policy);
 const foreign='https://different-workspace-8787.app.github.dev';
 for(const change of [
  {origin:foreign},
  {origin:'https://fresh-codespace-mock112233-8788.app.github.dev'},
  {origin:'https://fresh-codespace-mock112233-8787.app.github.dev.evil.test'},
  {origin:'https://fresh-codespace-mock112233-8787.app.github.dev:8443'},
  {origin:'http://fresh-codespace-mock112233-8787.app.github.dev'},
  {origin:'null'}, {'sec-fetch-site':'same-site'}, {'sec-fetch-site':'cross-site'},
  {'sec-fetch-mode':'navigate'}, {'sec-fetch-dest':'document'},
  {'x-teddy-csrf':secret}, {'x-teddy-csrf':'bad'},
 ]){
  const denial=guardRequest(request('POST',{'x-teddy-csrf':token,...change}),policy);
  assert.equal(denial.ok,false,JSON.stringify(change));assert.equal(denial.status,403,JSON.stringify(change));
 }
 assert.equal(guardRequest(request('POST',{'x-teddy-csrf':token,host:'evil.example.test:8787'}),policy).status,421);
 assert.notEqual(codespacesOriginToken(secret,foreign,{listenPort:8787}),token);
});
test('V50: bootstrap never grants a bound token without exact port and same-origin browser metadata',()=>{
 for(const change of [
  {'x-teddy-page-origin':'https://evil.test'},
  {'x-teddy-page-origin':'https://fresh-codespace-mock112233-9999.app.github.dev'},
  {'x-teddy-page-origin':'null'}, {'x-teddy-page-origin':''},
  {'sec-fetch-site':'cross-site'}, {'sec-fetch-site':'same-site'},
  {'sec-fetch-mode':'navigate'}, {'sec-fetch-dest':'document'},
  {host:'untrusted.test:8787'},
  {origin:'https://foreign.test'},
 ])assert.equal(bootstrapCsrfToken(boot(change),policy),secret,JSON.stringify(change));
 const hosted={listenHost:'0.0.0.0',listenPort:8787,csrfToken:secret};
 assert.equal(bootstrapCsrfToken(boot(),hosted),secret);
});
test('V50: localhost direct origin and existing exact-name Codespaces proofs retain their semantics',()=>{
 const local=request('POST',{origin:'http://127.0.0.1:8787','x-teddy-csrf':''});
 assert.deepEqual(guardRequest(local,policy),{ok:true});
 const matching={...policy,codespaceName:'fresh-codespace-mock112233'};
 assert.deepEqual(guardRequest(request('PUT'),matching),{ok:true});
});

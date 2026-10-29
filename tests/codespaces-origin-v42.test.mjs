import test from 'node:test';
import assert from 'node:assert/strict';
import {codespacesForwardedOrigin,guardRequest} from '../server/lib/security.mjs';

const codespace='fearful-poltergeist-7gxv5959w9g2rx64';
const port=8787,host='127.0.0.1:8787';
const origin='https://'+codespace+'-'+port+'.app.github.dev';
const csrf='test-only-proof-32-plus-characters-random';
const policy={listenHost:'127.0.0.1',listenPort:port,codespaceName:codespace,csrfToken:csrf};
const request=(method='POST',overrides={})=>({
 url:method==='PUT'?'/api/provider':'/api/text/turn',method,
 socket:{encrypted:false},
 headers:{host,origin,'sec-fetch-site':'same-origin','sec-fetch-mode':'cors','sec-fetch-dest':'empty',
  'x-teddy-csrf':csrf,...overrides}
});

test('exact Oct 29 incident: GitHub Codespaces port-forward Origin is valid when bound to listener',()=>{
 assert.equal(codespacesForwardedOrigin(origin,{listenPort:port,codespaceName:codespace}),true);
 assert.deepEqual(guardRequest(request(),policy),{ok:true});
 assert.deepEqual(guardRequest(request('PUT'),policy),{ok:true});
});
test('reject other Codespaces, port, suffix, URL forms and attacker-controlled metadata',()=>{
 for(const attackerOrigin of [
  'http://'+codespace+'-8787.app.github.dev',
  'https://'+codespace+'-8788.app.github.dev',
  'https://different-workspace-8787.app.github.dev',
  'https://'+codespace+'-8787.app.github.dev.evil.test',
  'https://'+codespace+'-8787.app.github.dev:8443',
  'https://'+codespace+'-8787.app.github.dev/evil',
  'null','https://evil.test'
 ]){
  assert.equal(codespacesForwardedOrigin(attackerOrigin,{listenPort:port,codespaceName:codespace}),false,attackerOrigin);
  assert.equal(guardRequest(request('POST',{origin:attackerOrigin}),policy).status,403,attackerOrigin);
 }
 for(const [headers,status] of [
  [{'x-teddy-csrf':'wrong'},403],
  [{'x-teddy-csrf':''},403],
  [{'sec-fetch-site':'cross-site'},403],
  [{'sec-fetch-site':'none'},403],
  [{'sec-fetch-mode':'navigate'},403],
  [{'sec-fetch-dest':'document'},403],
  [{host:'evil.test:8787'},421],
  [{host:'localhost.evil.test:8787'},421]
 ]){
  const result=guardRequest(request('POST',headers),policy);
  assert.equal(result.status,status,JSON.stringify(headers));
 }
});
test('true local HTTP origin stays working without proxy token',()=>{
 const req=request('POST',{origin:'http://127.0.0.1:8787','x-teddy-csrf':''});
 assert.deepEqual(guardRequest(req,policy),{ok:true});
});
test('the forwarding rule is restricted to loopback, never a general hosted bypass',()=>{
 const badHost=request('POST',{host:'untrusted.github.dev'});
 assert.equal(guardRequest(badHost,{listenHost:'0.0.0.0',listenPort:port,csrfToken:csrf,publicOrigin:'https://teddy-bear.onrender.com'}).status,421);
 const hosted=request('POST',{host:'teddy-bear.onrender.com'});
 assert.equal(guardRequest(hosted,{listenHost:'0.0.0.0',listenPort:port,csrfToken:'',publicOrigin:'https://teddy-bear.onrender.com'}).status,403);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { guardRequest, SECURITY_HEADERS } from '../server/lib/security.mjs';
function req({host='127.0.0.1:8787',origin,method='GET'}={}){return{method,headers:{host,...(origin?{origin}:{})}}}
test('loopback host guard kills DNS rebinding',()=>{assert.equal(guardRequest(req({host:'evil.example:8787'}),{listenHost:'127.0.0.1'}).status,421);assert.equal(guardRequest(req(),{listenHost:'127.0.0.1'}).ok,true)});
test('mutating cross-origin request is rejected',()=>{const r=guardRequest(req({method:'POST',origin:'https://evil.example'}),{listenHost:'127.0.0.1'});assert.equal(r.status,403);assert.equal(guardRequest(req({method:'POST',origin:'http://127.0.0.1:8787'}),{listenHost:'127.0.0.1'}).ok,true)});
test('security headers lock down framing and microphone',()=>{assert.match(SECURITY_HEADERS['content-security-policy'],/frame-ancestors 'none'/);assert.equal(SECURITY_HEADERS['x-frame-options'],'DENY');assert.match(SECURITY_HEADERS['permissions-policy'],/microphone=\(self\)/)});

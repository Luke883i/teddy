import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionGuidance} from '../web/connection.js';

test('429 is not presented as generic connection failure',()=>{const g=connectionGuidance({error:'openai_rate_limited',kind:'rate_limit',retryAfterSeconds:7});assert.match(g.title,/sessioni Realtime/);assert.equal(g.action,'retry');assert.equal(g.retryAfter,7);assert.doesNotMatch(g.message,/microfono.*guasto/i)});
test('quota and auth lead to key/account remediation instead of retry storm',()=>{assert.equal(connectionGuidance({error:'openai_quota_exhausted',kind:'quota'}).action,'replace-key');assert.equal(connectionGuidance({error:'openai_auth_failed'}).action,'replace-key')});
test('WebRTC and media failures remain distinguishable',()=>{assert.match(connectionGuidance({error:'webrtc_connect_timeout'}).title,/WebRTC/);assert.match(connectionGuidance({error:'microphone_permission_denied'}).title,/microfono/i)});

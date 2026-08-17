import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {connectionGuidance} from '../web/connection.js';

test('local voice primes WebAudio before the first asynchronous conversation request',()=>{const source=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8'),prime=source.indexOf('await primeLocalOutput()'),network=source.indexOf('await ensureConversation()',prime);assert.ok(prime>=0);assert.ok(network>prime);assert.match(source,/ctx\.state!=='running'/)});
test('blocked and unavailable audio output are actionable voice failures',()=>{assert.equal(connectionGuidance({error:'audio_output_blocked'}).action,'retry');assert.equal(connectionGuidance({error:'audio_output_unavailable',kind:'audio'}).action,'diagnostics')});

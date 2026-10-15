import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {connectionGuidance} from '../web/connection.js';

test('Step 0 composer never initializes voice, microphone or WebAudio',()=>{
 const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 assert.match(app,/textChat=installTextChat/);
 for(const v of [/new AudioPresence/,/new TeddyRealtime/,/captureWav\(/,/primeLocalOutput\(/, /startCloud\(/,/startTalk\(/])assert.doesNotMatch(app,v);
 assert.doesNotMatch(html,/autoplay|talkBtn|remoteAudio|Parla con Teddy/i);
});
test('legacy audio diagnostics stay archived but are not a Step 0 affordance',()=>{
 assert.equal(connectionGuidance({error:'audio_output_blocked'}).action,'retry');
 const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/audio_output_blocked|microphone_unavailable/);
});

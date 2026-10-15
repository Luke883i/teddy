import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildLocalMessages,parseSseData} from '../server/lib/local-engines.mjs';
import {sanitizeSpokenText,safeStreamSnapshot} from '../server/lib/local-runtime.mjs';
import {readLocalContext} from '../server/lib/local-context.mjs';
import {frameRms,vadStep,capturePolicyStep} from '../web/local.js';
import {connectionGuidance} from '../web/connection.js';
import {recoveryDelay,recoveryCooldown,shouldAttemptRuntimeRecovery} from '../server/lib/runtime-recovery.mjs';

test('prompt context stays bounded under oversized history and memories',()=>{const messages=buildLocalMessages('domanda',{memories:Array.from({length:30},(_,i)=>({text:`memoria ${i} ${'x'.repeat(500)}`})),turns:Array.from({length:40},(_,i)=>({role:i%2?'assistant':'user',text:`turno ${i} ${'y'.repeat(900)}`}))});assert.ok(messages.filter(x=>x.role==='user'||x.role==='assistant').length<=9);assert.ok(messages.every(x=>x.content.length<=1400));assert.equal(messages.at(-1).content,'domanda')});

test('spoken sanitizer withholds hidden or incomplete reasoning',()=>{assert.equal(safeStreamSnapshot('<think>segreto'),null);assert.equal(safeStreamSnapshot('```codice'),null);const clean=sanitizeSpokenText('<think>segreto</think> **Ciao** ```codice```');assert.equal(clean,'Ciao');assert.doesNotMatch(clean,/think|```|\*\*/i)});

test('SSE parsing ignores malformed events and keeps valid deltas',()=>{const state={buffer:''};const a=parseSseData(state,'data: {bad}\ndata: {"choices":[{"delta":{"content":"Ci"}}]}\n');const b=parseSseData(state,'data: {"choices":[{"delta":{"content":"ao"}}]}\ndata: [DONE]\n');assert.equal([...a,...b].join(''),'Ciao')});

test('audio analysis sanitizes non finite frames and times out silence',()=>{assert.ok(Number.isFinite(frameRms([NaN,Infinity,.2])));const v=vadStep({noiseFloor:NaN,speechMs:NaN,silenceMs:Infinity},NaN,Infinity);assert.ok([v.noiseFloor,v.speechMs,v.silenceMs,v.threshold].every(Number.isFinite));assert.equal(capturePolicyStep({},0,20,6000,{noSpeechMs:5000}).action,'no_speech')});

test('silent microphone has actionable end user guidance',()=>{const g=connectionGuidance({error:'local_no_speech'});assert.equal(g.action,'retry');assert.match(g.title,/sentito/i);assert.match(g.message,/microfono/i)});

test('missing local database degrades to empty context',()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-missing-context-'));try{assert.deepEqual(readLocalContext(home),{turns:[],memories:[]})}finally{fs.rmSync(home,{recursive:true,force:true})}});

test('runtime recovery remains bounded and local-only',()=>{assert.ok(recoveryDelay(999)<=4000);assert.ok(recoveryCooldown(999)<=30000);assert.equal(shouldAttemptRuntimeRecovery({provider:'openai',wasReady:true,ready:false}),false);assert.equal(shouldAttemptRuntimeRecovery({provider:'local',wasReady:false,ready:false}),false);assert.equal(shouldAttemptRuntimeRecovery({provider:'local',wasReady:true,ready:false,now:10,nextAt:9}),true)});

test('legacy speech event cannot auto-enter the Step 0 chat shell',()=>{const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/teddy:local-event|streamLocalTurn|captureWav|AudioPresence/)});

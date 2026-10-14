import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {availabilityCopy} from '../web/availability.js';
import {QWEN_SHA256,QWEN_XET_HASH} from '../server/lib/runtime-manager.mjs';

const sha='7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d';
const xet='f2d64232ac541e4a2af362e99dcfff05e3a1fb31d1ef09827fcdaa443c3ee273';
test('source of truth is content SHA256, never Xet content ID',()=>{
  assert.equal(QWEN_SHA256,sha);assert.equal(QWEN_XET_HASH,xet);
  assert.notEqual(QWEN_SHA256,QWEN_XET_HASH);
  const source=fs.readFileSync(new URL('../server/lib/runtime-manager.mjs',import.meta.url),'utf8');
  assert.match(source,/QWEN_REVISION='[0-9a-f]{40}'/);
  assert.doesNotMatch(source,/cleanDigest\(r\.headers\.get\('x-linked-etag'\)/);
  assert.match(source,/got\.toLowerCase\(\)!==a\.sha256\.toLowerCase\(\)/);
  assert.match(source,/if\(a\.totalBytes&&bytes!==a\.totalBytes\)/);
});
test('text-only has truthful copy for every installation and integrity state',()=>{
  const base={mode:'text',textReady:false,engines:{llm:{healthy:false},asr:{healthy:false},tts:{healthy:false}}};
  assert.match(availabilityCopy({...base,availability:'installazione',installPhase:'verifying'}).body,/integrità/i);
  const failure=availabilityCopy({...base,availability:'non_disponibile',lastProblem:{error:'artifact_digest_mismatch'}});
  assert.match(failure.title,/modello/i);assert.match(failure.body,/SHA-256/);
  assert.doesNotMatch(JSON.stringify(failure),/voce|ASR|TTS/i);
  assert.match(availabilityCopy({...base,availability:'ready',textReady:true}).title,/pronta/i);
  assert.match(availabilityCopy({...base,availability:'non_disponibile',lastProblem:{error:'artifact_size_mismatch'}}).body,/dimensione/i);
});
test('install information is collapsible and chat presence reflects real readiness',()=>{
 const ui=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 assert.match(ui,/<details id="artifactDetails">/);
 assert.match(ui,/<summary>Dettagli installazione<\/summary>/);
 assert.match(ui,/availability\?\.textReady===true/);
 assert.match(ui,/server online/);
});

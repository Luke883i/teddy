import test from 'node:test';
import assert from 'node:assert/strict';
import {runVoiceRuntimeSaturation,VOICE_RUNTIME_CLASSES} from '../tools/saturate-voice-runtime-v10.mjs';

test('voice runtime state space converges without unsafe ready states or M+100 novelty',()=>{
  const report=runVoiceRuntimeSaturation({noveltyWindow:100});
  assert.ok(report.scenarios>=100000);
  assert.equal(report.axes,12);
  assert.equal(report.unsafe,0);
  assert.equal(report.noNovelty,true);
  assert.equal(report.noveltyAfterM,0);
  assert.deepEqual(report.classes,[...VOICE_RUNTIME_CLASSES].sort());
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {motionIntentsFromText,motionIntentsFromTelemetry} from '../web/teddy/motion-contract.js';

test('assistant/user language maps to a small physical vocabulary with negation and false-positive guards',()=>{
  assert.deepEqual(motionIntentsFromText('Va bene: alzo il braccio destro e poi salto.').map(x=>x.name),['raiseRightArm','jump']);
  assert.deepEqual(motionIntentsFromText('Non salto, ma alzo il braccio destro.').map(x=>x.name),['raiseRightArm']);
  assert.deepEqual(motionIntentsFromText('Non voglio saltare.'),[]);assert.deepEqual(motionIntentsFromText('Passo il tempo qui.'),[]);
  assert.equal(motionIntentsFromText('Faccio un passo avanti.')[0]?.name,'walkForward');
});

test('explicit model telemetry is sanitized and unknown motion metadata is ignored',()=>{
  assert.deepEqual(motionIntentsFromTelemetry({metadata:{motion:['jump',{name:'waveLeft',intensity:9}]}}).map(x=>x.name),['jump','waveLeft']);
  assert.equal(motionIntentsFromTelemetry({response:{metadata:{motion:{name:'waveLeft',intensity:9}}}})[0]?.intensity,1);
  assert.deepEqual(motionIntentsFromTelemetry({metadata:{motion:'teleport'}}),[]);
});

test('local and realtime event seams feed one provider-neutral motion-intent channel exactly once',()=>{
  const bridge=fs.readFileSync(new URL('../web/teddy/motion-wire-v8.js',import.meta.url),'utf8');
  const local=fs.readFileSync(new URL('../web/local.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  assert.match(bridge,/response\.audio_transcript\.done/);assert.match(bridge,/conversation\.item\.input_audio_transcription\.completed/);assert.match(bridge,/motionIntentsFromTelemetry/);assert.match(bridge,/teddy:motion-intent/);
  const localEventMentions=(local.match(/teddy:local-event/g)||[]).length+(app.match(/teddy:local-event/g)||[]).length;
  assert.equal(localEventMentions,0,'Step 0 browser must never dispatch the legacy voice event');
  const boot=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  assert.match(html,/src="\/teddy\/init-v13\.js"/);assert.match(boot,/installMotionTelemetryBridge/);
});

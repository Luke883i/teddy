import test from 'node:test';import assert from 'node:assert/strict';import {mergeConfig,buildInstructions} from '../server/lib/config.mjs';
const base={model:'x',language:'it-IT',voice:'marin',persona:{irritability:.5,warmth:.5,wit:.5,verbosity:.2},appearance:{fur:'#000',muzzle:'#111',eyes:'#222',background:'#333',exposure:1},audio:{inputGain:1,outputGain:1},render:{maxPixelRatio:1.75,targetFps:60}};
test('config clamps unsafe numeric ranges',()=>{const c=mergeConfig(base,{persona:{irritability:99},audio:{outputGain:-4},render:{targetFps:999}});assert.equal(c.persona.irritability,1);assert.equal(c.audio.outputGain,0);assert.equal(c.render.targetFps,144)});
test('instructions preserve Teddy identity',()=>{assert.match(buildInstructions(base),/Teddy/);assert.match(buildInstructions(base),/italiano naturale/)});

test('config rejects invalid voice and normalizes realtime controls', () => {
  const c=mergeConfig(base,{voice:'made-up',audio:{outputSpeed:99,vadEagerness:'instant',noiseReduction:'magic'},appearance:{fur:'javascript:bad'}});
  assert.equal(c.voice,base.voice);
  assert.equal(c.audio.outputSpeed,1.5);
  assert.equal(c.audio.vadEagerness,base.audio.vadEagerness);
  assert.equal(c.audio.noiseReduction,base.audio.noiseReduction);
  assert.equal(c.appearance.fur,base.appearance.fur);
});

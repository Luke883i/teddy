import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
test('fur texture is stable in local coordinates and camera is explicit',()=>{assert.match(src,/vLocal/);assert.match(src,/noise3\(vLocal/);assert.match(src,/uniform vec3 uCamera/);assert.doesNotMatch(src,/noise3\(vP/);});
test('renderer consumes rich voice pose and shared rig for WebGL and Canvas2D',()=>{assert.match(src,/ExpressionRig/);assert.match(src,/setVoice\(/);assert.match(src,/this\.pose=this\.rig\.step/);assert.match(src,/frame2d/);assert.match(src,/pose\.jaw|p\.jaw/);});

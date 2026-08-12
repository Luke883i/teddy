import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=['web/teddy/render.js','web/teddy/render-v5/renderer.js','web/teddy/render-v5/tuning.js','web/teddy/render-v5/geometry.js','web/teddy/render-v5/shaders.js','web/teddy/render-v5/canvas.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
test('fur texture is stable in local coordinates and camera is explicit',()=>{assert.match(src,/vLocal/);assert.match(src,/noise3\(vLocal/);assert.match(src,/uniform vec3 uCamera/);assert.doesNotMatch(src,/noise3\(vP/)});
test('renderer consumes rich voice pose and shared rig for WebGL and Canvas2D',()=>{assert.match(src,/ExpressionRig/);assert.match(src,/setVoice\(/);assert.match(src,/this\.pose=this\.rig\.step/);assert.match(src,/drawTeddy2D/);assert.match(src,/pose\.jaw|p\.jaw/)});

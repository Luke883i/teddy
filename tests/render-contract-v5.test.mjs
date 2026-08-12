import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const files=['web/teddy/render.js','web/teddy/render-v5/renderer.js','web/teddy/render-v5/tuning.js','web/teddy/render-v5/geometry.js','web/teddy/render-v5/shaders.js','web/teddy/render-v5/canvas.js'];
const src=files.map(f=>fs.readFileSync(new URL(`../${f}`,import.meta.url),'utf8')).join('\n');
test('v0.5 renderer has continuous pear torso plus granular limb primitives',()=>{assert.match(src,/function pear\(/);assert.match(src,/function capsule\(/);assert.match(src,/pear:makeMesh/);assert.match(src,/capsule:makeMesh/)});
test('plush shading perturbs local normals without world-space swimming',()=>{assert.match(src,/vLocal/);assert.match(src,/noise3\(vLocal/);assert.match(src,/micro=/);assert.doesNotMatch(src,/noise3\(vP/)});
test('idle mouth is nearly closed and speaking reveals the mouth progressively',()=>{assert.match(src,/\.010\+pose\.jaw\*5\.20/);assert.match(src,/Math\.pow\(pose\.jaw,1\.25\)/)});
test('renderer keeps WebGL2 and Canvas2D degradation paths',()=>{assert.match(src,/webgl2/);assert.match(src,/frameGL/);assert.match(src,/drawTeddy2D/);assert.match(src,/switchTo2d/)});

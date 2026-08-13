import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('runtime movement adapter grounds refined support feet and drives inherited articulated locomotion',()=>{
  const movement=fs.readFileSync(new URL('../web/teddy/movement-v8.js',import.meta.url),'utf8');
  const renderer=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  assert.match(movement,/groundGroups/);assert.match(movement,/FLOOR_Y-support/);assert.match(movement,/this\.locomotion=/);assert.match(movement,/liftLeftLeg/);assert.match(movement,/waveRight/);
  assert.match(renderer,/M4\.translate\(0,FLOOR_Y/);assert.match(renderer,/function plane/);
});

test('world scenario sits behind the canvas and receives bounded motion parallax',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const world=fs.readFileSync(new URL('../web/world-v8.css',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../web/teddy/world-v8.js',import.meta.url),'utf8');
  assert.match(html,/world-v8\.css/);assert.match(html,/installMovementEngine/);assert.match(html,/installWorldScene/);assert.ok(html.indexOf('installTeddyRefinement')<html.indexOf('src="\/app.js"'));
  assert.match(world,/world-horizon/);assert.match(world,/perspective\(/);assert.match(world,/#scene\{z-index:1\}/);assert.match(runtime,/teddy:motion-frame/);assert.match(runtime,/--world-x/);
});

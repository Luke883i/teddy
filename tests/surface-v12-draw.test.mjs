import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {resolvePartV12} from '../web/teddy/surface-v12.js';

test('v12 resolved geometry reaches the WebGL draw pass',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/surface-v12.js',import.meta.url),'utf8');
  assert.match(src,/const originalDraw=TeddyRenderer\.prototype\.draw/);
  assert.match(src,/prototype\.draw=function\(model,mvp,part,camera,alpha=1\).*resolvePartV12\(part\)/s);
  const model=buildTeddyArchetype();
  assert.equal(resolvePartV12(model.parts.find(p=>p.id==='belly')).geometry,'hiddenV12');
  assert.equal(resolvePartV12(model.parts.find(p=>p.id==='muzzlePad')).geometry,'muzzleV12');
  assert.equal(resolvePartV12(model.parts.find(p=>p.id==='headShell')).geometry,'skullV12');
});

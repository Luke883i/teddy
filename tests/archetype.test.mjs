import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan,TEDDY_BOUNDS} from '../web/teddy/model.js';

test('Teddy grammar contains archetypal bear landmarks and multiple primitives',()=>{
  const m=archetypeMetrics(buildTeddyArchetype());
  assert.ok(m.partCount>=28);assert.ok(m.geometryKinds>=3);assert.equal(m.bilateralPairs,6);assert.equal(m.faceProjectsForward,true);assert.equal(m.hasCatchlights,true);assert.equal(m.hasPawPads,true);assert.equal(m.hasInnerEars,true);assert.ok(m.headToTorsoRatio>.9&&m.headToTorsoRatio<1.1);
});

test('camera plan keeps Teddy fully framed on screenshot-like and portrait viewports',()=>{
  for(const [w,h] of [[1790,864],[1440,900],[390,844],[2560,1080]]){
    const p=cameraPlan(w,h),span=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],visible=2*p.distance*Math.tan(p.fov/2),fraction=span/visible;
    assert.ok(p.distance>5.5);assert.ok(fraction<=.621&&fraction>=.519);assert.ok(p.fill<.7);
  }
});

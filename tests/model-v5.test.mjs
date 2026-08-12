import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan} from '../web/teddy/model.js';

test('v0.5 granular anatomy has an unmistakable teddy-bear grammar',()=>{
  const m=archetypeMetrics(buildTeddyArchetype());
  assert.ok(m.partCount>=65,m.partCount);assert.ok(m.groupCount>=11,m.groupCount);assert.ok(m.geometryKinds>=3,m.geometryKinds);
  assert.equal(m.bilateralPairs,6);assert.ok(m.extendedPairs>=9,m.extendedPairs);assert.equal(m.faceProjectsForward,true);assert.equal(m.earEmergence,true);assert.equal(m.eyeNoseTriangle,true);
  assert.equal(m.hasCatchlights,true);assert.equal(m.hasPawPads,true);assert.equal(m.hasInnerEars,true);assert.equal(m.pawDetail,true);assert.equal(m.mouthLayers,5);
  assert.ok(m.headToTorsoWidth>=.95&&m.headToTorsoWidth<=1.08,m.headToTorsoWidth);assert.ok(m.headToTorsoRatio>1&&m.headToTorsoRatio<1.12,m.headToTorsoRatio);
});

test('camera contains Teddy across screenshot, mobile and adversarial viewports',()=>{
  for(const [w,h] of [[1195,864],[390,844],[320,1024],[2560,720],[844,390],[240,1080],[3440,500]]){const p=cameraPlan(w,h);assert.ok(p.occupancyX<=.801,p.occupancyX);assert.ok(p.occupancyY<=.756,p.occupancyY);assert.ok(p.distance>0&&Number.isFinite(p.distance));}
});

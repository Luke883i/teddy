import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan,TEDDY_BOUNDS,MORPHOLOGY_V5} from '../web/teddy/model.js';
const model=buildTeddyArchetype(),byId=new Map(model.parts.map(p=>[p.id,p])),g=model.groups;
test('one million morphology identities converge into bear landmarks',()=>{
 const m=archetypeMetrics(model);assert.equal(MORPHOLOGY_V5.searchIterations,1_000_000);assert.ok(m.partCount>=45);assert.equal(m.geometryKinds,3);assert.ok(m.groupCount>=13);assert.equal(m.bilateralPairs,6);assert.ok(m.extendedPairs>=6);assert.equal(m.hasBearTriangle,true);assert.equal(m.hasInnerEars,true);assert.equal(m.hasCatchlights,true);assert.ok(m.mouthLayers>=5);assert.ok(m.headToTorsoRatio>1.04&&m.headToTorsoRatio<1.14);
});
test('rest silhouette is connected and archetypal instead of detached primitives',()=>{
 const head=byId.get('headShell'),torso=byId.get('torso'),ear=byId.get('earR'),arm=byId.get('upperArmR'),thigh=byId.get('thighR'),foot=byId.get('footR');
 const headBottom=g.head.pos[1]+head.pos[1]-head.scale[1],torsoTop=torso.pos[1]+torso.scale[1];assert.ok(headBottom<torsoTop-.2);
 const earInner=g.earR.pos[0]-ear.scale[0],earOuter=g.earR.pos[0]+ear.scale[0];assert.ok(earInner<head.scale[0]&&earOuter>head.scale[0]);
 const armInner=g.shoulderR.pos[0]-arm.scale[0];assert.ok(armInner<torso.scale[0]);
 const thighBottom=g.hipR.pos[1]+thigh.pos[1]-thigh.scale[1],footTop=g.hipR.pos[1]+foot.pos[1]+foot.scale[1];assert.ok(footTop>thighBottom+.15);
});
test('mouth geometry projects in front of muzzle and can articulate visibly',()=>{
 const muzzle=byId.get('muzzlePad'),cavity=byId.get('mouthCavity');const mouthZ=g.head.pos[2]+g.jaw.pos[2]+cavity.pos[2],muzzleFront=g.head.pos[2]+muzzle.pos[2]+muzzle.scale[2];assert.ok(mouthZ>muzzleFront-.01,`${mouthZ} <= ${muzzleFront}`);assert.ok(byId.has('noseStem'));
});
test('camera reserves desktop UI safe area and contains adversarial axes',()=>{
 for(const [w,h] of [[1195,865],[1790,864],[390,844],[2560,1080],[240,1080],[3440,500],[1,1]]){const p=cameraPlan(w,h);assert.ok(Number.isFinite(p.distance)&&p.distance>0);assert.ok(p.occupancyX<=.861001);assert.ok(p.occupancyY<=.741001||p.limiter==='horizontal');}
 const desk=cameraPlan(1195,865);assert.ok(desk.occupancyY>=.61&&desk.occupancyY<=.67);const geometricCenter=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2;assert.ok(desk.centerY<geometricCenter);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan,TEDDY_BOUNDS} from '../web/teddy/model.js';

test('v0.4 archetype has plush anatomy, articulated groups and layered mouth',()=>{const m=archetypeMetrics(buildTeddyArchetype());assert.ok(m.partCount>=45,m.partCount);assert.ok(m.groupCount>=9,m.groupCount);assert.ok(m.geometryKinds>=3);assert.equal(m.bilateralPairs,6);assert.ok(m.extendedPairs>=6);assert.equal(m.faceProjectsForward,true);assert.equal(m.hasCatchlights,true);assert.equal(m.hasPawPads,true);assert.equal(m.hasInnerEars,true);assert.ok(m.mouthLayers>=5);assert.ok(m.headToTorsoRatio>1&&m.headToTorsoRatio<1.12);});

test('camera plan contains both axes across ordinary and adversarial viewports',()=>{for(const [w,h] of [[1790,864],[1440,900],[390,844],[2560,1080],[240,1080],[3440,500],[1,1]]){const p=cameraPlan(w,h);assert.ok(p.distance>0&&Number.isFinite(p.distance));assert.ok(p.occupancyY<=.761,p.occupancyY);assert.ok(p.occupancyX<=.861,p.occupancyX);assert.ok(p.occupancyY>0&&p.occupancyX>0);const spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],visibleY=2*p.distance*Math.tan(p.fov/2);assert.ok(spanY<=visibleY*.761+1e-6);}});

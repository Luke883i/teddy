import test from 'node:test';import assert from 'node:assert/strict';
import {buildTeddyArchetype,archetypeMetrics} from '../web/teddy/model.js';
import {tuneTeddyModel} from '../web/teddy/render-v5/tuning.js';
test('reality tuning opens seated stance and hides rear tail',()=>{const m=tuneTeddyModel(buildTeddyArchetype()),by=new Map(m.parts.map(p=>[p.id,p]));assert.ok(Math.abs(m.groups.hipL.pos[0])>=.45);assert.ok(by.get('tail').pos[2]<-.8);assert.equal(by.get('shinL').geometry,'sphere');assert.ok(by.get('browL').alpha<.3)});
test('tuned model preserves v0.5 morphology contract',()=>{const m=archetypeMetrics(tuneTeddyModel(buildTeddyArchetype()));assert.ok(m.partCount>=65);assert.equal(m.bilateralPairs,6);assert.ok(m.extendedPairs>=9);assert.ok(m.headToTorsoWidth>=.94&&m.headToTorsoWidth<=1)});

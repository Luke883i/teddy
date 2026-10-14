import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan,FLOOR_Y,ANATOMY_V6} from '../web/teddy/model.js';
import {kinematicTargets,kinematicPoseIsSafe,footPlantError} from '../web/teddy/kinematics.js';
import {M4,transformPoint} from '../web/teddy/math.js';

const model=buildTeddyArchetype(),metrics=archetypeMetrics(model),byId=new Map(model.parts.map(p=>[p.id,p]));

test('v6 anatomy is a continuous articulated teddy rather than a seated primitive stack',()=>{
  assert.equal(ANATOMY_V6.searchIterations,10_000_000);assert.ok(metrics.partCount>=60);assert.ok(metrics.groupCount>=21);assert.equal(metrics.fullArmChain,true);assert.equal(metrics.fullLegChain,true);assert.equal(metrics.hasNeck,true);assert.ok(metrics.jointCount>=15);assert.ok(metrics.headToTorsoRatio>1.04&&metrics.headToTorsoRatio<1.13);assert.ok(metrics.earSkullOverlap>.30&&metrics.earSkullOverlap<.55);
  for(const id of ['neckRoll','shoulderSocketL','elbowPadL','wristPadL','hipSocketL','kneePadL','anklePadL','forearmL','shinL'])assert.ok(byId.has(id),id);
});

test('feet are grounded on an explicit floor and no longer dominate the body',()=>{
  assert.equal(model.floorY,FLOOR_Y);const foot=byId.get('footL'),torso=byId.get('torso');assert.ok(foot.scale[0]<torso.scale[0]*.48);assert.ok(foot.scale[2]<torso.scale[1]*.52);assert.ok(FLOOR_Y<=model.bounds.min[1]+.03);
});

test('camera has real perspective, elevated eye and lower framing center for UI clearance',()=>{
  const p=cameraPlan(1428,915);assert.ok(p.fov<.56&&p.fov>.42);assert.ok(p.eye[1]>p.target[1]);assert.ok(p.centerY<.08);assert.ok(p.occupancyY>=.61&&p.occupancyY<=.66);
  const view=M4.lookAt(p.eye,p.target),a=transformPoint(view,[0,0,0,1]),b=transformPoint(view,[0,0,.8,1]);assert.notEqual(a[2],b[2]);
});

test('voice and locomotion remain bounded through adversarial articulated motion',()=>{
  for(let i=0;i<20000;i++){const t=i*.019,s=(i%101)/100,g=((i*31)%101)/100,k=kinematicTargets({time:t,pose:{gesture:g,shoulder:g,headYaw:Math.sin(t),headPitch:Math.cos(t),headRoll:Math.sin(t*.3),jaw:g,earLift:g},locomotion:{speed:s,direction:i&1?1:-1}});assert.equal(kinematicPoseIsSafe(k),true);assert.equal(footPlantError(k),0)}
});

test('opaque body pass is separated from transparent floor contact shadow',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');assert.match(src,/gl\.disable\(gl\.BLEND\)/);assert.match(src,/gl\.depthMask\(false\)/);assert.match(src,/shadowPose/);assert.match(src,/motionStatus/);assert.match(src,/setLocomotion/);assert.match(src,/M4\.lookAt/);assert.match(src,/function plane/);
});

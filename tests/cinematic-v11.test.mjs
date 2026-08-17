import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {refinePartV71} from '../web/teddy/refinement-v7.js';
import {CINEMATIC_V11,cinematicPart,cinematicStageMatrices} from '../web/teddy/cinematic-v11.js';
import {M4} from '../web/teddy/math.js';

const base=buildTeddyArchetype();
const by=new Map(base.parts.map(p=>[p.id,cinematicPart(refinePartV71(p))]));

test('v11 is installed before refinement and motion so absolute visual targets own the runtime',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const c=html.indexOf('installCinematicV11()'),r=html.indexOf('installTeddyRefinement()'),m=html.indexOf('installMovementEngine()');
  assert.ok(c>=0&&r>c&&m>r,{c,r,m});
  assert.match(html,/cinematic-v11\.js/);
});

test('face layers have explicit forward depth instead of coplanar decals',()=>{
  const head=by.get('headShell'),muzzle=by.get('muzzlePad'),nose=by.get('nose'),eye=by.get('eyeL'),ear=by.get('earL'),inner=by.get('innerEarL'),brow=by.get('browL');
  assert.equal(nose.geometry,'sphere');
  assert.ok(muzzle.pos[2]-head.pos[2]>.55);
  assert.ok(nose.pos[2]-muzzle.pos[2]>.24);
  assert.ok(eye.pos[2]-head.pos[2]>.60);
  const innerFront=inner.pos[2]+inner.scale[2],earFront=ear.pos[2]+ear.scale[2];
  assert.ok(Math.abs(innerFront-earFront)<.015,{innerFront,earFront});
  assert.ok(brow.pos[2]>eye.pos[2],{brow:brow.pos[2],eye:eye.pos[2]});
});

test('torso and distal limbs are volumetric while connector joints remain buried',()=>{
  const torso=by.get('torso'),belly=by.get('belly'),upper=by.get('upperArmL'),elbow=by.get('elbowPadL'),fore=by.get('forearmL'),wrist=by.get('wristPadL'),thigh=by.get('thighL'),knee=by.get('kneePadL'),shin=by.get('shinL'),ankle=by.get('anklePadL'),foot=by.get('footL'),pad=by.get('footPadL');
  assert.ok(torso.scale[1]>.9&&torso.scale[2]>=.60);
  assert.ok(belly.scale[2]>=.12&&belly.scale[2]/torso.scale[2]>.19);
  assert.ok(elbow.scale[0]/upper.scale[0]<.55);
  assert.ok(wrist.scale[0]/fore.scale[0]<.55);
  assert.ok(knee.scale[0]/thigh.scale[0]<.50);
  assert.ok(ankle.scale[0]/shin.scale[0]<.60);
  assert.ok(foot.scale[2]>.30&&pad.pos[2]>foot.pos[2]+.28);
});

test('rest staging introduces only a subtle three-quarter yaw and keeps all chain matrices finite',()=>{
  assert.ok(Math.abs(CINEMATIC_V11.restYaw)>.05&&Math.abs(CINEMATIC_V11.restYaw)<.10);
  const names=['shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','hipL','hipR','kneeL','kneeR','ankleL','ankleR'];
  const seed=Object.fromEntries(names.map((n,i)=>[n,M4.translate((i%2?1:-1)*.3,1-i*.08,(i%3)*.02)]));
  const staged=cinematicStageMatrices(seed);
  for(const name of names){assert.equal(staged[name].length,16,name);for(const v of staged[name])assert.ok(Number.isFinite(v),name);}
  assert.notEqual(staged.shoulderL[14],seed.shoulderL[14]);
  assert.notEqual(staged.shoulderR[14],seed.shoulderR[14]);
});

test('renderer uses smooth plush limb profile and separated cinematic lights',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  assert.match(src,/function capsule\(radial=40,rings=28\)/);
  assert.match(src,/power=6/);
  assert.match(src,/fill=normalize/);
  assert.match(src,/rim=normalize/);
  assert.match(src,/cavity=/);
});

test('movement grounding consumes the same cinematic feet that are rendered',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/movement-v8.js',import.meta.url),'utf8');
  assert.match(src,/cinematicPart\(refinePartV71\(p\)\)/);
  assert.match(src,/contactY\(groups,id\)/);
});

test('canvas fallback is deliberately replaced by the cinematic hierarchy',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/cinematic-v11.js',import.meta.url),'utf8');
  assert.match(src,/createRadialGradient/);
  assert.match(src,/prototype\.frame2d/);
  assert.match(src,/Far-side chains first/);
});

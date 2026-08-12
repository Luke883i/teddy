import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {REALISM_V71,refinePartV71,realismMetrics,actionPose,applyActionMatrices} from '../web/teddy/refinement-v7.js';
import {M4} from '../web/teddy/math.js';

const model=buildTeddyArchetype(),parts=model.parts.map(refinePartV71),metrics=realismMetrics(parts),by=new Map(parts.map(p=>[p.id,p]));

test('v7.1 refinement reduces frontal robotic segmentation without deleting semantic anatomy',()=>{
  assert.equal(REALISM_V71.searchIterations,10_000_000);
  assert.equal(parts.length,model.parts.length);
  assert.ok(metrics.bellyToTorsoWidth<.47);
  assert.ok(metrics.armToTorsoWidth<.29);
  assert.ok(metrics.elbowToArmWidth<.90);
  assert.ok(metrics.footAspect<.80);
  assert.ok(metrics.muzzleAspect>1.45);
  assert.ok(by.get('shoulderSocketL').scale[0]<model.parts.find(p=>p.id==='shoulderSocketL').scale[0]);
  assert.ok(by.get('kneePadL').scale[0]<model.parts.find(p=>p.id==='kneePadL').scale[0]);
});

test('refinement remains bilateral and keeps facial depth hierarchy intact',()=>{
  for(const [a,b] of [['upperArmL','upperArmR'],['forearmL','forearmR'],['thighL','thighR'],['shinL','shinR'],['footL','footR']]){
    assert.deepEqual(by.get(a).scale,by.get(b).scale);assert.ok(Math.abs(by.get(a).pos[0]+by.get(b).pos[0])<1e-9);
  }
  assert.ok(by.get('nose').pos[2]>by.get('muzzlePad').pos[2]);
});

test('basic action vocabulary is bounded and chain transforms remain finite',()=>{
  const base={shoulderL:M4.translate(-.5,.5,0),elbowL:M4.translate(-.5,0,0),wristL:M4.translate(-.5,-.4,0),hipL:M4.translate(-.3,-.3,0),kneeL:M4.translate(-.3,-.7,0),ankleL:M4.translate(-.3,-1.0,0),root:M4.identity()};
  for(const name of REALISM_V71.actions){
    const p=actionPose(name,1);assert.ok(Number.isFinite(p.angle)&&Number.isFinite(p.lift));
    const out=applyActionMatrices(base,name,1);for(const m of Object.values(out))for(const v of m)assert.ok(Number.isFinite(v));
  }
  assert.ok(Math.abs(actionPose('raiseLeftArm',1).angle)<=1.28);
  assert.ok(Math.abs(actionPose('liftLeftLeg',1).angle)<=.88);
  assert.ok(actionPose('jump',1).lift<=.42);
});

test('runtime page installs the refinement before app construction',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const refine=html.indexOf('installTeddyRefinement'),app=html.indexOf('src="/app.js"');
  assert.ok(refine>=0&&app>refine);
});

test('v7.1 realism saturation executes 10M numerical identities plus M+100 compound falsification',()=>{
  const run=spawnSync(process.execPath,['tools/refine-realism-v7.mjs','--full'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:120000});
  assert.equal(run.status,0,run.stderr||run.stdout.slice(-3000));
  const report=JSON.parse(fs.readFileSync(new URL('../docs/realism-v71-report.json',import.meta.url),'utf8'));
  assert.equal(report.identity.searchIterations,10_000_000);
  assert.equal(report.identity.falsificationIterations,100);
  assert.equal(report.identity.total,10_000_100);
  assert.ok(report.accepted>100_000);
  assert.deepEqual(report.runtimeViolations,[]);
  assert.deepEqual(report.noveltyAfterM,[]);
  assert.equal(report.epistemicSlices.length,5);
  assert.ok(Object.values(report.actionLimits).every(Boolean));
});

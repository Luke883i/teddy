import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {M4} from '../web/teddy/math.js';
import {SURFACE_V12,resolvePartV12,surfaceStageMatricesV12} from '../web/teddy/surface-v12.js';
import {buildSurfaceMeshesV12,surfaceMeshMetricsV12,LIMB_PROFILE_V12} from '../web/teddy/surface-geometry-v12.js';

const model=buildTeddyArchetype();
const parts=model.parts.map(resolvePartV12),by=new Map(parts.map(p=>[p.id,p]));
const meshes=buildSurfaceMeshesV12(),metrics=surfaceMeshMetricsV12(meshes);

test('v12 is the single visual owner before motion and app construction',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const surface=html.indexOf('installSurfaceV12()'),motion=html.indexOf('installMovementEngine()'),app=html.indexOf('src="/app.js"');
  assert.equal(SURFACE_V12.version,12);assert.ok(surface>=0&&motion>surface&&app>motion,{surface,motion,app});
  assert.doesNotMatch(html,/installCinematicV11\(\)/);assert.doesNotMatch(html,/installTeddyRefinement\(\)/);
});

test('surface meshes are finite, indexed and sized for the existing WebGL2 draw path',()=>{
  for(const [name,m] of Object.entries(meshes)){
    assert.ok(m.p.length>300&&m.n.length===m.p.length,name);assert.ok(m.i.length>300,name);assert.ok(m.i instanceof Uint16Array,name);
    assert.ok([...m.p].every(Number.isFinite),name);assert.ok([...m.n].every(Number.isFinite),name);
  }
  assert.ok(metrics.bodyV12.vertices>1800);assert.ok(metrics.skullV12.vertices>2200);assert.ok(metrics.muzzleV12.vertices>1700);
  assert.ok(metrics.footV12.bounds.min[1]<=-0.9999);
});

test('body reads as one core skin instead of stacked chest pelvis and belly shield',()=>{
  assert.equal(by.get('torso').geometry,'bodyV12');
  for(const id of ['pelvisMass','chest','belly','neckRoll'])assert.equal(by.get(id).geometry,'hiddenV12',id);
  const torso=by.get('torso');assert.ok(torso.scale[0]/torso.scale[1]>.75&&torso.scale[0]/torso.scale[1]<.80);assert.ok(torso.scale[2]>.60);
});

test('face uses one sculpted muzzle with embedded eyes instead of stacked mask primitives',()=>{
  const head=by.get('headShell'),muzzle=by.get('muzzlePad'),nose=by.get('nose'),eye=by.get('eyeL');
  assert.equal(head.geometry,'skullV12');assert.equal(muzzle.geometry,'muzzleV12');
  for(const id of ['browPadL','browPadR','cheekL','cheekR','muzzleL','muzzleR','noseBridge'])assert.equal(by.get(id).geometry,'hiddenV12',id);
  const headFront=head.pos[2]+head.scale[2]*metrics.skullV12.bounds.max[2],muzzleFront=muzzle.pos[2]+muzzle.scale[2]*metrics.muzzleV12.bounds.max[2],eyeFront=eye.pos[2]+eye.scale[2],noseFront=nose.pos[2]+nose.scale[2];
  assert.ok(muzzleFront-headFront>.13,{headFront,muzzleFront});assert.ok(eyeFront-headFront>.005&&eyeFront-headFront<.035,{headFront,eyeFront});assert.ok(noseFront-muzzleFront>.06,{noseFront,muzzleFront});
});

test('inner ears are recessed dishes surface-fitted to angled outer ears',()=>{
  const ear=by.get('earL'),inner=by.get('innerEarL'),dish=metrics.earDishV12.bounds,outer=metrics.earV12.bounds;
  assert.equal(ear.geometry,'earV12');assert.equal(inner.geometry,'earDishV12');assert.ok(dish.min[2]<-.19&&dish.max[2]<.02);
  const outerFront=ear.pos[2]+ear.scale[2]*outer.max[2],rimFront=inner.pos[2]+inner.scale[2]*dish.max[2],dishCenter=inner.pos[2]+inner.scale[2]*dish.min[2];
  assert.ok(Math.abs(outerFront-rimFront)<.004,{outerFront,rimFront});assert.ok(rimFront-dishCenter>.006,{rimFront,dishCenter});
});

test('visible limb skin tapers while connector balls and frontal sole decals leave the pass',()=>{
  assert.ok(LIMB_PROFILE_V12[0][1]<LIMB_PROFILE_V12[3][1]&&LIMB_PROFILE_V12.at(-1)[1]<LIMB_PROFILE_V12[3][1]);
  for(const id of ['upperArmL','forearmL','thighL','shinL'])assert.equal(by.get(id).geometry,'limbV12',id);
  for(const id of ['shoulderSocketL','elbowPadL','wristPadL','hipSocketL','kneePadL','anklePadL','footPadL','toeL1','toeL2','toeL3'])assert.equal(by.get(id).geometry,'hiddenV12',id);
  assert.equal(by.get('pawL').geometry,'footV12');assert.equal(by.get('footL').geometry,'footV12');
});

test('v12 stage keeps all articulated matrices finite and adds depth to ears and near-front perspective',()=>{
  const names=['head','jaw','earL','earR','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','hipL','hipR','kneeL','kneeR','ankleL','ankleR'];
  const seed=Object.fromEntries(names.map((n,i)=>[n,M4.translate((i%2?1:-1)*.25,.8-i*.07,(i%3)*.03)]));
  const out=surfaceStageMatricesV12(seed);for(const name of names){assert.equal(out[name].length,16,name);for(const v of out[name])assert.ok(Number.isFinite(v),name);}
  assert.notEqual(out.earL[14],seed.earL[14]);assert.notEqual(out.earR[14],seed.earR[14]);assert.notEqual(out.head[8],seed.head[8]);
});

test('canvas fallback follows v12 body and no longer reintroduces the belly shield',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/surface-v12.js',import.meta.url),'utf8');
  assert.match(src,/prototype\.frame2d/);assert.match(src,/ell\(0,\.10,\.72,\.93,fur/);assert.doesNotMatch(src,/ell\(0,\.08,\.36,\.48/);
});

test('visual convergence report records rejected candidates instead of treating proxy review as physical WebGL',()=>{
  const report=JSON.parse(fs.readFileSync(new URL('../docs/surface-v12-report.json',import.meta.url),'utf8'));
  assert.equal(report.version,12);assert.equal(report.visualIterations.filter(x=>x.result==='rejected').length,2);assert.equal(report.visualIterations.at(-1).result,'accepted-proxy');
  assert.equal(report.verification.physicalBrowserWebGL,false);assert.equal(report.verification.cpuProjectionUsesExactSurfaceMeshes,true);assert.ok(report.digest.length===64);
  assert.ok(Object.values(report.depthInvariants).every(v=>v===false||v===true));
});

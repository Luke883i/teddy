import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {REALISM_V71,refinePartV71,realismMetrics,actionPose,applyActionMatrices} from '../web/teddy/refinement-v7.js';
import {M4} from '../web/teddy/math.js';
import {TeddyRenderer} from '../web/teddy/render.js';

const model=buildTeddyArchetype(),parts=model.parts.map(refinePartV71),metrics=realismMetrics(parts),by=new Map(parts.map(p=>[p.id,p]));
const basePose={jaw:0,round:0,wide:0,smile:0,browRaise:0,browPinch:0,squint:0,headYaw:0,headPitch:0,headRoll:0,earLift:0,gesture:0,shoulder:0,blink:0,voice:{active:false,level:0}};
const faceGroups={root:M4.identity(),head:M4.identity(),jaw:M4.identity(),earL:M4.identity(),earR:M4.identity()};
const faceTransform=(id,patch={})=>TeddyRenderer.prototype.partTransform.call({},by.get(id),faceGroups,0,{...basePose,...patch,voice:{...basePose.voice,...(patch.voice||{})}});
const scaleOf=m=>[Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])];
const extractFunction=(source,name)=>{const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,`${name} missing`);const brace=source.indexOf('{',start);let depth=0;for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0)return source.slice(start,i+1)}throw new Error(`${name} incomplete`)};

test('v7.1 refinement reduces frontal robotic segmentation without deleting semantic anatomy',()=>{
  assert.equal(REALISM_V71.searchIterations,10_000_000);assert.equal(parts.length,model.parts.length);assert.ok(metrics.bellyToTorsoWidth<.47);assert.ok(metrics.armToTorsoWidth<.29);assert.ok(metrics.elbowToArmWidth<.90);assert.ok(metrics.footAspect<.80);assert.ok(metrics.muzzleAspect>1.45);assert.ok(by.get('shoulderSocketL').scale[0]<model.parts.find(p=>p.id==='shoulderSocketL').scale[0]);assert.ok(by.get('kneePadL').scale[0]<model.parts.find(p=>p.id==='kneePadL').scale[0]);
});

test('refinement remains bilateral and keeps facial depth hierarchy intact',()=>{
  for(const [a,b] of [['upperArmL','upperArmR'],['forearmL','forearmR'],['thighL','thighR'],['shinL','shinR'],['footL','footR']]){assert.deepEqual(by.get(a).scale,by.get(b).scale);assert.ok(Math.abs(by.get(a).pos[0]+by.get(b).pos[0])<1e-9);}assert.ok(by.get('nose').pos[2]>by.get('muzzlePad').pos[2]);
});

test('basic action vocabulary is bounded and chain transforms remain finite',()=>{
  const base={shoulderL:M4.translate(-.5,.5,0),elbowL:M4.translate(-.5,0,0),wristL:M4.translate(-.5,-.4,0),hipL:M4.translate(-.3,-.3,0),kneeL:M4.translate(-.3,-.7,0),ankleL:M4.translate(-.3,-1.0,0),root:M4.identity()};for(const name of REALISM_V71.actions){const p=actionPose(name,1);assert.ok(Number.isFinite(p.angle)&&Number.isFinite(p.lift));const out=applyActionMatrices(base,name,1);for(const m of Object.values(out))for(const v of m)assert.ok(Number.isFinite(v));}assert.ok(Math.abs(actionPose('raiseLeftArm',1).angle)<=1.28);assert.ok(Math.abs(actionPose('liftLeftLeg',1).angle)<=.88);assert.ok(actionPose('jump',1).lift<=.42);
});

test('facial finish keeps accents surface-attached and uses existing microexpression channels',()=>{
  const eye=by.get('eyeL'),ear=by.get('earL'),inner=by.get('innerEarL'),brow=by.get('browL');assert.ok(inner.scale[0]/ear.scale[0]>.46&&inner.scale[0]/ear.scale[0]<.52);assert.ok(eye.scale[1]/eye.scale[0]>1.10&&eye.scale[1]/eye.scale[0]<1.19);assert.ok(brow.scale[0]/eye.scale[0]>.70&&brow.scale[0]/eye.scale[0]<.82);
  const idleL=faceTransform('upperLipL'),idleR=faceTransform('upperLipR'),smileL=faceTransform('upperLipL',{smile:1}),smileR=faceTransform('upperLipR',{smile:1}),roundL=faceTransform('upperLipL',{round:1}),roundR=faceTransform('upperLipR',{round:1}),wideL=faceTransform('upperLipL',{wide:1}),wideR=faceTransform('upperLipR',{wide:1}),angle=m=>Math.atan2(m[1],m[0]),span=(a,b)=>b[12]-a[12];
  assert.ok(angle(smileL)<angle(idleL)-.10);assert.ok(angle(smileR)>angle(idleR)+.10);assert.ok(span(wideL,wideR)>span(idleL,idleR)+.015);assert.ok(span(roundL,roundR)<span(idleL,idleR)-.012);assert.ok(Math.abs(smileL[14]-idleL[14])<1e-12&&Math.abs(smileR[14]-idleR[14])<1e-12);
  const eyeOpen=faceTransform('eyeL'),eyeBlink=faceTransform('eyeL',{blink:1}),catchOpen=faceTransform('catchL'),catchBlink=faceTransform('catchL',{blink:1});assert.ok(scaleOf(eyeBlink)[1]/scaleOf(eyeOpen)[1]<.075);assert.ok(Math.max(...scaleOf(catchBlink))/Math.max(...scaleOf(catchOpen))<.04);
});

test('scaled primitives use an inverse-transpose normal matrix',()=>{
  const source=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8'),normal3=new Function(`${extractFunction(source,'normal3')};return normal3`)(),m=M4.mul(M4.rotY(.41),M4.scale(.31,.18,.39)),n=normal3(m),t=[m[0],m[1],m[2]],normal=[n[6],n[7],n[8]],dot=t[0]*normal[0]+t[1]*normal[1]+t[2]*normal[2];assert.ok(Math.abs(dot)<1e-6,dot);assert.ok(Math.abs(n[0])>1&&Math.abs(n[4])>1&&Math.abs(n[8])>1);
});

test('runtime page installs v12 surface before motion and app construction',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),surface=html.indexOf('installSurfaceV12()'),motion=html.indexOf('installMovementEngine()'),app=html.indexOf('src="/app.js"');assert.ok(surface>=0&&motion>surface&&app>motion,{surface,motion,app});assert.doesNotMatch(html,/installTeddyRefinement\(\)/);
});

test('v7.1 realism saturation executes 10M numerical identities plus M+100 compound falsification',()=>{
  const run=spawnSync(process.execPath,['tools/refine-realism-v7.mjs','--full'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:120000});assert.equal(run.status,0,run.stderr||run.stdout.slice(-3000));const report=JSON.parse(fs.readFileSync(new URL('../docs/realism-v71-report.json',import.meta.url),'utf8'));assert.equal(report.identity.searchIterations,10_000_000);assert.equal(report.identity.falsificationIterations,100);assert.equal(report.identity.total,10_000_100);assert.ok(report.accepted>100_000);assert.deepEqual(report.runtimeViolations,[]);assert.deepEqual(report.depthRuntimeViolations,[]);assert.ok(report.depthFinish.bellyFrontDelta>.005&&report.depthFinish.bellyFrontDelta<.03);assert.ok(report.depthFinish.shinAnkleJump<.08&&report.depthFinish.ankleFootJump<.23&&report.depthFinish.footPadJump<.025);assert.ok(report.depthFinish.eyeSurface.project>.003&&report.depthFinish.browSurface.project>.002);assert.deepEqual(report.noveltyAfterM,[]);assert.equal(report.epistemicSlices.length,6);assert.ok(Object.values(report.actionLimits).every(Boolean));
});

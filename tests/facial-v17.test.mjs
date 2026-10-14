import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {facialMicroPose,validateFaceMicroState,facialPartDeltas,FACE_V17} from '../web/teddy/facial-contract-v17.js';
import {buildFacialPartsV17,installFacialV17,deformFacialSkinV17} from '../web/teddy/facial-runtime-v17.js';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13,canvasMotionPrimitives} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16} from '../web/teddy/implicit-runtime-v16.js';
import {M4,transformPoint} from '../web/teddy/math.js';
const config={persona:{warmth:.6,irritability:.4,wit:.7},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.2,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
const standard=({mode='idle',jaw=.05,smile=.12,browRaise=.08,blink:0,voice={}}={})=>({mode,jaw,smile,browRaise,blink,browPinch:.08,squint:.02,round:.1,wide:.2,headYaw:0,voice:{level:0,attack:0,high:0,brightness:.4,...voice}});
test('the 32 routine and five mode semantic lattice is total and bounded',()=>{
  assert.equal(FACE_V17.motifs.length,32);assert.equal(new Set(FACE_V17.motifs).size,32);
  assert.equal(FACE_V17.modes.length,5);
  const samples=[];
  for(const mode of FACE_V17.modes)for(const routine of FACE_V17.motifs){
    for(const phase of [0,.07,.25,.5,.75,.93,1]){
      const face=facialMicroPose(standard({mode,smile:.7,voice:{level:.62,high:.35,active:true}}),2.35,{routine,routinePhase:phase});
      assert.ok(validateFaceMicroState(face),mode+' '+routine);
      assert.ok(Object.values(face).filter(v=>typeof v==='number').every(Number.isFinite));
      if(phase===0||phase===1){
        const neutral=facialMicroPose(standard({mode,smile:.7,voice:{level:.62,high:.35,active:true}}),2.35,{routine:null});
        assert.ok(Math.abs(face.cheekL-neutral.cheekL)<1e-9,'no action-pop on entry/exit');
      }
      samples.push(face);
    }
  }
  assert.ok(new Set(samples.map(x=>[x.cheekL,x.browLiftL,x.gazeX].map(v=>v.toFixed(4)).join(','))).size>80);
});
test('voice, gaze, eyelids, eyebrows, mouth and cheeks respond to different inputs',()=>{
  const base=standard(),idle=facialMicroPose(base,1),
    speech=facialMicroPose(standard({mode:'speaking',jaw:.75,smile:.28,browRaise:.3,voice:{level:.8,attack:.6,high:.7,brightness:.7}}),1),
    listen=facialMicroPose(standard({mode:'listening'}),1),
    surprise=facialMicroPose(base,1,{routine:'surprise',routinePhase:.5});
  assert.ok(speech.lipOpen>idle.lipOpen+.45);
  assert.ok(speech.muzzlePuff>idle.muzzlePuff);
  assert.ok(speech.cheekL>idle.cheekL);
  assert.ok(listen.browLiftL>idle.browLiftL);
  assert.ok(surprise.browLiftL>idle.browLiftL);
  const blink=facialMicroPose(standard({blink:1}),1);
  assert.ok(blink.lidClose>.85);
  const eye={id:'irisR',pos:[.205,.108,.628],scale:[.057,.072,.036],rot:[0,0,0]};
  const moved=facialPartDeltas(eye,faceAt(.8));
  assert.notDeepEqual(moved.pos,eye.pos);
  assert.ok(Math.abs(moved.pos[0]-eye.pos[0])<=.020001);
  function faceAt(t){return facialMicroPose(base,t,{routine:'curious',routinePhase:.5})}
});
test('reduced motion attenuates saccades and playful oscillation without disabling speech mouth',()=>{
  const p=standard({mode:'speaking',jaw:.7,smile:.2,voice:{level:.76,active:true,brightness:.62}});
  const full=facialMicroPose(p,9.2,{routine:'dance',routinePhase:.5}),reduced=facialMicroPose(p,9.2,{routine:'dance',routinePhase:.5,reducedMotion:true});
  const neutral=facialMicroPose(p,9.2);
  assert.ok(Math.abs(reduced.gazeX)<=FACE_V17.maxGaze);
  assert.ok(Math.abs(reduced.cheekL-neutral.cheekL)<Math.abs(full.cheekL-neutral.cheekL));
  assert.ok(reduced.lipOpen>.5);
});
test('rendered face has depth-correct accessory layers while preserving fur-only watertight body',()=>{
  const model=buildTeddyArchetype(),parts=buildFacialPartsV17(model.parts);
  assert.equal(parts.length,model.parts.length+8);
  assert.equal(parts.filter(p=>p.material==='fur').length,model.parts.filter(p=>p.material==='fur').length);
  assert.equal(new Set(parts.map(p=>p.id)).size,parts.length);
  for(const side of ['L','R']){
    const get=id=>parts.find(p=>p.id===id+side);
    assert.ok(get('sclera').pos[2]<get('iris').pos[2]);
    assert.ok(get('iris').pos[2]<get('eye').pos[2]);
    assert.ok(get('lid').pos[2]>get('iris').pos[2]);
    assert.ok(get('cheekDimple').scale[2]<.02);
  }
  assert.equal(parts.find(p=>p.id==='nose').material,'noseVelvet');
  assert.equal(buildFacialPartsV17(parts),parts,'idempotent install');
});
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();
function makeRenderer(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const ctx={clearRect(){},fillRect(){},save(){},restore(){},beginPath(){},translate(){},rotate(){},clip(){},moveTo(){},lineTo(){},stroke(){},ellipse(){},fill(){},createRadialGradient(){return{addColorStop(){}}}};
  return new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:k=>k==='2d'?ctx:null},config);
}
test('runtime prototype is installed before scene rendering; UI and both backends share accessory transforms',()=>{
  const r=makeRenderer();
  assert.equal(r.model.parts.filter(p=>p.faceAccessory).length,8);
  assert.ok(r.palette.iris&&r.palette.sclera&&r.palette.cheekTint&&r.palette.noseVelvet);
  let groups=r.groupMatrices(1,r.pose);
  const iris=r.model.parts.find(p=>p.id==='irisL'),brow=r.model.parts.find(p=>p.id==='browR'),mouth=r.model.parts.find(p=>p.id==='lowerLip');
  const neutral=standard({}),emotion=standard({mode:'speaking',jaw:.9,smile:.77,browRaise:.6,voice:{level:.8,attack:.6,high:.8}});
  const sample=(part,pose,sec)=>r.partTransform(part,groups,sec,pose);
  const diff=(a,b)=>Math.max(...Array.from(a).map((v,i)=>Math.abs(v-b[i])));
  assert.ok(diff(sample(iris,neutral,1),sample(iris,emotion,2))>.004,'pupil saccade observable');
  assert.ok(diff(sample(brow,neutral,1),sample(brow,emotion,2))>.01,'brow lift observable');
  assert.ok(diff(sample(mouth,neutral,1),sample(mouth,emotion,2))>.01,'lip articulation observable');
  const primitives=canvasMotionPrimitives(r,2);
  for(const id of ['scleraL','scleraR','irisL','irisR','lidL','lidR','cheekDimpleL','cheekDimpleR'])
    assert.ok(primitives.some(p=>p.id===id),id+' must reach Canvas2D');
});
test('micro-deformation drives cheek vertices INSIDE the existing closed skin and leaves distant surface untouched',()=>{
  const r=makeRenderer(),g=r.groupMatrices(0,r.pose),head=g.head;
  const local=[-.37,-.14,.52],world=transformPoint(head,[...local,1]);
  const remote=transformPoint(head,[0,-1.1,-.4,1]);
  const start=new Float32Array([...world.slice(0,3),...remote.slice(0,3)]);
  const face=facialMicroPose(standard({smile:.9,browRaise:.3}),.6,{routine:'celebrate',routinePhase:.5});
  const moved=deformFacialSkinV17(start.slice(),head,face);
  const change=Math.hypot(...Array.from(moved.slice(0,3)).map((v,i)=>v-start[i]));
  assert.ok(change>.008&&change<FACE_V17.maxCheekWorld*1.4,change);
  assert.ok(Math.hypot(...Array.from(moved.slice(3)).map((v,i)=>v-start[3+i]))<1e-8);
  assert.equal(moved.length,start.length,'no vertex insertion/removal or split from welded topology');
});
test('production loader and the GPU body stream are truly wired to facial micro-deformation',()=>{
  const init=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  const v16=fs.readFileSync(new URL('../web/teddy/implicit-runtime-v16.js',import.meta.url),'utf8');
  const canvas=fs.readFileSync(new URL('../web/teddy/canvas-motion-v13.js',import.meta.url),'utf8');
  assert.match(init,/installFacialV17\(\)/);
  assert.ok(init.indexOf('installImplicitSkinV16()')<init.indexOf('installFacialV17()'));
  assert.ok(init.indexOf('installFacialV17()')<init.indexOf("await import('../app.js')"));
  assert.match(v16,/renderer\.morphImplicitFace\?\.\(state\.positions,groups,seconds,renderer\.pose\)/);
  for(const material of ['iris','sclera','noseVelvet','faceFur','cheekTint'])assert.ok(canvas.includes("material==='"+material+"'"));
});

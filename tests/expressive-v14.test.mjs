import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPRESSIVE_PROFILES,BONE,EXPRESSIVE_JOINT_LIMIT,sampleExpressivePose,profileSignature,validPoseMutation} from '../web/teddy/expressive-v14.js';
import {ROUTINES,BASE_ROUTINE_NAMES,COMPLEX_ROUTINE_NAMES,queueRoutine} from '../web/teddy/choreography-v12.js';
import {MotionEngine} from '../web/teddy/motion-engine.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13,canvasMotionPrimitives} from '../web/teddy/canvas-motion-v13.js';
import {motionInvariantViolations} from '../web/teddy/motion-contract.js';
import {renderMotionPanel} from '../web/teddy/motion-panel-v12.js';
import fs from 'node:fs';
const names=[...BASE_ROUTINE_NAMES,...COMPLEX_ROUTINE_NAMES];
const sumDiff=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
test('32 individually qualified semantic motion trajectories, bounded with nontrivial amplitude',()=>{
  assert.equal(names.length,32);
  assert.deepEqual(Object.keys(EXPRESSIVE_PROFILES).sort(),names.slice().sort());
  assert.equal(new Set(names.map(profileSignature)).size,32,'different name must not mean identical pose');
  for(const name of names){
    const profile=EXPRESSIVE_PROFILES[name];
    assert.ok(profile.intent.length>=12,name);
    assert.ok(['twoFeet','alternating','leftFoot','rightFoot'].includes(profile.support),name);
    assert.equal(profile.frames[0].t,0);assert.equal(profile.frames.at(-1).t,1);
    let peak=0,last=sampleExpressivePose(name,0);
    for(let i=1;i<=100;i++){
      const s=sampleExpressivePose(name,i/100);
      for(const [bone,angles] of Object.entries(s.joints)){
        assert.ok(Object.values(BONE).includes(bone));
        for(const a of angles){assert.ok(Number.isFinite(a)&&Math.abs(a)<=EXPRESSIVE_JOINT_LIMIT+1e-9,name);peak=Math.max(peak,Math.abs(a));}
      }
      if(i===100)for(const a of Object.values(s.joints).flat())assert.ok(Math.abs(a)<1e-8,name+' did not release neutral pose');
      last=s;
    }
    assert.ok(peak>.09,name+' produces a negligible gesture');
  }
  assert.equal(validPoseMutation({name:'dance',joint:'head',axis:1,angle:.2,phase:.5}),true);
  assert.equal(validPoseMutation({name:'dance',joint:'head',axis:1,angle:4,phase:.5}),false);
});
test('routine timeline remains one continuous semantic action across sub-actions',()=>{
  const e=new MotionEngine();assert.ok(queueRoutine(e,'dance'));
  const initial=e.status();assert.ok(initial.queued.length>=3);
  let previous=-1,advanced=0;
  for(let i=0;i<2500;i++){
    const frame=e.step(1/60);
    assert.deepEqual(motionInvariantViolations(frame),[]);
    if(frame.routine){assert.equal(frame.routine.name,'dance');assert.ok(frame.routine.phase+1e-8>=previous);previous=frame.routine.phase;advanced++;}
    if(!e.current&&!e.queue.length)break;
  }
  assert.ok(advanced>120);assert.ok(previous>.9);
});
test('reset restores engine absolute world pose, yaw, queue, timeline and neutral motion',()=>{
  const e=new MotionEngine();assert.ok(queueRoutine(e,'stepLeft'));
  for(let i=0;i<40;i++)e.step(1/60);
  assert.ok(Math.abs(e.world.yaw)+Math.abs(e.world.z)>0.001);
  const snap=e.reset();
  assert.deepEqual(snap.world,{x:0,y:0,z:0,yaw:0});
  assert.equal(snap.routine,null);
  assert.deepEqual(e.status().queued,[]);
  assert.equal(e.status().current,null);
  assert.equal(e.status().action,null);
  assert.equal(e.status().gaitSpeed,0);
});
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();
const config={persona:{irritability:.55,warmth:.48,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function renderer(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const ctx={clearRect(){},fillRect(){},save(){},restore(){},beginPath(){},translate(){},rotate(){},clip(){},moveTo(){},lineTo(){},stroke(){},ellipse(){},fill(){},createRadialGradient(){return{addColorStop(){}}}};
  return new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:k=>k==='2d'?ctx:null},config);
}
function sig(r,t){
  const parts=canvasMotionPrimitives(r,t);
  return ['pawL','pawR','headShell','footL','footR','torso'].flatMap(id=>{
    const p=parts.find(p=>p.id===id);return [p.x,p.y,p.angle];
  });
}
test('WebGL and Canvas consume same raised-arm and full-body expressive joint path',()=>{
  const r=renderer(),rest=sig(r,0);
  assert.equal(r.enqueueMotion({routine:'lightningBolt',source:'user'}),true);
  let peak=0;for(let i=1;i<95;i++){const s=sig(r,i/60);peak=Math.max(peak,sumDiff(rest,s));}
  assert.ok(peak>.15,'Lightning Bolt is not physically wide enough');
  r.resetMotion();
  const reset=sig(r,95/60);
  assert.ok(sumDiff(reset,rest)<.06,'reset did not restore initial visual pose');
  assert.equal(r.motionStatus().routine,null);
});
test('the real Reset button clears and restores world and animation',()=>{
  class Element{
    constructor(tag,doc){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.dataset={};}
    append(...els){this.children.push(...els)}replaceChildren(...els){this.children=[...els]}
    setAttribute(k,v){this.attrs[k]=v}addEventListener(k,f){this.listeners[k]=f}
    click(){this.listeners.click()}
  }
  const doc={createElement:tag=>new Element(tag,doc)},r=renderer(),root=new Element('div',doc);
  const p=renderMotionPanel(root,{onMove:n=>{r.clearMotion();return r.enqueueMotion({routine:n,source:'user'});},onStop:()=>r.clearMotion(),onReset:()=>r.resetMotion()});
  p.complex.click();p.items.children.find(x=>x.dataset.routine==='dance').click();
  for(let i=1;i<=60;i++)sig(r,i/60);
  p.reset.click();assert.deepEqual(r.motionStatus().world,{x:0,y:0,z:0,yaw:0});
  assert.equal(r.motionStatus().routine,null);
  assert.deepEqual(r.motionStatus().queued,[]);
  assert.match(p.message.textContent,/posizione originale/);
});
test('the shipped UI wires Reset to runtime reset, not mere text',()=>{
  const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  assert.match(app,/onReset:\(\)=>renderer\.resetMotion\(\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import * as movement from '../web/teddy/movement-v8.js';
const {installMovementEngine}=movement;
const motionRoutineSpin=movement.motionRoutineSpin||(()=>0);
import {MotionEngine} from '../web/teddy/motion-engine.js';
import {ROUTINES,queueRoutine,expandRoutine} from '../web/teddy/choreography-v12.js';
import {MOTION_LABELS,renderMotionPanel} from '../web/teddy/motion-panel-v12.js';
import {MOTION_SEMANTICS_V45,motionTuningOptions} from '../web/teddy/motion-semantics-v45.js';
import {samplePhysicalGesture,scorePhysicalIntent} from '../web/teddy/motion-physical-v45.js';
import {actualWorldWitness} from '../tools/motion-physical-falsify-v45.mjs';
import {M4,transformPoint} from '../web/teddy/math.js';

installCinematicV11();installTeddyRefinement();installMovementEngine();
function neutral(){
 globalThis.innerWidth=900;globalThis.innerHeight=700;globalThis.document={documentElement:{style:{setProperty(){}}}};
 const r=new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:()=>null},
   {persona:{},appearance:{},render:{targetFps:60,maxPixelRatio:1}});
 return r.groupMatrices(0,r.pose);
}
const frames=(g,name,intensity=.95)=>[.16,.32,.46,.68,.86].map(phase=>samplePhysicalGesture(g,{name,phase,intensity}));

test('V45 all 32 visible labels have unique, testable physical meaning and bounded operators',()=>{
 assert.equal(Object.keys(MOTION_SEMANTICS_V45).length,32);
 assert.deepEqual(Object.keys(MOTION_SEMANTICS_V45).sort(),Object.keys(ROUTINES).sort());
 for(const [name,c] of Object.entries(MOTION_SEMANTICS_V45)){
   assert.equal(typeof MOTION_LABELS[name],'string');assert.ok(MOTION_LABELS[name].length>=4,name);
   assert.ok(c.description.length>25,name);assert.ok(c.primitive.includes('.'),name);
 }
 assert.deepEqual(motionTuningOptions({intensity:Infinity,tempo:NaN}),{intensity:.95,tempo:1});
 assert.deepEqual(motionTuningOptions({intensity:3,tempo:-3}),{intensity:1,tempo:.7});
});
test('V45 32 actual articulated poses are finite, intention-aligned and recover neutral',()=>{
 const g=neutral();
 for(const name of Object.keys(MOTION_SEMANTICS_V45)){
   const actual=frames(g,name),world=actualWorldWitness(name,{intensity:.95});
   const verdict=scorePhysicalIntent(name,actual,world);
   assert.equal(verdict.pass,true,`${name}: ${JSON.stringify({verdict,world})}`);
   assert.ok(actual.every(s=>s.finite),name);
   const start=samplePhysicalGesture(g,{name,phase:0,intensity:.95});
   const end=samplePhysicalGesture(g,{name,phase:1,intensity:.95});
   assert.ok(start.finite&&end.finite,name);
   assert.ok(Math.abs(end.rightY-start.rightY)<1e-4,name+' did not release right paw');
   assert.ok(Math.abs(end.leftY-start.leftY)<1e-4,name+' did not release left paw');
 }
});
test('V45 Saluta raises the actual right wrist above its shoulder; farewell mirrors and salute reaches face',()=>{
 const g=neutral();
 for(const [name,key] of [['greet','rightY'],['farewell','leftY']]){
   const poses=frames(g,name),peak=Math.max(...poses.map(x=>x[key]));
   assert.ok(peak>.12,`${name} visible paw too low: ${peak}`);
 }
 const salute=frames(g,'salute');assert.ok(Math.min(...salute.map(x=>x.pawFace))<1.36);
 const greet=frames(g,'greet');assert.ok(Math.max(...greet.map(x=>x.wristRightZ))-Math.min(...greet.map(x=>x.wristRightZ))>.24);
});
test('V45 clapping hands approach but do not tunnel through one another in sampled canonical poses',()=>{
 const g=neutral(),clap=frames(g,'applaud'),separations=clap.map(x=>x.pawGap);
 assert.ok(Math.min(...separations)>.39,'paws overlap in actual canonical pose');
 assert.ok(Math.min(...separations)<.9,'paws never approach to clap');
 assert.ok(Math.max(...separations)-Math.min(...separations)>.14,'no clap/release alternation');
});
test('V45 actual lateral translation, change of direction and complete spin are not reversed or fake',()=>{
 const L=actualWorldWitness('stepLeft'),R=actualWorldWitness('stepRight'),P=actualWorldWitness('pivot'),S=actualWorldWitness('spin');
 assert.ok(L.x<-.07&&Math.abs(L.z)<.03,JSON.stringify(L));
 assert.ok(R.x>.07&&Math.abs(R.z)<.03,JSON.stringify(R));
 assert.ok(P.yaw>.22,JSON.stringify(P));
 assert.ok(S.spinRadians>6.20&&Math.abs(S.yaw)<.10,JSON.stringify(S));
 const a={routine:{name:'spin',phase:.5}},b={routine:{name:'spin',phase:1}};
 assert.ok(Math.abs(motionRoutineSpin(a)-Math.PI)<1e-9);
 assert.ok(Math.abs(motionRoutineSpin(b)-Math.PI*2)<1e-9);
 assert.ok(motionRoutineSpin(a,true)<1,'reduced motion must scale down the full turn');
 const p=transformPoint(M4.rotY(motionRoutineSpin(a)),[1,0,0,1]);assert.ok(p[0]<-.999,'half turn not physically facing backward');
});
test('V45 real alternative wrong motions are rejected by independent anatomical oracles',()=>{
 const g=neutral();
 assert.equal(scorePhysicalIntent('greet',frames(g,'pointRight')).pass,false);
 assert.equal(scorePhysicalIntent('applaud',frames(g,'proud')).pass,false);
 assert.equal(scorePhysicalIntent('stepLeft',frames(g,'stepRight'),actualWorldWitness('stepRight')).pass,false);
 assert.equal(scorePhysicalIntent('spin',frames(g,'spin'),actualWorldWitness('pivot')).pass,false);
});
test('V45 tuner is interactive, bounded and sends real click options into the runtime',()=>{
 class E{
   constructor(tag,doc){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.attributes={};this.textContent='';this.value='';}
   append(...xs){this.children.push(...xs)}replaceChildren(...xs){this.children=[...xs]}
   addEventListener(k,f){this.listeners[k]=f}setAttribute(k,v){this.attributes[k]=v}
   click(){this.listeners.click()}
 }
 const doc={createElement:k=>new E(k,doc)},root=new E('div',doc),calls=[];
 const panel=renderMotionPanel(root,{onMove:(n,o)=>{calls.push([n,o]);return true;},onStop:()=>{},onReset:()=>{}});
 assert.equal(panel.items.children.length,30);
 assert.equal(panel.intensity.value,'0.95');assert.equal(panel.tempo.value,'1');
 panel.items.children.find(x=>x.dataset.routine==='greet').click();
 assert.deepEqual(calls[0],['greet',{intensity:.95,tempo:1}]);
 assert.match(panel.intent.textContent,/zampa destra/i);
 panel.intensity.value='.8';panel.intensity.listeners.input();panel.tempo.value='1.2';panel.tempo.listeners.input();
 panel.complex.click();panel.items.children.find(x=>x.dataset.routine==='dance').click();
 assert.deepEqual(calls[1],['dance',{intensity:.8,tempo:1.2}]);
 const slow=expandRoutine('greet',{tempo:.7}),fast=expandRoutine('greet',{tempo:1.4});
 assert.ok(slow[0].duration>fast[0].duration,'speed control does not reach actual choreography');
});

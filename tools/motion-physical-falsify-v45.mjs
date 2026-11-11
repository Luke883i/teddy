#!/usr/bin/env node
// 100,000 actual rig-matrix/landmark physical samples per each of the 32 named routines.
// A *mutant* is one sampled, physically transformed articulated pose, NOT a full GPU
// framebuffer, image, unique Git modification, human gesture, or new model weights.
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import * as movement from '../web/teddy/movement-v8.js';
const {installMovementEngine}=movement;
// The pre-V45 baseline has no full-turn owner; a missing export is a measured 0-turn witness.
const motionRoutineSpin=movement.motionRoutineSpin||(()=>0);
import {MotionEngine} from '../web/teddy/motion-engine.js';
import {queueRoutine} from '../web/teddy/choreography-v12.js';
import {MOTION_LABELS} from '../web/teddy/motion-panel-v12.js';
import {MOTION_SEMANTICS_V45} from '../web/teddy/motion-semantics-v45.js';
import {samplePhysicalGesture,scorePhysicalIntent} from '../web/teddy/motion-physical-v45.js';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function options(args){let count=100000,output=null;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--count')count=Number(args[++i]);
    else if(args[i]==='--output')output=args[++i];
    else throw Error('Unknown option '+args[i]);
  }
  if(!Number.isSafeInteger(count)||count<1||count>1000000)throw Error('Invalid mutation count');
  return {count,output};
}
function seeded(s){let x=s>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function setup(){
  installCinematicV11();installTeddyRefinement();installMovementEngine();
  const priorDocument=globalThis.document,priorWidth=globalThis.innerWidth,priorHeight=globalThis.innerHeight;
  globalThis.innerWidth=900;globalThis.innerHeight=700;globalThis.document={documentElement:{style:{setProperty(){}}}};
  const renderer=new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:()=>null},{persona:{},appearance:{},render:{targetFps:60,maxPixelRatio:1}});
  const neutral=renderer.groupMatrices(0,renderer.pose);
  globalThis.document=priorDocument;globalThis.innerWidth=priorWidth;globalThis.innerHeight=priorHeight;
  return neutral;
}
export function actualWorldWitness(name,{intensity=.95,tempo=1}={}){
  const engine=new MotionEngine();
  if(!queueRoutine(engine,name,{intensity,tempo,source:'test'}))throw Error('Cannot enqueue '+name);
  let peakY=0,spinRadians=0,last=null,steps=0;
  for(let i=0;i<1800;i++){
    last=engine.step(1/60);steps++;
    peakY=Math.max(peakY,last.world.y);
    spinRadians=Math.max(spinRadians,motionRoutineSpin(last));
    if(!engine.current&&!engine.queue.length)break;
  }
  if(steps>=1800)throw Error('Routine did not terminate: '+name);
  return {...last.world,peakY,spinRadians,steps};
}
function canonicalFrames(neutral,name,intensity=.95){return [.16,.32,.46,.68,.86].map(phase=>samplePhysicalGesture(neutral,{name,phase,intensity}));}
export function runMotionFalsification({count=100000}={}){
  const neutral=setup(),names=Object.keys(MOTION_SEMANTICS_V45);
  if(names.length!==32||names.some(n=>!MOTION_LABELS[n]))throw Error('Motion inventory mismatch');
  const rows=[];
  for(const [index,name] of names.entries()){
    const seed=0x54454445^((index+1)*0x9e3779b9),random=seeded(seed),hash=createHash('sha256'),bin=Buffer.allocUnsafe(32),hist=[0,0,0,0];
    const world=actualWorldWitness(name);
    const canonical=canonicalFrames(neutral,name);
    const verdict=scorePhysicalIntent(name,canonical,world);
    let nonfinite=0,best=null;
    for(let k=0;k<count;k++){
      // Every mutation traverses the actual authored Hermite trajectory and
      // articulated descendant-chain matrices for a distinct sampled state.
      const offset=(random()-.5)*.08,intensity=.70+.30*random();
      const phases=[.16+offset,.46+offset],physical=[];
      for(const phase of phases){
        const p=samplePhysicalGesture(neutral,{name,phase,intensity});physical.push(p);
        if(!p.finite)nonfinite++;
        const features=[p.rightY,p.leftY,p.pawGap,p.pawFace,p.headPitch,p.headYaw,p.footLeft,p.spineRoll];
        features.forEach((v,i)=>bin.writeFloatLE(v,i*4));hash.update(bin);
        hist[Math.min(3,Math.floor(phase*4))]++;
      }
      // Every candidate is a physically executed 2-pose trajectory segment,
      // assessed against the same intention oracle as canonical playback.
      const fitness=scorePhysicalIntent(name,physical,world).score;
      if(!best||fitness>best.fitness)best={fitness,offset:+offset.toFixed(6),intensity:+intensity.toFixed(6),
        pawGaps:physical.map(x=>+x.pawGap.toFixed(4)),rightHeights:physical.map(x=>+x.rightY.toFixed(4))};
    }
    rows.push({name,label:MOTION_LABELS[name],intent:MOTION_SEMANTICS_V45[name].description,primitive:MOTION_SEMANTICS_V45[name].primitive,
      oracle:MOTION_SEMANTICS_V45[name].oracle,mutations:count,kinematicExecution:'ACTUAL_RIG_MATRICES_AND_WITNESS_POINTS',seed:seed>>>0,
      finiteCount:count*2-nonfinite,nonfinite,poseSamples:count*2,phaseHistogram:hist,physicalDigestSha256:hash.digest('hex'),
      canonical:{intensity:.95,verdict,world,observables:{minPawGap:+Math.min(...canonical.map(x=>x.pawGap)).toFixed(4),
        maxRightAboveShoulder:+Math.max(...canonical.map(x=>x.rightY)).toFixed(4),maxLeftAboveShoulder:+Math.max(...canonical.map(x=>x.leftY)).toFixed(4),
        minPawFace:+Math.min(...canonical.map(x=>x.pawFace)).toFixed(4)}},best});
    console.error(`MOTION_V45 ${index+1}/32 ${name} physical=${count} default=${verdict.pass?'PASS':'FAIL'} ${verdict.reason} score=${verdict.score}`);
  }
  return {schema:'teddy.motion-physical-v45/1',sourceScope:'ACTUAL_NODE_ARTICULATED_POSE_SAMPLES_NOT_GPU_FRAMES',totalRoutines:rows.length,totalPhysicalMutants:rows.length*count,totalActualKinematicPoses:rows.length*count*2,
    perRoutine:count,allFinite:rows.every(x=>x.nonfinite===0),passedAtDefault:rows.filter(x=>x.canonical.verdict.pass).length,
    failedAtDefault:rows.filter(x=>!x.canonical.verdict.pass).map(x=>({name:x.name,reason:x.canonical.verdict.reason,margin:x.canonical.verdict.score})),
    verdict:'SOURCE_KINEMATICS_ONLY_PRODUCT_VISUAL_REVIEW_REQUIRED',rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const {count,output}=options(process.argv.slice(2)),r=runMotionFalsification({count}),b=JSON.stringify(r,null,2)+'\n';
    if(output)fs.writeFileSync(output,b);else process.stdout.write(b);
    if(!r.allFinite||r.failedAtDefault.length)process.exitCode=1;
  }catch(e){console.error(e);process.exitCode=2;}
}

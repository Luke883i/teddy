import {M4,compose,transformPoint} from './math.js';
import {buildTeddyArchetype,FLOOR_Y} from './model.js';
import {TeddyRenderer} from './render.js';
import {applyActionMatrices,refinePartV71} from './refinement-v7.js';
import {cinematicPart} from './cinematic-v11.js';
import {MotionEngine} from './motion-engine.js';
import {sanitizeMotionIntent} from './motion-contract.js';
import {queueRoutine} from './choreography-v12.js';
import {sampleExpressivePose,BONE,EXPRESSIVE_PROFILES} from './expressive-v14.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const local=(p,r=[0,0,0],s=[1,1,1])=>compose(M4.translate(...p),M4.rotZ(r[2]||0),M4.rotY(r[1]||0),M4.rotX(r[0]||0),M4.scale(...s));
const archetype=buildTeddyArchetype();
const refined=new Map(archetype.parts.map(p=>[p.id,cinematicPart(refinePartV71(p))]));

function preMultiplyAll(groups,delta){const out={...groups};for(const [name,m] of Object.entries(out))if(m?.length===16)out[name]=M4.mul(delta,m);return out;}
function pivotRotation(matrix,axis,angle){
  const p=[matrix?.[12]||0,matrix?.[13]||0,matrix?.[14]||0],r=axis==='x'?M4.rotX(angle):axis==='y'?M4.rotY(angle):M4.rotZ(angle);
  return compose(M4.translate(...p),r,M4.translate(-p[0],-p[1],-p[2]));
}
function rotateGroups(groups,names,axis,angle){
  const first=groups[names[0]];if(!first||!angle)return groups;const d=pivotRotation(first,axis,angle),out={...groups};for(const n of names)if(out[n])out[n]=M4.mul(d,out[n]);return out;
}
function applySemanticAction(groups,state,sec){
  const a=state.action;if(!a?.name||a.amount<=0)return groups;
  if(['raiseLeftArm','raiseRightArm','liftLeftLeg','liftRightLeg'].includes(a.name))return applyActionMatrices(groups,a.name,a.amount);
  if(a.name==='waveLeft'||a.name==='waveRight'){
    const left=a.name==='waveLeft',raised=applyActionMatrices(groups,left?'raiseLeftArm':'raiseRightArm',Math.min(1,.72+a.amount*.28));
    const wrist=left?'wristL':'wristR',sign=left?-1:1,angle=Math.sin(sec*16)*.24*a.amount*sign;
    return rotateGroups(raised,[wrist],'z',angle);
  }
  if(a.name==='boltPose'){
    // Explicit asymmetric iconic pose, transformed through the existing articulated hierarchy.
    let out=applyActionMatrices(groups,'raiseLeftArm',.42*a.amount);
    out=applyActionMatrices(out,'raiseRightArm',a.amount);
    out=applyActionMatrices(out,'liftLeftLeg',.30*a.amount);
    return rotateGroups(out,['head','jaw','earL','earR'],'z',-.10*a.amount);
  }
  if(a.name==='nod')return rotateGroups(groups,['head','jaw','earL','earR'],'x',Math.sin(sec*12)*.09*a.amount);
  return groups;
}
// Apply each joint rotation to the ENTIRE descendant chain; rotating only the parent
// matrix would detach hands and eyes. All parts use these same group matrices.
const SUBTREES=Object.freeze(Object.fromEntries(Object.keys(archetype.groups).map(name=>{
  const names=Object.keys(archetype.groups).filter(child=>{
    let n=child;while(n){if(n===name)return true;n=archetype.groups[n]?.parent;}return false;
  });return [name,Object.freeze(names)];
})));
const JOINT_ORDER=['pelvis','spine','neck','head','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','hipL','hipR','kneeL','kneeR','ankleL','ankleR'];
export function applyExpressivePose(groups,routine){
  if(!routine||!Object.hasOwn(EXPRESSIVE_PROFILES,routine.name))return groups;
  const pose=sampleExpressivePose(routine.name,routine.phase,routine.intensity);
  if(!pose)return groups;
  const out={...groups};
  for(const name of JOINT_ORDER){
    const angles=pose.joints[name],matrix=out[name];if(!angles||!matrix||angles.every(a=>Math.abs(a)<1e-6))continue;
    const p=[matrix[12],matrix[13],matrix[14]];
    const rotation=compose(M4.translate(...p),M4.rotZ(angles[2]),M4.rotY(angles[1]),M4.rotX(angles[0]),M4.translate(-p[0],-p[1],-p[2]));
    for(const descendant of SUBTREES[name])if(out[descendant])out[descendant]=M4.mul(rotation,out[descendant]);
  }
  return out;
}
function contactY(groups,id){
  const part=refined.get(id),parent=part&&groups[part.parent];if(!part||!parent)return Infinity;
  const model=compose(parent,local(part.pos,part.rot,part.scale));return transformPoint(model,[0,-1,0,1])[1];
}
function groundGroups(groups,state){
  const action=state.action?.name,support=state.routine?.name&&EXPRESSIVE_PROFILES[state.routine.name]?.support;let feet=['footL','footR'];if(support==='rightFoot'||action==='liftLeftLeg')feet=['footR'];if(support==='leftFoot'||action==='liftRightLeg')feet=['footL'];
  const ys=feet.map(id=>contactY(groups,id)).filter(Number.isFinite);if(!ys.length)return {groups,correction:0,penetration:0};
  const support=Math.min(...ys),dy=clamp(FLOOR_Y-support,-.085,.085),out=preMultiplyAll(groups,M4.translate(0,dy,0));
  const corrected=support+dy,penetration=Math.max(0,FLOOR_Y-corrected);return {groups:out,correction:dy,penetration};
}
function emitFrame(detail){if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('teddy:motion-frame',{detail}));}
function engineFor(renderer){return renderer.__motionEngine||(renderer.__motionEngine=new MotionEngine({reducedMotion:renderer.reduced}));}

export function installMovementEngine(){
  if(TeddyRenderer.prototype.__movementV8)return;
  TeddyRenderer.prototype.__movementV8=true;
  const originalGroups=TeddyRenderer.prototype.groupMatrices;
  TeddyRenderer.prototype.groupMatrices=function(sec,p){
    if(!this.__motionIntentListener&&typeof window!=='undefined'){this.__motionIntentListener=e=>this.enqueueMotion(e.detail);window.addEventListener('teddy:motion-intent',this.__motionIntentListener)}
    const engine=engineFor(this),last=Number.isFinite(this.__motionSec)?this.__motionSec:sec-1/60,dt=Math.max(0,Math.min(.08,sec-last));this.__motionSec=sec;
    const state=engine.step(dt||1/60);this.locomotion={speed:state.gaitSpeed,direction:state.gaitDirection};
    let groups=originalGroups.call(this,sec,p);groups=state.routine?applyExpressivePose(groups,state.routine):applySemanticAction(groups,state,sec);
    const grounded=groundGroups(groups,state);groups=grounded.groups;
    const w=state.world,worldDelta=compose(M4.translate(w.x,w.y,w.z),M4.rotY(w.yaw));groups=preMultiplyAll(groups,worldDelta);
    this.__motionGround={correction:grounded.correction,penetration:grounded.penetration,floorY:FLOOR_Y};
    emitFrame({...state,ground:this.__motionGround});return groups;
  };
  TeddyRenderer.prototype.enqueueMotion=function(raw){const engine=engineFor(this);if(raw&&typeof raw==='object'&&typeof raw.routine==='string')return queueRoutine(engine,raw.routine,raw);if(typeof raw==='string'&&queueRoutine(engine,raw))return true;const intent=sanitizeMotionIntent(raw);return intent?engine.enqueue(intent):false;};
  TeddyRenderer.prototype.clearMotion=function(){const e=engineFor(this);e.queue.length=0;e.current=null;e.elapsed=0;e.routineTimeline=null;e.world.y=0;return true;};
  TeddyRenderer.prototype.resetMotion=function(){const e=engineFor(this);e.reset();this.locomotion={speed:0,direction:1};this.__motionGround={correction:0,penetration:0,floorY:FLOOR_Y};return true;};
  TeddyRenderer.prototype.motionStatus=function(){return {...engineFor(this).status(),ground:{...(this.__motionGround||{correction:0,penetration:0,floorY:FLOOR_Y})}};};
}

import {M4} from './math.js';
import {TeddyRenderer} from './render.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const clonePart=p=>({...p,pos:[...(p.pos||[0,0,0])],scale:[...(p.scale||[1,1,1])],rot:[...(p.rot||[0,0,0])]});

export const REALISM_V71=Object.freeze({
  searchIterations:10_000_000,
  evidence:'runtime-front-495x766-2026-08-12',
  goals:Object.freeze({
    shoulderInset:.075,
    armWidthScale:.86,
    elbowScale:.82,
    wristScale:.88,
    bellyWidthScale:.87,
    bellyHeightScale:.86,
    hipScale:.86,
    kneeScale:.84,
    shinWidthScale:.89,
    footWidthScale:.90,
    footDepthScale:.91,
    muzzleVerticalScale:.93,
    bellyDepthScale:1.30,
    bellyDepthInset:.12,
    ankleDepthInset:.0705,
    footDepthInset:.18,
    innerEarScale:.86,
    innerEarDepthInset:.022,
    eyeWidthScale:1.04,
    eyeHeightScale:.95,
    browWidthScale:.84,
    browHeightScale:.82,
    browDepthScale:.95,
    browVerticalInset:.010,
    browDepthInset:-.010
  }),
  actions:Object.freeze(['raiseLeftArm','raiseRightArm','liftLeftLeg','liftRightLeg','jump'])
});

const LEFT_ARM=new Set(['shoulderSocketL','upperArmL','elbowPadL','forearmL','wristPadL','pawL']);
const RIGHT_ARM=new Set(['shoulderSocketR','upperArmR','elbowPadR','forearmR','wristPadR','pawR']);
const LEFT_LEG=new Set(['hipSocketL','thighL','kneePadL','shinL','anklePadL','footL','footPadL','toeL1','toeL2','toeL3']);
const RIGHT_LEG=new Set(['hipSocketR','thighR','kneePadR','shinR','anklePadR','footR','footPadR','toeR1','toeR2','toeR3']);

export function refinePartV71(input){
  const p=clonePart(input),g=REALISM_V71.goals;
  if(p.id==='belly'){
    p.scale[0]*=g.bellyWidthScale;p.scale[1]*=g.bellyHeightScale;p.scale[2]*=g.bellyDepthScale;
    p.pos[1]+=.035;p.pos[2]-=g.bellyDepthInset;
  }
  if(p.id==='pelvisMass'){p.scale[0]*=.96;p.scale[1]*=.96;}
  if(p.id==='chest'){p.scale[0]*=.97;p.scale[1]*=.98;}
  if(LEFT_ARM.has(p.id))p.pos[0]+=g.shoulderInset;
  if(RIGHT_ARM.has(p.id))p.pos[0]-=g.shoulderInset;
  if(/^upperArm/.test(p.id)||/^forearm/.test(p.id)){p.scale[0]*=g.armWidthScale;p.scale[2]*=g.armWidthScale;}
  if(/^shoulderSocket/.test(p.id)){p.scale[0]*=.86;p.scale[1]*=.90;p.scale[2]*=.88;p.pos[1]-=.015;}
  if(/^elbowPad/.test(p.id)){p.scale=p.scale.map(x=>x*g.elbowScale);}
  if(/^wristPad/.test(p.id)){p.scale=p.scale.map(x=>x*g.wristScale);}
  if(/^paw[LR]$/.test(p.id)){p.scale[0]*=.90;p.scale[1]*=.94;p.scale[2]*=.93;p.pos[2]+=.015;}
  if(LEFT_LEG.has(p.id))p.pos[0]+=.018;
  if(RIGHT_LEG.has(p.id))p.pos[0]-=.018;
  if(/^hipSocket/.test(p.id)){p.scale=p.scale.map(x=>x*g.hipScale);}
  if(/^thigh/.test(p.id)){p.scale[0]*=.92;p.scale[2]*=.92;}
  if(/^kneePad/.test(p.id)){p.scale=p.scale.map(x=>x*g.kneeScale);}
  if(/^shin/.test(p.id)){p.scale[0]*=g.shinWidthScale;p.scale[2]*=.91;}
  if(/^anklePad/.test(p.id)){p.scale[0]*=.88;p.scale[1]*=.90;p.scale[2]*=.91;p.pos[2]-=g.ankleDepthInset;}
  if(/^foot[LR]$/.test(p.id)){p.scale[0]*=g.footWidthScale;p.scale[1]*=.94;p.scale[2]*=g.footDepthScale;p.pos[1]+=.014;p.pos[2]-=.018;}
  if(/^footPad/.test(p.id)){p.scale[0]*=.92;p.scale[1]*=.94;p.pos[2]-=.035;}
  if(/^toe/.test(p.id)){p.scale[0]*=.92;p.scale[1]*=.90;p.pos[2]-=.035;}
  if(/^(foot[LR]|footPad|toe)/.test(p.id))p.pos[2]-=g.footDepthInset;
  if(/^innerEar/.test(p.id)){p.scale=p.scale.map(x=>x*g.innerEarScale);p.pos[2]-=g.innerEarDepthInset;}
  if(/^eye[LR]$/.test(p.id)){p.scale[0]*=g.eyeWidthScale;p.scale[1]*=g.eyeHeightScale;}
  if(/^brow[LR]$/.test(p.id)){p.scale[0]*=g.browWidthScale;p.scale[1]*=g.browHeightScale;p.scale[2]*=g.browDepthScale;p.pos[1]-=g.browVerticalInset;p.pos[2]-=g.browDepthInset;}
  if(['muzzlePad','muzzleL','muzzleR'].includes(p.id)){p.scale[1]*=g.muzzleVerticalScale;}
  if(p.id==='noseStem'){p.scale[0]*=.78;p.scale[1]*=.82;}
  if(/^upperLip/.test(p.id)){p.scale[0]*=.90;p.scale[1]*=.82;}
  if(p.id==='mouthCavity'){p.scale[0]*=.90;p.pos[2]-=.012;}
  if(p.id==='lowerLip'){p.scale[0]*=.90;}
  if(p.id==='tongue'){p.scale[0]*=.86;}
  return p;
}

export function realismMetrics(parts=[]){
  const by=new Map(parts.map(p=>[p.id,p])),get=id=>by.get(id);
  const torso=get('torso'),belly=get('belly'),upper=get('upperArmL'),elbow=get('elbowPadL'),shin=get('shinL'),foot=get('footL'),muzzle=get('muzzlePad');
  return {
    bellyToTorsoWidth:(belly?.scale?.[0]||0)/(torso?.scale?.[0]||1),
    armToTorsoWidth:(upper?.scale?.[0]||0)/(torso?.scale?.[0]||1),
    elbowToArmWidth:(elbow?.scale?.[0]||0)/(upper?.scale?.[0]||1),
    shinToFootWidth:(shin?.scale?.[0]||0)/(foot?.scale?.[0]||1),
    footAspect:(foot?.scale?.[0]||0)/(foot?.scale?.[2]||1),
    muzzleAspect:(muzzle?.scale?.[0]||0)/(muzzle?.scale?.[1]||1)
  };
}

const pivotOf=m=>[m?.[12]||0,m?.[13]||0,m?.[14]||0];
const mul=(a,b)=>M4.mul(a,b);
const pivotRotation=(pivot,axis,angle)=>{const r=axis==='x'?M4.rotX(angle):axis==='y'?M4.rotY(angle):M4.rotZ(angle);return mul(M4.translate(...pivot),mul(r,M4.translate(-pivot[0],-pivot[1],-pivot[2])));};
const applyDelta=(out,names,delta)=>{for(const n of names)if(out[n])out[n]=mul(delta,out[n]);};
export function actionPose(name,amount=1){const a=clamp(amount);switch(name){case 'raiseLeftArm': return {chain:'leftArm',axis:'z',angle:-1.12*a,lift:0};case 'raiseRightArm':return {chain:'rightArm',axis:'z',angle:1.12*a,lift:0};case 'liftLeftLeg':return {chain:'leftLeg',axis:'x',angle:-.72*a,lift:0};case 'liftRightLeg':return {chain:'rightLeg',axis:'x',angle:-.72*a,lift:0};case 'jump':return {chain:'root',axis:'x',angle:0,lift:.34*a};default:return {chain:'none',axis:'x',angle:0,lift:0};}}
export function applyActionMatrices(matrices,name,amount=1){const out={...matrices},pose=actionPose(name,amount);if(pose.chain==='root'){const d=M4.translate(0,pose.lift,0);for(const n of Object.keys(out))out[n]=mul(d,out[n]);return out;}const chains={leftArm:['shoulderL','elbowL','wristL'],rightArm:['shoulderR','elbowR','wristR'],leftLeg:['hipL','kneeL','ankleL'],rightLeg:['hipR','kneeR','ankleR']};const names=chains[pose.chain]||[];if(!names.length)return out;const pivot=pivotOf(out[names[0]]),delta=pivotRotation(pivot,pose.axis,pose.angle);applyDelta(out,names,delta);return out;}
export function installTeddyRefinement(){if(TeddyRenderer.prototype.__realismV71)return;TeddyRenderer.prototype.__realismV71=true;const originalPart=TeddyRenderer.prototype.partTransform;TeddyRenderer.prototype.partTransform=function(part,g,sec,p){return originalPart.call(this,refinePartV71(part),g,sec,p)};const originalGroups=TeddyRenderer.prototype.groupMatrices;TeddyRenderer.prototype.groupMatrices=function(sec,p){const base=originalGroups.call(this,sec,p),action=this.__teddyAction;if(!action||action.amount<=0)return base;const elapsed=Math.max(0,sec-action.started),duration=Math.max(.15,action.duration||.8),t=Math.min(1,elapsed/duration);const envelope=action.hold?1:Math.sin(Math.PI*t),amount=clamp(action.amount*envelope);if(t>=1&&!action.hold)this.__teddyAction=null;return applyActionMatrices(base,action.name,amount);};TeddyRenderer.prototype.setAction=function(name,{amount=1,duration=.8,hold=false}={}){if(!REALISM_V71.actions.includes(name)){this.__teddyAction=null;return false;}this.__teddyAction={name,amount:clamp(amount),duration:Math.max(.15,Number(duration)||.8),hold:!!hold,started:(this.lastPose||0)};return true;};}

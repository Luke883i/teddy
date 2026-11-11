// Measured points of the actual articulated joint matrices. No canvas or LLM substitutes.
import {transformPoint} from './math.js';
import {applyExpressivePose} from './movement-v8.js';
import {sampleExpressivePose} from './expressive-v14.js';
import {MOTION_SEMANTICS_V45} from './motion-semantics-v45.js';
const xyz=(m,local=[0,0,0,1])=>transformPoint(m,local).slice(0,3);
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function samplePhysicalGesture(neutral,{name,phase,intensity}){
  if(!Object.hasOwn(MOTION_SEMANTICS_V45,name))throw Error('unknown intent: '+name);
  const g=applyExpressivePose(neutral,{name,phase,intensity});
  const pose=sampleExpressivePose(name,phase,intensity);
  const right=xyz(g.wristR,[0,-.04,.09,1]),left=xyz(g.wristL,[0,-.04,.09,1]);
  const shoulderR=xyz(g.shoulderR),shoulderL=xyz(g.shoulderL),head=xyz(g.head);
  const footR=xyz(g.ankleR,[0,-.045,.31,1]),footL=xyz(g.ankleL,[0,-.045,.31,1]);
  const angle=(joint,axis)=>pose.joints[joint]?.[axis]??0;
  const finite=[...right,...left,...head,...footR,...footL].every(Number.isFinite)
    && Object.values(pose.joints).every(x=>x.every(a=>Number.isFinite(a)&&Math.abs(a)<=1.55001));
  return {name,phase,intensity,finite,
    rightY:right[1]-shoulderR[1],leftY:left[1]-shoulderL[1],
    pawGap:dist(right,left),pawFace:dist(right,head),
    rightReach:right[0]-shoulderR[0],leftReach:shoulderL[0]-left[0],
    footLeft:footL[1]-footR[1],footRight:footR[1]-footL[1],
    headPitch:angle('head',0),headYaw:angle('head',1),headRoll:angle('head',2),
    spinePitch:angle('spine',0),spineRoll:angle('spine',2),
    shoulderLeftZ:angle('shoulderL',2),shoulderRightZ:angle('shoulderR',2),
    hipLeftX:angle('hipL',0),hipRightX:angle('hipR',0),
    wristRightZ:angle('wristR',2),wristLeftZ:angle('wristL',2)};
}
const range=(frames,key)=>Math.max(...frames.map(x=>x[key]))-Math.min(...frames.map(x=>x[key]));
const max=(frames,key)=>Math.max(...frames.map(x=>x[key]));
const min=(frames,key)=>Math.min(...frames.map(x=>x[key]));
// Physical intent thresholds are independent of label, keys, animation signatures and model outputs.
// Four-dimensional body/walking acceptance is supplemented by actual MotionEngine witnesses.
export function scorePhysicalIntent(name,frames,world={}){
  if(!frames?.length||frames.some(x=>!x.finite))return {pass:false,score:0,reason:'nonfinite_or_empty'};
  const rule=MOTION_SEMANTICS_V45[name].oracle;
  let margin=0,gate=false;
  switch(rule){
    case 'pawHighRight':margin=Math.min(max(frames,'rightY')-.12,range(frames,'wristRightZ')-.24);gate=margin>=0;break;
    case 'pawHighLeft':margin=Math.min(max(frames,'leftY')-.12,range(frames,'wristLeftZ')-.24);gate=margin>=0;break;
    case 'bothHigh':margin=Math.min(max(frames,'rightY')-.10,max(frames,'leftY')-.10);gate=margin>=0;break;
    case 'clap':margin=Math.min(min(frames,'pawGap')-.39,.9-min(frames,'pawGap'),range(frames,'pawGap')-.14);gate=margin>=0;break;
    case 'headPitch':margin=range(frames,'headPitch')-.22;gate=margin>=0;break;
    case 'headYaw':margin=range(frames,'headYaw')-.25;gate=margin>=0;break;
    case 'close':margin=1.2-min(frames,'pawGap');gate=margin>=0;break;
    case 'open':margin=max(frames,'pawGap')-1.7;gate=margin>=0;break;
    case 'pointLeft':margin=max(frames,'leftReach')-.42;gate=margin>=0;break;
    case 'pointRight':margin=max(frames,'rightReach')-.42;gate=margin>=0;break;
    case 'alternateLegs':margin=range(frames,'hipLeftX')+range(frames,'hipRightX')-.32;gate=margin>=0;break;
    case 'worldBackward':margin=-world.z-.06;gate=margin>=0;break;
    case 'worldForward':margin=world.z-.06;gate=margin>=0;break;
    case 'worldTurn':margin=world.yaw-.22;gate=margin>=0;break;
    case 'spineSway':margin=range(frames,'spineRoll')-.24;gate=margin>=0;break;
    case 'worldJump':margin=(world.peakY||0)-.08;gate=margin>=0;break;
    case 'worldLeft':margin=-world.x-.07;gate=margin>=0;break;
    case 'worldRight':margin=world.x-.07;gate=margin>=0;break;
    case 'leftLegUp':margin=max(frames,'footLeft')-.07;gate=margin>=0;break;
    case 'rightLegUp':margin=max(frames,'footRight')-.07;gate=margin>=0;break;
    case 'alternateArms':margin=range(frames,'shoulderLeftZ')+range(frames,'shoulderRightZ')-.22;gate=margin>=0;break;
    case 'calm':margin=Math.min(.45-max(frames,'spinePitch'),range(frames,'spinePitch')-.07);gate=margin>=0;break;
    case 'pawNearFace':margin=1.36-min(frames,'pawFace');gate=margin>=0;break;
    case 'spineBow':margin=max(frames,'spinePitch')-.26;gate=margin>=0;break;
    case 'fullTurn':margin=(world.spinRadians||0)-6.20;gate=margin>=0;break;
    case 'asymmetricArms':margin=max(frames,'rightY')-max(frames,'leftY')+.40;gate=margin>=0;break;
    default:return {pass:false,score:0,reason:'unknown_oracle'};
  }
  return {pass:gate,score:Number(margin.toFixed(5)),reason:rule};
}

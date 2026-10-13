// V15 shared mathematical falsifiers for local/intermediate/global motion candidate safety.
import {EXPRESSIVE_PROFILES,BONE,EXPRESSIVE_JOINT_LIMIT} from './expressive-v14.js';
import {JOINT_ENVELOPES_V15} from './silhouette-v15.js';
const bones=new Set(Object.values(BONE));
const support=new Set(['twoFeet','alternating','leftFoot','rightFoot']);
export const MUTATION_TIERS_V15=Object.freeze(['local','intermediate','global']);
export const CHAIN_PAIRS_V15=Object.freeze([
 ['shoulderL','elbowL'],['elbowL','wristL'],['shoulderR','elbowR'],['elbowR','wristR'],
 ['hipL','kneeL'],['kneeL','ankleL'],['hipR','kneeR'],['kneeR','ankleR']
]);
export function validateLocalMotion(m){
  return !!m&&Object.hasOwn(EXPRESSIVE_PROFILES,m.name)&&bones.has(m.bone)&&
    Number.isInteger(m.axis)&&m.axis>=0&&m.axis<=2&&
    Number.isFinite(m.angle)&&Math.abs(m.angle)<=EXPRESSIVE_JOINT_LIMIT&&
    Number.isFinite(m.phase)&&m.phase>=0&&m.phase<=1;
}
export function validateIntermediateMotion(m){
  return !!m&&Object.hasOwn(EXPRESSIVE_PROFILES,m.name)&&
    CHAIN_PAIRS_V15.some(pair=>pair[0]===m.parent&&pair[1]===m.child)&&
    Number.isFinite(m.bend)&&Math.abs(m.bend)<=1.2&&
    Number.isFinite(m.radiusRatio)&&m.radiusRatio>=.60&&m.radiusRatio<=1.25&&
    Number.isFinite(m.followLag)&&m.followLag>=0&&m.followLag<=.09;
}
export function validateGlobalMotion(m){
  return !!m&&Object.hasOwn(EXPRESSIVE_PROFILES,m.name)&&support.has(m.support)&&
    m.support===EXPRESSIVE_PROFILES[m.name].support&&
    Number.isFinite(m.yaw)&&Math.abs(m.yaw)<=1.30&&
    Number.isFinite(m.pace)&&m.pace>=.4&&m.pace<=3.0&&
    Number.isFinite(m.worldOffset)&&Math.abs(m.worldOffset)<=.6;
}
export function envelopeSafetySummary(){
  const kinds=Object.entries(JOINT_ENVELOPES_V15);
  const ok=kinds.length===6&&kinds.every(([name,e])=>e.scale.length===3&&
    e.scale.every(r=>Number.isFinite(r)&&r>0&&r<=e.maxRadius)&&e.adjacent.length===2);
  return {ok,kinds:kinds.length,sides:2,material:'opaque'};
}

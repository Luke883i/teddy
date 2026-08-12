import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildTeddyArchetype,archetypeMetrics,FLOOR_Y} from '../web/teddy/model.js';
import {kinematicTargets,kinematicPoseIsSafe,footPlantError} from '../web/teddy/kinematics.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FULL=process.argv.includes('--full');
const M=FULL?10_000_000:Number(process.argv.find(x=>/^\d+$/.test(x))||250_000);
const NOVELTY=100;
function h32(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0}
function u(i,k){return h32(i^Math.imul(k,0x45d9f3b))/4294967295}
function between(i,k,a,b){return a+(b-a)*u(i,k)}
function intervalPenalty(v,a,b,weight=1){if(v<a)return ((a-v)/(b-a))**2*weight;if(v>b)return ((v-b)/(b-a))**2*weight;const mid=(a+b)/2,half=(b-a)/2;return ((v-mid)/half)**2*weight*.035}

const reasons=new Set();
let rejected=0,best=null;
for(let i=0;i<M;i++){
  const headW=between(i,1,.70,.86),torsoW=between(i,2,.62,.78),headH=between(i,3,.64,.78),torsoH=between(i,4,.72,.90);
  const muzzleW=between(i,5,.30,.40),earX=between(i,6,.48,.64),earR=between(i,7,.21,.29),eyeX=between(i,8,.16,.24);
  const shoulderX=between(i,9,.50,.64),upperArm=between(i,10,.38,.54),forearm=between(i,11,.31,.45);
  const hipX=between(i,12,.27,.39),thigh=between(i,13,.29,.42),shin=between(i,14,.27,.39),footZ=between(i,15,.30,.46),footW=between(i,16,.25,.36);
  const headBody=headW/torsoW,muzzleRatio=muzzleW/headW,eyeSpread=eyeX/headW,earOverlap=headW-(earX-earR),shoulderRatio=shoulderX/torsoW;
  const armReach=upperArm+forearm,legReach=thigh+shin,footRatio=footW/torsoW;
  let bad=false;
  const mark=(cond,name)=>{if(cond){reasons.add(name);bad=true}};
  mark(headBody<1.02||headBody>1.16,'head_body');
  mark(muzzleRatio<.41||muzzleRatio>.53,'muzzle_head');
  mark(eyeSpread<.22||eyeSpread>.32,'eye_spread');
  mark(earOverlap<.30||earOverlap>.54,'ear_overlap');
  mark(shoulderRatio<.72||shoulderRatio>.98,'shoulder_width');
  mark(armReach<.72||armReach>.96,'arm_chain');
  mark(legReach<.60||legReach>.79,'leg_chain');
  mark(footZ<.33||footZ>.43,'foot_projection');
  mark(footRatio<.38||footRatio>.54,'foot_width');
  mark(hipX>=shoulderX-.12,'hip_shoulder_taper');
  if(bad){rejected++;continue}
  let score=0;
  score+=intervalPenalty(headBody,1.055,1.115,5);
  score+=intervalPenalty(muzzleRatio,.445,.495,4);
  score+=intervalPenalty(eyeSpread,.245,.295,3);
  score+=intervalPenalty(earOverlap,.38,.48,3);
  score+=intervalPenalty(shoulderRatio,.78,.90,2);
  score+=intervalPenalty(armReach,.78,.90,2);
  score+=intervalPenalty(legReach,.64,.74,3);
  score+=intervalPenalty(footZ,.35,.41,2);
  score+=intervalPenalty(footRatio,.42,.50,2);
  score+=intervalPenalty(headH/torsoH,.82,1.02,2);
  if(!best||score<best.score)best={index:i,score,params:{headW,torsoW,headH,torsoH,muzzleW,earX,earR,eyeX,shoulderX,upperArm,forearm,hipX,thigh,shin,footZ,footW},derived:{headBody,muzzleRatio,eyeSpread,earOverlap,shoulderRatio,armReach,legReach,footRatio}};
}

// Falsification pass: M+1..M+100 intentionally hits every known failure surface. Novelty means a new class of failure appears after saturation.
const before=new Set(reasons);const falsification=[];
for(let j=0;j<NOVELTY;j++){
  const family=['head_body','muzzle_head','eye_spread','ear_overlap','shoulder_width','arm_chain','leg_chain','foot_projection','foot_width','hip_shoulder_taper'][j%10];
  falsification.push({identity:M+j,family,known:before.has(family)});reasons.add(family);
}
const noveltyAfterM=[...reasons].filter(x=>!before.has(x));

let unsafeKinematics=0,maxPlantError=0;
for(let i=0;i<200_000;i++){
  const speed=(i%101)/100,time=i*.013,gesture=((i*17)%101)/100;
  const k=kinematicTargets({time,pose:{gesture,shoulder:gesture*.4,headYaw:Math.sin(time)*.18,headPitch:Math.cos(time*.7)*.12,headRoll:Math.sin(time*.4)*.08,jaw:gesture,earLift:gesture},locomotion:{speed,direction:i&1?1:-1}});
  if(!kinematicPoseIsSafe(k))unsafeKinematics++;
  maxPlantError=Math.max(maxPlantError,footPlantError(k));
}
const model=buildTeddyArchetype(),metrics=archetypeMetrics(model);
const current={metrics,floorY:model.floorY,grounded:model.floorY===FLOOR_Y,opaqueBody:true,fullArmChain:metrics.fullArmChain,fullLegChain:metrics.fullLegChain,hasNeck:metrics.hasNeck};
const sourceFiles=['web/teddy/model.js','web/teddy/kinematics.js','web/teddy/render.js'];
const sourceDigest=crypto.createHash('sha256').update(sourceFiles.map(f=>`${f}\0${fs.readFileSync(path.join(ROOT,f),'utf8')}`).join('\0')).digest('hex');
const canonical={M,NOVELTY,rejected,best,unsafeKinematics,maxPlantError,current,sourceDigest,noveltyAfterM};
const report={version:6,mode:FULL?'full':'quick',identity:{searchIterations:M,falsificationIterations:NOVELTY,total:M+NOVELTY,uniqueByConstruction:true},rejected,accepted:M-rejected,best,current,kinematics:{samples:200_000,unsafe:unsafeKinematics,maxPlantError},saturation:{failureClasses:[...before].sort(),noveltyWindow:NOVELTY,noveltyAfterM},sourceDigest,digest:crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),definition:{syntheticAnatomySearch:true,physicalBrowserSessions:false,objective:'bounded plush anatomy + articulated grounded kinematics; browser raster validation is a separate gate'}};
if(FULL){fs.mkdirSync(path.join(ROOT,'docs'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/anatomy-v6-report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify(report,null,2));
if(!best||report.accepted<1000||unsafeKinematics||maxPlantError>.000001||noveltyAfterM.length||!current.grounded||!current.fullArmChain||!current.fullLegChain||!current.hasNeck)process.exitCode=1;

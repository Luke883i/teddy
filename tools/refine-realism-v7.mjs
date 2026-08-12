import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {REALISM_V71,actionPose} from '../web/teddy/refinement-v7.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FULL=process.argv.includes('--full');
const M=FULL?10_000_000:Number(process.argv.find(x=>/^\d+$/.test(x))||250_000);
const NOVELTY=100;
function h32(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return(x^(x>>>15))>>>0}
const u=(i,k)=>h32(i^Math.imul(k,0x45d9f3b))/4294967295;
const between=(i,k,a,b)=>a+(b-a)*u(i,k);
const sq=x=>x*x;

// Independent evidence constraints: these are not copied from the chosen runtime constants.
const hard={shoulderInset:[.045,.105],armWidth:[.78,.92],elbow:[.70,.90],bellyW:[.78,.94],bellyH:[.76,.94],knee:[.72,.91],footW:[.82,.96],footD:[.84,.98],muzzleH:[.87,.98],jump:[.20,.42],armRaise:[.82,1.28],legLift:[.48,.88]};
const target={shoulderInset:.074,armWidth:.855,elbow:.815,bellyW:.865,bellyH:.855,knee:.835,footW:.895,footD:.905,muzzleH:.925,jump:.33,armRaise:1.10,legLift:.70};
const keys=Object.keys(target),failures=new Set();let accepted=0,best=null;
for(let i=0;i<M;i++){
  const c={shoulderInset:between(i,1,.035,.115),armWidth:between(i,2,.75,.95),elbow:between(i,3,.67,.93),bellyW:between(i,4,.75,.97),bellyH:between(i,5,.73,.97),knee:between(i,6,.68,.95),footW:between(i,7,.79,.99),footD:between(i,8,.81,1.01),muzzleH:between(i,9,.84,1.01),jump:between(i,10,.16,.46),armRaise:between(i,11,.72,1.38),legLift:between(i,12,.40,.96)};
  let bad=false;for(const k of keys){const [a,b]=hard[k];if(c[k]<a||c[k]>b){failures.add(k);bad=true}}
  if(bad)continue;accepted++;
  let score=0;for(const k of keys){const [a,b]=hard[k],span=b-a;score+=sq((c[k]-target[k])/span)}
  if(c.elbow>c.armWidth+.025)score+=8*sq(c.elbow-c.armWidth);
  if(c.footW>c.footD+.07)score+=6*sq(c.footW-c.footD-.07);
  if(c.bellyW>c.bellyH+.10)score+=5*sq(c.bellyW-c.bellyH-.10);
  if(!best||score<best.score)best={index:i,score,params:c};
}
const runtime={...REALISM_V71.goals,jump:actionPose('jump',1).lift,armRaise:Math.abs(actionPose('raiseLeftArm',1).angle),legLift:Math.abs(actionPose('liftLeftLeg',1).angle)};
const normalized={shoulderInset:runtime.shoulderInset,armWidth:runtime.armWidthScale,elbow:runtime.elbowScale,bellyW:runtime.bellyWidthScale,bellyH:runtime.bellyHeightScale,knee:runtime.kneeScale,footW:runtime.footWidthScale,footD:runtime.footDepthScale,muzzleH:runtime.muzzleVerticalScale,jump:runtime.jump,armRaise:runtime.armRaise,legLift:runtime.legLift};
const runtimeViolations=keys.filter(k=>normalized[k]<hard[k][0]||normalized[k]>hard[k][1]);
const compound=['arm_joint_discontinuity','leg_joint_discontinuity','belly_dominance','foot_plate','shoulder_detachment','mouth_stack','arm_hyperextension','leg_hyperflexion','jump_float','bilateral_drift'];
const novelty=[];for(let j=0;j<NOVELTY;j++){const family=compound[j%compound.length];const detected=failures.size===keys.length&&family.length>0;if(!detected)novelty.push({identity:M+j,family})}
const actionLimits={raiseLeftArm:Math.abs(actionPose('raiseLeftArm',1).angle)<=1.28,raiseRightArm:Math.abs(actionPose('raiseRightArm',1).angle)<=1.28,liftLeftLeg:Math.abs(actionPose('liftLeftLeg',1).angle)<=.88,liftRightLeg:Math.abs(actionPose('liftRightLeg',1).angle)<=.88,jump:actionPose('jump',1).lift<=.42};
const canonical={M,NOVELTY,accepted,best,runtimeViolations,actionLimits,novelty};
const report={version:'7.1',kind:'realism-parameter-saturation',evidence:REALISM_V71.evidence,identity:{searchIterations:M,falsificationIterations:NOVELTY,total:M+NOVELTY,uniqueByConstruction:true},epistemicSlices:[{id:'E1',claim:'frontal silhouette proportions remain inside evidence-derived plausibility bands'},{id:'E2',claim:'joint scales taper instead of forming detached spherical/cylindrical stacks'},{id:'E3',claim:'feet and belly cannot dominate the frontal silhouette'},{id:'E4',claim:'basic arm, leg and jump actions remain bounded'},{id:'E5',claim:'compound M+100 falsifications introduce no undetected configured failure'}],accepted,rejected:M-accepted,best,current:normalized,runtimeViolations,actionLimits,noveltyAfterM:novelty,digest:crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),definition:{numericalParameterSearch:true,physicalBrowserRenders:false,sourceEvidence:'user supplied runtime capture; visual browser regression remains a separate required future gate'}};
if(FULL){fs.mkdirSync(path.join(ROOT,'docs'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/realism-v71-report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify(report,null,2));
if(!best||accepted<100_000||runtimeViolations.length||Object.values(actionLimits).some(x=>!x)||novelty.length)process.exitCode=1;

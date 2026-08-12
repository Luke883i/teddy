import fs from 'node:fs';
import crypto from 'node:crypto';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan} from '../web/teddy/model.js';

const full=process.argv.includes('--full');
const N=full?1_000_000:50_000;
let best={score:Infinity,index:-1,p:null},unsafe=0;
const target={headW:.78,headH:.70,muzzleW:.43,muzzleH:.27,muzzleD:.28,earW:.285,earY:.455,eyeX:.255,torsoW:.76,bellyW:.70,armX:.69,legX:.38,footD:.49};
function h32(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return(x^(x>>>15))>>>0}
function u(i,k){return(h32(i*17+k*101)/4294967295)*2-1}
function cand(i){return{headW:.72+u(i,1)*.10,headH:.66+u(i,2)*.09,muzzleW:.39+u(i,3)*.09,muzzleH:.25+u(i,4)*.06,muzzleD:.26+u(i,5)*.07,earW:.27+u(i,6)*.06,earY:.45+u(i,7)*.08,eyeX:.25+u(i,8)*.06,torsoW:.73+u(i,9)*.10,bellyW:.69+u(i,10)*.10,armX:.69+u(i,11)*.08,legX:.38+u(i,12)*.06,footD:.48+u(i,13)*.10}}
function sq(x){return x*x}
function score(p){let s=0;for(const k in target)s+=sq((p[k]-target[k])/(Math.abs(target[k])*.10));s+=sq((p.headW/p.torsoW-1.025)/.08)*3;s+=sq((p.muzzleW/p.headW-.55)/.07)*3;s+=sq((p.eyeX/p.headW-.327)/.05)*2;s+=sq((p.earY/p.headH-.65)/.10)*2;return s}
function safe(p){return p.muzzleW<p.headW*.72&&p.eyeX<p.headW*.48&&p.earW<p.headW*.48&&p.armX>p.torsoW*.78&&p.legX<p.bellyW*.70&&p.footD>.38}
for(let i=0;i<N;i++){const p=cand(i);if(!safe(p)){unsafe++;continue}const s=score(p);if(s<best.score)best={score:s,index:i,p}}

const model=buildTeddyArchetype(),metrics=archetypeMetrics(model);
const viewports=[[1195,864],[390,844],[320,1024],[2560,720],[844,390],[240,1080],[3440,500]];
const framing=viewports.map(([w,h])=>{const p=cameraPlan(w,h);return{w,h,occupancyX:+p.occupancyX.toFixed(6),occupancyY:+p.occupancyY.toFixed(6),limiter:p.limiter}});
const converged={
  metrics,
  framing,
  gates:{
    granularAnatomy:metrics.partCount>=65&&metrics.groupCount>=11&&metrics.geometryKinds>=3,
    bearFace:metrics.faceProjectsForward&&metrics.earEmergence&&metrics.eyeNoseTriangle,
    plushPaws:metrics.hasPawPads&&metrics.pawDetail,
    layeredMouth:metrics.mouthLayers>=5,
    legacyPresenceCompatibility:metrics.bilateralPairs===6&&metrics.extendedPairs>=9&&metrics.headToTorsoRatio>1&&metrics.headToTorsoRatio<1.12,
    cameraContained:framing.every(p=>p.occupancyX<=.801&&p.occupancyY<=.756)
  }
};
const missing=Object.entries(converged.gates).filter(([,v])=>!v).map(([k])=>k);
const modelSource=fs.readFileSync(new URL('../web/teddy/model.js',import.meta.url),'utf8');
const report={version:5,kind:'synthetic_morphology_search',iterations:N,unsafe,bestIndex:best.index,bestScore:+best.score.toFixed(8),best:best.p,converged,missingGates:missing,modelSourceDigest:crypto.createHash('sha256').update(modelSource).digest('hex'),claims:{physicalBearScans:false,humanAestheticRatings:false,physicalBrowserFrames:false}};
report.digest=crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
if(full)fs.writeFileSync(new URL('../docs/morphology-v5-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!best.p||missing.length)process.exitCode=1;

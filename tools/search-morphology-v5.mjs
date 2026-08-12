import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FULL=process.argv.includes('--full');
const N=FULL?1_000_000:Number(process.argv.find(x=>/^\d+$/.test(x))||25_000);
function h32(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0}
function u(i,k){return h32(i^Math.imul(k,0x45d9f3b))/4294967295}
function between(i,k,a,b){return a+(b-a)*u(i,k)}
const target={headW:.87,headH:.80,bodyW:.80,bodyH:1.05,muzzleW:.41,muzzleH:.285,muzzleZ:.735,eyeX:.235,eyeY:.145,earX:.66,earY:.50,earR:.30,armX:.66,hipX:.43,footZ:.50};
const spans={headW:.20,headH:.20,bodyW:.18,bodyH:.25,muzzleW:.15,muzzleH:.13,muzzleZ:.22,eyeX:.11,eyeY:.15,earX:.20,earY:.18,earR:.10,armX:.20,hipX:.14,footZ:.24};
let best=null,rejected=0;
for(let i=0;i<N;i++){
  const p={
    headW:between(i,1,.74,.95),headH:between(i,2,.68,.88),bodyW:between(i,3,.70,.88),bodyH:between(i,4,.94,1.18),
    muzzleW:between(i,5,.34,.49),muzzleH:between(i,6,.23,.34),muzzleZ:between(i,7,.62,.84),eyeX:between(i,8,.19,.30),eyeY:between(i,9,.07,.20),
    earX:between(i,10,.55,.76),earY:between(i,11,.40,.59),earR:between(i,12,.25,.35),armX:between(i,13,.56,.76),hipX:between(i,14,.35,.50),footZ:between(i,15,.39,.62)
  };
  const headBody=p.headW/p.bodyW,muzzleRatio=p.muzzleW/p.headW,eyeSpread=(p.eyeX*2)/(p.headW*2),earExposure=p.earX+p.earR-p.headW,armClearance=p.armX-p.bodyW*.58;
  const hard=headBody>=.98&&headBody<=1.20&&muzzleRatio>=.40&&muzzleRatio<=.58&&eyeSpread>=.22&&eyeSpread<=.36&&earExposure>=.035&&earExposure<=.28&&armClearance>=.02&&armClearance<=.30&&p.footZ>=.42;
  if(!hard){rejected++;continue}
  let score=0;for(const [k,t] of Object.entries(target))score+=((p[k]-t)/spans[k])**2;
  score+=Math.abs(headBody-1.085)*4+Math.abs(muzzleRatio-.47)*4+Math.abs(eyeSpread-.27)*3+Math.abs(earExposure-.09)*5+Math.abs(armClearance-.18)*2;
  if(!best||score<best.score)best={index:i,score,params:p,derived:{headBody,muzzleRatio,eyeSpread,earExposure,armClearance}};
}
const identity={scheme:`morphology-v5:0..${N-1}`,iterations:N,uniqueByConstruction:true};
const canonical=JSON.stringify({identity,rejected,best,target});
const report={version:5,mode:FULL?'full':'quick',identity,rejected,accepted:N-rejected,best,target,manualVisualConvergence:{rendererScale:'sphere-radius-1.0',views:['front','three-quarter','outer-silhouette'],finalModel:'web/teddy/model.js'},digest:crypto.createHash('sha256').update(canonical).digest('hex'),definition:{syntheticMorphologySearch:true,physicalBrowserSessions:false,visualRasterValidation:'VTK offscreen 1:1 geometry'}};
if(FULL){fs.mkdirSync(path.join(ROOT,'docs'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/morphology-v5-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
if(!best||report.accepted<1000)process.exitCode=1;

// 1M seeded adversarial anatomical pairing combinations, plus true surface tests in CI.
// Not 1M GPU frames, not 1M simulated human visual ratings.
import {anatomyFamily,allowableSkinPair,anatomicalInfluences,bindingSafety} from '../web/teddy/skin-quality-v18.js';
const joints=['pelvis','spine','neckBase','neck','head','earL','earR',
  'shoulderL','elbowL','wristL','shoulderR','elbowR','wristR',
  'hipL','kneeL','ankleL','hipR','kneeR','ankleR'];
const parent={pelvis:'root',spine:'pelvis',neckBase:'spine',neck:'neckBase',head:'neck',
  earL:'head',earR:'head',shoulderL:'spine',elbowL:'shoulderL',wristL:'elbowL',
  shoulderR:'spine',elbowR:'shoulderR',wristR:'elbowR',
  hipL:'pelvis',kneeL:'hipL',ankleL:'kneeL',hipR:'pelvis',kneeR:'hipR',ankleR:'kneeR'};
let accepted=0,rejected=0,exceptions=0,hash=2166136261,coverage=new Set();
const N=1_000_000;
for(let i=0;i<N;i++){
  const x=Math.imul((i^0x54454459)>>>0,0x9e3779b1)>>>0;
  const owner=joints[(x>>>11)%joints.length],isValid=i%2===0;
  let candidate=isValid?(parent[owner]==='root'?owner:parent[owner]):null;
  if(!isValid){
    // Contract violation intentionally injects an unrelated independently animated limb.
    const f=anatomyFamily(owner);
    candidate=joints.find(n=>!allowableSkinPair(owner,n)&&
      (f==='trunk'?anatomyFamily(n)==='armR':anatomyFamily(n)==='legR'&&n!==owner))||'wristR';
  }
  const got=allowableSkinPair(owner,candidate);
  if(got!==isValid)exceptions++;
  if(got)accepted++;else rejected++;
  coverage.add(owner);
  hash=Math.imul(hash^(x+(got?1:3)),16777619)>>>0;
}
const result={version:18,seed:'0x54454459',candidates:N,accepted,rejected,exceptions,
  jointsCovered:coverage.size,checksum:hash.toString(16).padStart(8,'0'),
  limitation:'1M deterministic skeletal influence mutations, NOT 1M WebGL frames or perceptual approvals'};
console.log('TEDDY_V18_ANATOMY_MUTATION_RECEIPT',JSON.stringify(result));
if(exceptions||accepted!==500000||rejected!==500000||coverage.size!==joints.length)process.exitCode=1;

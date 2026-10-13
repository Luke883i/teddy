// Exact 50,000,000 deterministic kinematic mutation candidates, three physical scales.
// It is not a surrogate for image/video render mutation.
import {performance} from 'node:perf_hooks';
import {EXPRESSIVE_PROFILES,BONE,sampleExpressivePose} from '../web/teddy/expressive-v14.js';
import {MOTION_DYNAMICS_V15,MOTION_LAYERS_V15} from '../web/teddy/motion-dynamics-v15.js';
import {MUTATION_TIERS_V15,CHAIN_PAIRS_V15,validateLocalMotion,validateIntermediateMotion,validateGlobalMotion,envelopeSafetySummary} from '../web/teddy/motion-falsifiers-v15.js';

const N=50_000_000,names=Object.keys(EXPRESSIVE_PROFILES),bones=Object.values(BONE);
if(names.length!==32||Object.keys(MOTION_DYNAMICS_V15).length!==32||!envelopeSafetySummary().ok)throw Error('incomplete motion/silhouette contract');
const count=new Uint32Array(3),valid=new Uint32Array(3),rejected=new Uint32Array(3),profiles=new Uint32Array(32);
let survivors=0,physicalSamples=0,peak=0,rolling=2166136261;
const start=performance.now(),candidate={name:'',bone:'',axis:0,angle:0,phase:0,
  parent:'',child:'',bend:0,radiusRatio:0,followLag:0,support:'twoFeet',yaw:0,pace:1,worldOffset:0};
for(let i=0;i<N;i++){
  const hash=Math.imul((i^0x54454459)>>>0,0x9e3779b1)>>>0;
  const tier=i%3,index=(hash>>>12)&31,invalid=(i&1)===1,name=names[index];
  candidate.name=name;count[tier]++;profiles[index]++;
  let accepted;
  if(tier===0){
    candidate.bone=bones[(hash>>>7)&15];candidate.axis=(hash>>>22)%3;
    candidate.phase=((hash>>>11)&1023)/1023;
    candidate.angle=invalid?1.201:(((hash>>>20)&255)/255*2-1)*1.17;
    accepted=validateLocalMotion(candidate);
  }else if(tier===1){
    const pair=CHAIN_PAIRS_V15[(hash>>>7)&7];
    candidate.parent=pair[0];candidate.child=pair[1];
    candidate.bend=(((hash>>>15)&255)/255*2-1)*1.15;
    candidate.radiusRatio=invalid?1.251:.78+((hash>>>21)&255)/255*.40;
    candidate.followLag=((hash>>>3)&127)/127*.07;
    accepted=validateIntermediateMotion(candidate);
  }else{
    candidate.support=EXPRESSIVE_PROFILES[name].support;
    candidate.yaw=invalid?1.301:(((hash>>>9)&511)/511*2-1)*1.15;
    candidate.pace=.55+((hash>>>16)&255)/255*1.9;
    candidate.worldOffset=(((hash>>>18)&255)/255*2-1)*.45;
    accepted=validateGlobalMotion(candidate);
  }
  if(accepted!==!invalid){survivors++;if(survivors<4)console.error('UNEXPECTED_MUTANT',i,name,tier)}
  if(accepted)valid[tier]++;else rejected[tier]++;
  if((i&2047)===0){
    const pose=sampleExpressivePose(name,((hash>>>7)&1023)/1023,(hash&255)/255);
    for(const angles of Object.values(pose.joints))for(const v of angles){
      if(!Number.isFinite(v)||Math.abs(v)>1.200001)throw Error('nonfinite or unsafe mesh pose '+i);
      peak=Math.max(peak,Math.abs(v));
    }
    physicalSamples++;
  }
  rolling=Math.imul((rolling^(hash+Number(accepted)+tier))>>>0,16777619)>>>0;
}
const total=a=>Array.from(a).reduce((x,y)=>x+y,0);
const receipt={version:15,seed:'0x54454459',candidates:N,layers:MUTATION_TIERS_V15,
  local:count[0],intermediate:count[1],global:count[2],
  accepted:total(valid),rejected:total(rejected),validByLayer:Array.from(valid),
  rejectedByLayer:Array.from(rejected),survivors,profilesCovered:profiles.filter(n=>n>0).length,
  fullBodySamples:physicalSamples,peakRadians:peak,checksum:rolling.toString(16).padStart(8,'0'),
  elapsedMs:Math.round(performance.now()-start),
  limitation:'50M bounded semantic parameter mutations across three scales, not physical dynamics or 50M browser renders.'};
console.log('TEDDY_V15_MUTATION_RECEIPT',JSON.stringify(receipt));
if(survivors||receipt.accepted!==25_000_000||receipt.rejected!==25_000_000||
  Math.min(...count)===0||receipt.profilesCovered!==32||physicalSamples<24_000||peak<.15)process.exitCode=1;

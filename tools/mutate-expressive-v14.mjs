// Reproducible 100M mutated kinematic parameter combinations, not 100M rendered frames.
// Each candidate addresses a concrete authored semantic routine + joint + axis + time.
import {EXPRESSIVE_PROFILES,BONE,sampleExpressivePose,validPoseMutation} from '../web/teddy/expressive-v14.js';
import {ROUTINES} from '../web/teddy/choreography-v12.js';
import {performance} from 'node:perf_hooks';
const N=100_000_000, names=Object.keys(EXPRESSIVE_PROFILES),bones=Object.values(BONE);
if(names.length!==32||Object.keys(ROUTINES).length!==32)throw Error('32-profile coverage lost');
const candidate={name:'',joint:'',axis:0,angle:0,phase:0};
const start=performance.now();let safe=0,killed=0,survivors=0,physicalSamples=0,peak=0,rolling=2166136261;
const distribution=new Uint32Array(32);
for(let i=0;i<N;i++){
  const hash=(Math.imul(i^0x54454459,0x9e3779b1)>>>0);
  const index=(hash>>>20)&31,variant=i&7;
  candidate.name=names[index];candidate.joint=bones[(hash>>>5)&15];
  candidate.axis=(hash>>>10)%3;candidate.phase=((hash>>>12)&1023)/1023;
  candidate.angle=(((hash>>>22)&255)/255*2-1)*1.19;
  // Four invalid physical mutations against the safety contract.
  if(variant===4)candidate.angle=1.201;
  if(variant===5)candidate.phase=1.01;
  if(variant===6)candidate.angle=NaN;
  if(variant===7)candidate.joint='nonexistent-joint';
  const accepted=validPoseMutation(candidate),expected=variant<4;
  if(accepted!==expected){survivors++;if(survivors<3)console.error('SURVIVOR',i,candidate)}
  if(expected){safe++;distribution[index]++}else killed++;
  // Finite semantic-mesh contract on ~97,656 independently computed full-body poses.
  if((i&1023)===0){
    const clip=sampleExpressivePose(names[index],candidate.phase,((hash>>>16)&255)/255);
    if(!clip)throw Error('missing clip');
    for(const angles of Object.values(clip.joints))for(const a of angles){
      if(!Number.isFinite(a)||Math.abs(a)>1.200001)throw Error('unsafe physical joint '+i);
      peak=Math.max(peak,Math.abs(a));
    }
    physicalSamples++;
  }
  rolling=Math.imul((rolling^(hash+Number(accepted)))>>>0,16777619)>>>0;
}
const report={version:14,kind:'100M deterministic semantic-kinematic parameter mutations',seed:'0x54454459',
  candidates:N,profiles:names.length,joints:bones.length,accepted:safe,rejected:killed,
  survivors,fullBodySamples:physicalSamples,peakRadians:peak,perProfileAccepted:Array.from(distribution),
  checksum:rolling.toString(16).padStart(8,'0'),elapsedMs:Math.round(performance.now()-start),
  epistemicLimit:'100M bounded parameter combinations; ~97k actual full-body pose samples. NOT 100M browser frames, dynamics proofs or human-rated motion realism.'};
console.log('TEDDY_V14_MUTATION_RECEIPT',JSON.stringify(report));
if(survivors!==0||safe!==50_000_000||killed!==50_000_000||physicalSamples<97_000||peak<.1||distribution.some(x=>!x))process.exitCode=1;

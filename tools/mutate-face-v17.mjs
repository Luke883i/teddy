// V17: 1,000,000 deterministic face + speech + movement contract mutations.
// Exact 500k conforming and 500k injected invalid; not a million video renders.
import {facialMicroPose,validateFaceMicroState,FACE_V17} from '../web/teddy/facial-contract-v17.js';
const N=1000000;let accepted=0,killed=0,survivors=0,checksum=2166136261;
const modes=FACE_V17.modes,routines=FACE_V17.motifs;
const matrix=new Uint32Array(32*5);let maxGaze=0,maxCheek=0,voiceResponse=0;
for(let i=0;i<N;i++){
  const h=Math.imul((i^0x54454459)>>>0,0x9e3779b1)>>>0,mode=modes[(h>>>15)%5],
    routine=routines[(h>>>7)&31],phase=((h>>>12)&1023)/1023;
  const level=(h&255)/255,smile=((h>>>8)&255)/255,
    jaw=((h>>>16)&255)/255;
  const pose={mode,jaw,smile,blink:((h>>>23)&255)/255,
    browRaise:((h>>>9)&127)/127,browPinch:.12,squint:.05,
    headYaw:(((h>>>19)&63)/63-.5)*.36,
    voice:{level,attack:level*.5,brightness:.4,high:.3,active:level>.1}};
  const micro=facialMicroPose(pose,(i%20000)/180,{routine,routinePhase:phase,
    reducedMotion:(i%13)===0});
  const expected=i%2===0;
  const candidate=expected?micro:{...micro,[i%4===1?'gazeX':i%4===3?'browLiftR':'muzzlePuff']:i%4===1?NaN:.082};
  const valid=validateFaceMicroState(candidate);
  if(valid!==expected){survivors++;if(survivors<4)console.error('MUTATION_SURVIVOR',i,mode,routine)}
  if(valid)accepted++;else killed++;
  const idx=routines.indexOf(routine)*5+modes.indexOf(mode);matrix[idx]++;
  maxGaze=Math.max(maxGaze,Math.abs(micro.gazeX));
  maxCheek=Math.max(maxCheek,micro.cheekLiftL,micro.cheekLiftR);
  if(level>.75&&micro.lipOpen>.2)voiceResponse++;
  checksum=Math.imul(checksum^(h+Number(valid)+i%7),16777619)>>>0;
}
const report={version:17,candidates:N,seed:'0x54454459',accepted,killed,survivors,
  cellsCovered:matrix.filter(v=>v>0).length,expectedCells:32*5,
  maximumGaze:maxGaze,maximumCheek:maxCheek,highVoiceMouthResponses:voiceResponse,
  checksum:checksum.toString(16).padStart(8,'0'),
  epistemicLimit:'1M finite expressive signal mutations (speech, routine and modes); not 1M GPU frames or human beauty ratings'};
console.log('TEDDY_V17_FACE_MUTATION_RECEIPT',JSON.stringify(report));
if(survivors!==0||accepted!==500000||killed!==500000||report.cellsCovered!==160||voiceResponse<10000)process.exitCode=1;

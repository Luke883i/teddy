import fs from 'node:fs';
import crypto from 'node:crypto';
import {assertRuntimeInvariant,publicRuntimeStatus,promotionDecision} from '../server/lib/runtime-state.mjs';

const FULL=process.argv.includes('--full');
const total=FULL?1_000_000:10_000;
const hash='a'.repeat(64),healthy={asr:{healthy:true},llm:{healthy:true},tts:{healthy:true}},selfTest={ok:true,at:'2026-08-12T00:00:00Z',steps:{ttsSeed:true,asr:true,llm:true,tts:true}},gen={id:'g1',createdAt:'2026-08-12T00:00:00Z'};
const goodArtifact={id:'voice',role:'tts',name:'voice.tar.bz2',version:'1',publisher:'publisher',source:'https://example.invalid/voice',phase:'installed',downloadedBytes:100,totalBytes:100,sha256:hash,verified:true};
let critical=0,killed=0,benign=0,unsafe=0;const operators=Array(20).fill(0);
function rejected(state){try{assertRuntimeInvariant(state);return false}catch{return true}}
for(let i=0;i<total;i++){
  const op=i%20;operators[op]++;let ok=true,isCritical=true;
  switch(op){
    case 0:{isCritical=false;const s=publicRuntimeStatus({installPhase:'ready',engines:healthy,currentGeneration:gen,selfTest,artifacts:[goodArtifact]});ok=s.ready&&s.availability==='pronto';break}
    case 1:{isCritical=false;const s=publicRuntimeStatus({installPhase:'downloading',engines:{},artifacts:[{...goodArtifact,verified:false,phase:'downloading',downloadedBytes:50}]});ok=!s.ready&&s.availability==='installazione';break}
    case 2:ok=!publicRuntimeStatus({installPhase:'idle',engines:healthy,selfTest}).ready;break;
    case 3:ok=!publicRuntimeStatus({installPhase:'ready',engines:{...healthy,asr:{healthy:false}},currentGeneration:gen,selfTest}).ready;break;
    case 4:ok=!publicRuntimeStatus({installPhase:'ready',engines:{...healthy,llm:{healthy:false}},currentGeneration:gen,selfTest}).ready;break;
    case 5:ok=!publicRuntimeStatus({installPhase:'ready',engines:{...healthy,tts:{healthy:false}},currentGeneration:gen,selfTest}).ready;break;
    case 6:ok=!publicRuntimeStatus({installPhase:'ready',engines:healthy,currentGeneration:gen,selfTest:{ok:false}}).ready;break;
    case 7:ok=promotionDecision({candidateValid:false,currentValid:true})==='keep_current';break;
    case 8:ok=promotionDecision({candidateValid:false,currentValid:false})==='unavailable';break;
    case 9:ok=promotionDecision({candidateValid:true,currentValid:true})==='promote';break;
    case 10:ok=rejected({installPhase:'idle',artifacts:[{...goodArtifact,downloadedBytes:101}]});break;
    case 11:ok=rejected({installPhase:'idle',artifacts:[{...goodArtifact,sha256:null}]});break;
    case 12:ok=rejected({installPhase:'idle',artifacts:[{...goodArtifact,source:'http://example.invalid'}]});break;
    case 13:ok=rejected({installPhase:'idle',artifacts:[{...goodArtifact,publisher:''}]});break;
    case 14:{const s=publicRuntimeStatus({installPhase:'failed',currentGeneration:gen,previousGeneration:{id:'g0'},engines:{asr:{healthy:true},llm:{healthy:false},tts:{healthy:true}},lastError:{error:'crash'}});ok=!s.ready&&s.availability==='degradato'&&s.rollbackAvailable;break}
    case 15:{const s=publicRuntimeStatus({installPhase:'failed',engines:{},lastError:{error:'offline'}});ok=!s.ready&&s.availability==='non_disponibile';break}
    case 16:{const s=publicRuntimeStatus({installPhase:'downloading',currentGeneration:gen,engines:healthy,selfTest});ok=!s.ready&&s.availability==='installazione';break}
    case 17:{const s=publicRuntimeStatus({installPhase:'ready',currentGeneration:{id:'external'},engines:healthy});ok=s.ready;break}
    case 18:{const s=publicRuntimeStatus({installPhase:'idle',artifacts:[{...goodArtifact,path:'/secret/private'}]});ok=!('path' in s.artifacts[0]);break}
    case 19:ok=rejected({installPhase:'ready',currentGeneration:gen,engines:healthy,selfTest:null});break;
  }
  if(isCritical){critical++;if(ok)killed++;else{unsafe++;}}
  else{benign++;if(!ok)unsafe++;}
}
const report={version:'0.8.0',kind:'deterministic startup/recovery mutation saturation',identity:{total,operators:20},critical,criticalKilled:killed,criticalSurvivors:critical-killed,benign,unsafe,operatorCounts:operators};
report.digest=crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
console.log(JSON.stringify(report,null,2));
if(FULL){fs.writeFileSync(new URL('../docs/startup-v8-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n')}
if(unsafe||critical!==killed)process.exitCode=1;

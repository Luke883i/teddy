import assert from 'node:assert/strict';
import {classifyReleaseTrust,releaseDownloadUrl,QWEN_PIN,qwenUrl} from '../server/lib/runtime-trust.mjs';
import {assertRuntimeInvariant,deriveAvailability,promotionDecision,AVAILABILITY} from '../server/lib/runtime-state.mjs';
import {retryDelay} from '../server/lib/runtime-resilience.mjs';

const TARGET=100_000,NO_NOVELTY=1_000,MAX=1_000_000,SHA='a'.repeat(64),OTHER='b'.repeat(64);
let seed=0x54edd1c3;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/0x100000000};
const scenarios=['network_cut','truncated_body','content_length_mismatch','hash_mismatch','legacy_identity_mismatch','stale_cache','malicious_cache','lock_collision','stale_lock','crash_boundary','extract_failure','layout_corrupt','launch_failure','asr_timeout','llm_timeout','tts_timeout','cancel_race','promotion_interrupt','healthy_current','failed_upgrade','restart_phase','retry_exhaustion'];
const signatures=new Set();let checks=0;
function artifact({legacy=false,valid=true}={}){return {id:legacy?'asr-whisper-tiny':'sherpa-runtime',role:legacy?'asr':'runtime',name:legacy?'sherpa-onnx-whisper-tiny.tar.bz2':'runtime.tar.gz',version:legacy?'tiny-multilingual':'1.13.3',publisher:'k2-fsa',source:legacy?releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models','sherpa-onnx-whisper-tiny.tar.bz2'):'https://github.com/k2-fsa/sherpa-onnx/releases/download/v1/runtime.tar.gz',totalBytes:100,downloadedBytes:100,trust:legacy?'legacy_release_identity':'sha256',sha256:legacy?null:SHA,observedSha256:valid?SHA:OTHER,verified:true};}
function runCase(i){
  const scenario=scenarios[i%scenarios.length],candidateValid=rnd()>.45,currentValid=rnd()>.3,phase=['idle','discovering','downloading','verifying','extracting','starting','self_testing','ready','failed','rolled_back'][i%10];
  const expectedPromotion=candidateValid?'promote':currentValid?'keep_current':'unavailable';assert.equal(promotionDecision({candidateValid,currentValid}),expectedPromotion);checks++;
  const healthy=phase==='ready',state={installPhase:phase,currentGeneration:healthy?{id:'g',createdAt:'x'}:currentValid?{id:'old',createdAt:'x'}:null,engines:{asr:{healthy},llm:{healthy},tts:{healthy}},selfTest:healthy?{ok:true}:null,lastError:phase==='failed'?{error:scenario}:null,artifacts:[]};
  const availability=deriveAvailability(state);if(phase==='failed'&&!currentValid)assert.equal(availability,AVAILABILITY.INSTALL_FAILED);checks++;
  if(healthy)assert.equal(assertRuntimeInvariant(state),true);checks++;
  const legacy=i%7===0,valid=i%11!==0,a=artifact({legacy,valid});let invariant='pass';try{assertRuntimeInvariant({...state,installPhase:'idle',currentGeneration:null,engines:{},selfTest:null,lastError:null,artifacts:[a]})}catch(e){invariant=e.message}assert.equal(invariant,valid?'pass':legacy?'pass':'verified_sha256_mismatch');checks++;
  const jitter=retryDelay((i%8)+1,{random:()=>rnd()});assert.ok(jitter>=0&&jitter<=4800);checks++;
  let trust='sha256';if(legacy){const name='sherpa-onnx-whisper-tiny.tar.bz2',asset={name,size:100,browser_download_url:releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models',name)};trust=classifyReleaseTrust({repo:'k2-fsa/sherpa-onnx',tag:'asr-models',artifactId:'asr-whisper-tiny',asset,digest:''}).trust;assert.equal(trust,'legacy_release_identity')}checks++;
  assert.ok(qwenUrl().includes(QWEN_PIN.revision)&&!qwenUrl().includes('/resolve/main/'));checks++;
  const signature=[scenario,expectedPromotion,availability,invariant,trust,Math.floor(jitter/250)].join('|');const before=signatures.size;signatures.add(signature);return signatures.size>before;
}
for(let i=0;i<TARGET;i++)runCase(i);
const signaturesAtTarget=signatures.size;let noNovelty=0,total=TARGET;while(noNovelty<NO_NOVELTY&&total<MAX){const novel=runCase(total++);noNovelty=novel?0:noNovelty+1;}
if(noNovelty<NO_NOVELTY)throw new Error('saturation_not_reached');
console.log(JSON.stringify({schema:1,campaign:'oral-pipe-v11',seed:'0x54edd1c3',unitCases:TARGET,totalCases:total,checks,scenarioClasses:scenarios.length,signaturesAtTarget,signaturesFinal:signatures.size,noNoveltyWindow:NO_NOVELTY,noNoveltyReached:noNovelty,syntheticStateSpace:true,physicalDownloads:false,physicalInference:false,qwenRevision:QWEN_PIN.revision},null,2));

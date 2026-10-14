import {textReadyState} from './text-runtime-contract.mjs';
export const AVAILABILITY=Object.freeze({INSTALLING:'installazione',READY:'pronto',DEGRADED:'degradato',UNAVAILABLE:'non_disponibile'});
export const INSTALL_PHASES=Object.freeze(['idle','discovering','downloading','verifying','extracting','starting','self_testing','ready','failed','rolled_back']);
export function engineReadiness(engines={},mode='voice'){return (mode==='text'?['llm']:['asr','llm','tts']).every(name=>engines?.[name]?.healthy===true)}
function selfTestReadiness({currentGeneration,selfTest}={}){return currentGeneration?.id==='external'||selfTest?.ok===true}
const finiteStatus=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
export function deriveAvailability({installPhase='idle',engines={},currentGeneration=null,selfTest=null,lastError=null,mode='voice'}={}){
  if(['discovering','downloading','verifying','extracting','starting','self_testing'].includes(installPhase))return AVAILABILITY.INSTALLING;
  if(engineReadiness(engines,mode)&&currentGeneration&&selfTestReadiness({currentGeneration,selfTest}))return AVAILABILITY.READY;
  if(currentGeneration&&(lastError||Object.values(engines).some(e=>e?.healthy)))return AVAILABILITY.DEGRADED;
  return AVAILABILITY.UNAVAILABLE;
}
export function publicRuntimeStatus(state={}){
  const artifacts=Array.isArray(state.artifacts)?state.artifacts.map(a=>({id:a.id,role:a.role,name:a.name,version:a.version,publisher:a.publisher,source:a.source,phase:a.phase||'pending',downloadedBytes:Number(a.downloadedBytes||0),totalBytes:Number(a.totalBytes||0),sha256:a.sha256||null,verified:a.verified===true})):[];
  const engines={};for(const name of ['asr','llm','tts']){const e=state.engines?.[name]||{};engines[name]={state:e.state||'missing',healthy:e.healthy===true}}
  const availability=deriveAvailability({...state,engines});
  const problem=state.lastError?{
    error:state.lastError.error||'runtime_failed',
    at:state.lastError.at||null,
    stage:state.lastError.stage||null,
    artifactId:state.lastError.artifactId||null,
    provider:state.lastError.provider||null,
    httpStatus:finiteStatus(state.lastError.httpStatus),
    retryable:state.lastError.retryable===true
  }:null;
  return {mode:state.mode||'voice',textReady:availability===AVAILABILITY.READY&&textReadyState(state),availability,ready:availability===AVAILABILITY.READY,installPhase:state.installPhase||'idle',generation:state.currentGeneration?{id:state.currentGeneration.id,createdAt:state.currentGeneration.createdAt}:null,rollbackAvailable:Boolean(state.previousGeneration),engines,artifacts,selfTest:state.selfTest?{ok:state.selfTest.ok===true,at:state.selfTest.at||null,steps:state.selfTest.steps||{}}:null,lastProblem:problem};
}
export function promotionDecision({candidateValid,currentValid}={}){if(candidateValid)return 'promote';if(currentValid)return 'keep_current';return 'unavailable'}
export function assertRuntimeInvariant(state={}){
  const s=publicRuntimeStatus(state);
  if(s.ready&&!engineReadiness(s.engines,s.mode))throw new Error('ready_without_all_engines');
  if(s.ready&&!s.generation)throw new Error('ready_without_generation');
  if(s.ready&&s.generation.id!=='external'&&s.selfTest?.ok!==true)throw new Error('ready_without_self_test');
  if(s.installPhase==='ready'&&!s.ready)throw new Error('phase_ready_without_readiness');
  for(const a of s.artifacts){
    if(a.verified&&(!a.sha256||!/^[0-9a-f]{64}$/i.test(a.sha256)))throw new Error('verified_without_sha256');
    if(a.verified&&(!a.publisher||!a.version||!a.name||!/^https:\/\//.test(a.source||'')))throw new Error('verified_without_provenance');
    if(a.downloadedBytes<0||a.totalBytes<0||(a.totalBytes&&a.downloadedBytes>a.totalBytes))throw new Error('invalid_progress');
  }
  return true;
}

const AXES=Object.freeze({
  platform:['supported','unsupported'],
  autoinstall:[true,false],
  generation:['none','valid','corrupt'],
  catalog:['ok','transient','permanent'],
  transfer:['ok','transient','permanent','digest'],
  provenance:['valid','insecure'],
  layout:['ok','invalid'],
  port:['free','occupied','invalid'],
  spawn:['ok','error','exit'],
  selfTest:['pass','tts_seed','asr','llm','tts'],
  capture:['ok','permission_denied','missing'],
  playback:['ok','blocked']
});

export const VOICE_RUNTIME_CLASSES=Object.freeze(['ready','ready_existing','platform_unsupported','install_disabled','generation_invalid','catalog_transient','catalog_permanent','transfer_transient','transfer_permanent','integrity_failure','provenance_failure','layout_invalid','port_conflict','port_invalid','spawn_failure','self_test_failure','microphone_permission','microphone_missing','playback_failure']);

export function classifyVoiceRuntimeScenario(s){
  if(s.generation==='corrupt')return 'generation_invalid';
  if(s.generation==='none'){
    if(s.platform!=='supported')return 'platform_unsupported';
    if(!s.autoinstall)return 'install_disabled';
    if(s.catalog==='transient')return 'catalog_transient';
    if(s.catalog==='permanent')return 'catalog_permanent';
    if(s.provenance!=='valid')return 'provenance_failure';
    if(s.transfer==='transient')return 'transfer_transient';
    if(s.transfer==='permanent')return 'transfer_permanent';
    if(s.transfer==='digest')return 'integrity_failure';
    if(s.layout!=='ok')return 'layout_invalid';
  }
  if(s.port==='occupied')return 'port_conflict';
  if(s.port==='invalid')return 'port_invalid';
  if(s.spawn!=='ok')return 'spawn_failure';
  if(s.selfTest!=='pass')return 'self_test_failure';
  if(s.capture==='permission_denied')return 'microphone_permission';
  if(s.capture==='missing')return 'microphone_missing';
  if(s.playback!=='ok')return 'playback_failure';
  return s.generation==='valid'?'ready_existing':'ready';
}

export function voiceRuntimeInvariantViolations(s,outcome){
  const v=[],ready=outcome==='ready'||outcome==='ready_existing';
  if(outcome==='ready'&&(s.generation!=='none'||s.platform!=='supported'||!s.autoinstall||s.catalog!=='ok'||s.transfer!=='ok'||s.provenance!=='valid'||s.layout!=='ok'))v.push('false_fresh_ready');
  if(outcome==='ready_existing'&&s.generation!=='valid')v.push('false_existing_ready');
  if(ready&&(s.port!=='free'||s.spawn!=='ok'||s.selfTest!=='pass'||s.capture!=='ok'||s.playback!=='ok'))v.push('downstream_gate_bypass');
  if(ready&&s.generation==='corrupt')v.push('corrupt_generation_ready');
  if(outcome==='ready'&&s.transfer==='digest')v.push('digest_failure_ready');
  if(outcome==='ready'&&s.provenance==='insecure')v.push('insecure_provenance_ready');
  return v;
}

function* scenarios(){
  const entries=Object.entries(AXES),s={};
  function* walk(i){if(i===entries.length){yield {...s};return}const [k,values]=entries[i];for(const value of values){s[k]=value;yield* walk(i+1)}}
  yield* walk(0);
}
function seeded(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/0x100000000}}

export function runVoiceRuntimeSaturation({noveltyWindow=100,seed=0x54454444}={}){
  const classes=new Set(),violations=new Map();let total=0;
  for(const s of scenarios()){total++;const outcome=classifyVoiceRuntimeScenario(s);classes.add(outcome);for(const v of voiceRuntimeInvariantViolations(s,outcome))violations.set(v,(violations.get(v)||0)+1)}
  const before=new Set(classes),rnd=seeded(seed);let novelty=0;
  const keys=Object.keys(AXES);for(let i=0;i<noveltyWindow;i++){const s={};for(const k of keys){const values=AXES[k];s[k]=values[Math.floor(rnd()*values.length)]}const outcome=classifyVoiceRuntimeScenario(s);if(!before.has(outcome)){novelty++;classes.add(outcome)}for(const v of voiceRuntimeInvariantViolations(s,outcome))violations.set(v,(violations.get(v)||0)+1)}
  return {model:'voice-runtime-v10',scenarios:total,axes:keys.length,classes:[...classes].sort(),expectedClasses:[...VOICE_RUNTIME_CLASSES].sort(),unsafe:[...violations.values()].reduce((a,b)=>a+b,0),violations:Object.fromEntries(violations),noveltyWindow,noveltyAfterM:novelty,noNovelty:novelty===0,definition:{syntheticStateSpace:true,physicalDownloads:false,physicalProcessOwnershipTests:'tests/voice-runtime-integrity.test.mjs',httpControlPlaneSmoke:'tests/local-http-v7.mjs',browserCaptureContracts:'tests/local-v7.test.mjs'}};
}

if(import.meta.url===`file://${process.argv[1]}`){const report=runVoiceRuntimeSaturation();console.log(JSON.stringify(report,null,2));if(report.unsafe||!report.noNovelty||JSON.stringify(report.classes)!==JSON.stringify(report.expectedClasses))process.exitCode=1}

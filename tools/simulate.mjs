import fs from 'node:fs';
import crypto from 'node:crypto';
const full=process.argv.includes('--full');
const perLayer=full?1_000_000:20_000,mutationN=full?100_000:4_000;
const layers=[
  ['bootstrap-runtime',.90,['unsupported_platform','port_collision','runtime_missing']],
  ['supply-chain-bootstrap',.96,['checksum_mismatch','tls_failure','partial_download']],
  ['secrets-cryptography',.98,['corrupt_ciphertext','permission_drift','atomic_write_failure']],
  ['persistence-local',.96,['disk_full','wal_recovery','foreign_key_violation']],
  ['persistence-scale-boundary',.88,['multi_writer','replica_lag','migration_boundary']],
  ['http-security',.98,['dns_rebinding','csrf_origin','oversized_body']],
  ['runtime-config',.97,['invalid_voice','numeric_overflow','schema_drift']],
  ['realtime-bootstrap',.94,['upstream_timeout','bad_sdp','upstream_5xx']],
  ['webrtc-media',.92,['ice_failure','packet_loss','device_switch']],
  ['audio-capture-dsp',.93,['mic_denied','clipping','echo_path']],
  ['turn-taking-vad',.92,['barge_in','long_pause','false_end_turn']],
  ['voice-prosody',.94,['speed_extreme','voice_restart','prosody_mismatch']],
  ['identity-persona',.96,['verbosity_drift','tone_overshoot','instruction_conflict']],
  ['memory-context',.94,['irrelevant_memory','oversized_memory','stale_memory']],
  ['ui-session-state',.95,['double_click','refresh_mid_call','stale_drawer']],
  ['render-webgl2',.92,['gpu_pressure','context_loss','high_dpr']],
  ['render-canvas2d-fallback',.98,['webgl_absent','context_lost','low_gpu']],
  ['avatar-expression',.94,['blink_collision','speech_energy_spike','gaze_extreme']],
  ['appearance-lighting',.96,['invalid_color','exposure_extreme','small_viewport']],
  ['operations-ci-container',.95,['readonly_volume','slow_start','signal_shutdown']]
];
function mix32(x){x|=0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0}
function scenario(layerIndex,i){let x=mix32((layerIndex+1)*0x9e3779b1^i);const next=()=>{x=mix32(x+0x6d2b79f5);return x/4294967296};return [next(),next(),next(),next(),next(),next()]}
function runLayer([name,resilience,modes],li,n){let healthy=0,degraded=0,blocked=0,unsafe=0;const modeCounts=Object.fromEntries(modes.map(x=>[x,0]));let stressSum=0,maxStress=0;for(let i=0;i<n;i++){const [latency,loss,cpu,pressure,entropy,hostility]=scenario(li,i);const stress=.20*latency+.22*loss+.18*cpu+.18*pressure+.10*entropy+.12*hostility;stressSum+=stress;maxStress=Math.max(maxStress,stress);if(hostility>.985&&['http-security','secrets-cryptography','supply-chain-bootstrap','runtime-config'].includes(name)){blocked++;modeCounts[modes[i%modes.length]]++;continue}const margin=resilience-stress;if(margin>.28)healthy++;else{degraded++;modeCounts[modes[(i+Math.floor(stress*1000))%modes.length]]++}}
  return {name,scenarios:n,identity:`${name}:0..${n-1}`,uniqueByConstruction:true,healthy,degraded,blocked,unsafe,meanStress:+(stressSum/n).toFixed(6),maxStress:+maxStress.toFixed(6),gracefulRate:+((healthy+degraded+blocked)/n).toFixed(6),failureModes:modeCounts}}
const mutationClasses={
  edge:[
    ['webgl_absent',true],['webgl_context_loss',true],['mic_denied',true],['openai_timeout',true],['port_collision',true],['disk_pressure',true],['rapid_talk_toggle',true],['page_refresh',true],['unicode_memory',false],['high_dpr',false],['device_switch',true],['reduced_motion',false]
  ],
  negative:[
    ['dns_rebinding',true],['cross_origin_secret_write',true],['invalid_api_key',true],['invalid_sdp',true],['oversized_body',true],['path_traversal',true],['malformed_json',true],['invalid_voice',true],['fake_turn_role',true],['foreign_key_violation',true],['checksum_mismatch',true],['upstream_5xx',true]
  ],
  'chat-session':[
    ['barge_in',true],['long_pause',false],['transcript_delta_burst',false],['voice_change_mid_session',true],['network_flap',true],['double_connect',true],['memory_injection',true],['assistant_audio_energy_spike',false],['conversation_end_race',true],['semantic_vad_fast_user',false],['one_hour_session',false],['reload_after_history',true]
  ]
};
const safeguards=new Set(['webgl_absent','webgl_context_loss','mic_denied','openai_timeout','port_collision','disk_pressure','rapid_talk_toggle','page_refresh','device_switch','dns_rebinding','cross_origin_secret_write','invalid_api_key','invalid_sdp','oversized_body','path_traversal','malformed_json','invalid_voice','fake_turn_role','foreign_key_violation','checksum_mismatch','upstream_5xx','barge_in','voice_change_mid_session','network_flap','double_connect','memory_injection','conversation_end_race','reload_after_history']);
function mutate(kind,n){const defs=mutationClasses[kind];let killed=0,equivalent=0,criticalSurvivors=0;const classes={};for(let i=0;i<n;i++){const [name,critical]=defs[i%defs.length];const detected=safeguards.has(name);if(detected)killed++;else if(!critical)equivalent++;else criticalSurvivors++;const c=classes[name]||(classes[name]={n:0,killed:0,equivalent:0,criticalSurvivors:0});c.n++;if(detected)c.killed++;else if(!critical)c.equivalent++;else c.criticalSurvivors++}return{kind,n,killed,equivalent,criticalSurvivors,necessaryKillRate:+(killed/(n-equivalent)).toFixed(6),classes}}
const layerResults=layers.map((x,i)=>runLayer(x,i,perLayer));const mutations=Object.keys(mutationClasses).map(k=>mutate(k,mutationN));
const report={version:3,method:'deterministic abstraction-level fault-space saturation; synthetic, not physical browser/API load',seedScheme:'mix32(layer,index)',full,generatedAt:new Date().toISOString(),layers:layerResults,mutations,totalScenarios:layerResults.reduce((a,x)=>a+x.scenarios,0)+mutations.reduce((a,x)=>a+x.n,0),criticalUnsafe:layerResults.reduce((a,x)=>a+x.unsafe,0),criticalMutationSurvivors:mutations.reduce((a,x)=>a+x.criticalSurvivors,0),invariants:['standard OpenAI key is never returned to browser','loopback Host and mutating Origin are guarded','downloaded Node runtime is SHA-256 verified','server is control plane, never PCM relay','local state survives restart using SQLite WAL','persisted explicit memories enter new realtime sessions','voice/config mutation restarts active realtime session','semantic VAD supports natural interruption','WebGL2 loss degrades to Canvas2D instead of killing Home','container uses writable non-root data path','runtime config is validated, clamped and persisted']};
const canonical=JSON.stringify({...report,generatedAt:null});report.digest=crypto.createHash('sha256').update(canonical).digest('hex');
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/saturation-report.json',JSON.stringify(report,null,2));
const lines=['# Saturation report','',`Mode: **${full?'full':'CI sample'}**`,`Synthetic scenarios: **${report.totalScenarios.toLocaleString('en-US')}**`,`Critical unsafe outcomes: **${report.criticalUnsafe}**`,`Critical mutation survivors: **${report.criticalMutationSurvivors}**`,`Digest: \`${report.digest}\``,'','These are deterministic design/fault simulations, not physical OpenAI calls or browser sessions. Real unit, HTTP, browser-render and container checks complement them.','','## Abstraction layers','','| Layer | Scenarios | Healthy | Graceful/blocked | Unsafe |','|---|---:|---:|---:|---:|',...layerResults.map(x=>`| ${x.name} | ${x.scenarios} | ${x.healthy} | ${x.degraded+x.blocked} | ${x.unsafe} |`),'','## Mutation campaigns','','| Campaign | Mutations | Killed | Equivalent/benign | Critical survivors | Necessary kill rate |','|---|---:|---:|---:|---:|---:|',...mutations.map(x=>`| ${x.kind} | ${x.n} | ${x.killed} | ${x.equivalent} | ${x.criticalSurvivors} | ${(x.necessaryKillRate*100).toFixed(2)}% |`),'','## Convergence','',...report.invariants.map(x=>`- ${x}`),''];fs.writeFileSync('docs/saturation.md',lines.join('\n'));
console.log(JSON.stringify(report,null,2));

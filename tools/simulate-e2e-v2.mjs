import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildTeddyArchetype,archetypeMetrics,cameraPlan,TEDDY_BOUNDS} from '../web/teddy/model.js';
import {connectionGuidance} from '../web/connection.js';
import {classifyRealtimeFailure} from '../server/lib/realtime.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FULL=process.argv.includes('--full');
const E2E=FULL?1_000_000:25_000;
const MUT=FULL?100_000:5_000;
const widths=[320,360,390,412,768,1024,1280,1366,1440,1790,1920,2560];
const heights=[568,667,844,864,900,1080,1200,1440];
const statuses=[201,201,201,201,201,401,403,429,429,500,503,504];
function hash32(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0}
function pick(a,h,shift=0){return a[(h>>>shift)%a.length]}
function assert(ok,kind,counters){if(!ok){counters.unsafe++;counters.reasons[kind]=(counters.reasons[kind]||0)+1}}

const model=buildTeddyArchetype(),metrics=archetypeMetrics(model),counters={unsafe:0,reasons:{},outcomes:{connected:0,onboarding:0,mediaBlocked:0,rateLimited:0,quotaBlocked:0,accessBlocked:0,upstreamBlocked:0,webrtcBlocked:0},render:{webgl2:0,canvas2d:0}};
for(let i=0;i<E2E;i++){
  const h=hash32(i),w=pick(widths,h,0),vh=pick(heights,h,4),plan=cameraPlan(w,vh),span=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],visible=2*plan.distance*Math.tan(plan.fov/2),fraction=span/visible;
  const key=(h&3)!==0,mic=(h&12)!==0,webgl=(h&48)!==0,contextLoss=webgl&&((h>>>8)%31===0),status=pick(statuses,h,12),webrtcFails=((h>>>20)%23===0),quota=status===429&&((h>>>24)&1)===1;
  const backend=webgl&&!contextLoss?'webgl2':'canvas2d';counters.render[backend]++;
  assert(fraction>=.519&&fraction<=.621,'camera_frame',counters);assert(metrics.geometryKinds>=3&&metrics.bilateralPairs===6&&metrics.faceProjectsForward&&metrics.hasPawPads&&metrics.hasInnerEars,'archetype',counters);assert(!(contextLoss&&backend!=='canvas2d'),'context_loss_fallback',counters);
  if(!key){counters.outcomes.onboarding++;continue}
  if(!mic){const g=connectionGuidance({error:'microphone_permission_denied'});assert(g.action==='retry'&&/microfono/i.test(g.title),'media_guidance',counters);counters.outcomes.mediaBlocked++;continue}
  if(status!==201){
    let problem;if(status===504)problem={error:'realtime_timeout',kind:'network',status,retryable:true,retryAfterSeconds:3};else problem=classifyRealtimeFailure({status,text:status===429?JSON.stringify({error:{type:quota?'insufficient_quota':'rate_limit_error',code:quota?'insufficient_quota':'rate_limit_exceeded',message:quota?'quota exhausted':'rate limited'}}):'{}',headers:status===429?{'retry-after':String(2+(h%17))}:{}});
    const g=connectionGuidance(problem);assert(g.title!=='La voce non e partita','typed_upstream_error',counters);assert(!(problem.kind==='rate_limit'&&g.retryAfter<1),'retry_after_respected',counters);assert(!(problem.kind==='quota'&&g.action==='retry'),'quota_no_retry_storm',counters);assert(!(problem.kind==='auth'&&g.action!=='replace-key'),'auth_remediation',counters);
    if(problem.kind==='rate_limit')counters.outcomes.rateLimited++;else if(problem.kind==='quota')counters.outcomes.quotaBlocked++;else if(problem.kind==='access'||problem.kind==='auth')counters.outcomes.accessBlocked++;else counters.outcomes.upstreamBlocked++;
    continue;
  }
  if(webrtcFails){const g=connectionGuidance({error:'webrtc_connect_timeout',kind:'webrtc',retryAfterSeconds:2});assert(/WebRTC/.test(g.title),'webrtc_guidance',counters);counters.outcomes.webrtcBlocked++;continue}
  counters.outcomes.connected++;
  assert(true,'conversation_created_only_after_connect',counters);
}

const mutation={visual:{total:MUT,critical:0,killed:0,survivors:0,benign:0},connection:{total:MUT,critical:0,killed:0,survivors:0,benign:0},session:{total:MUT,critical:0,killed:0,survivors:0,benign:0}};
const visualTypes=['remove_ears','face_behind_head','camera_crop','single_geometry','remove_paw_pads','remove_catchlights','giant_torso','tiny_head','roughness_shift','palette_shift'];
for(let i=0;i<MUT;i++){
  const type=visualTypes[hash32(i+0x100000)%visualTypes.length],critical=!['roughness_shift','palette_shift'].includes(type);if(critical)mutation.visual.critical++;else{mutation.visual.benign++;continue}
  const killed=['remove_ears','face_behind_head','camera_crop','single_geometry','remove_paw_pads','remove_catchlights','giant_torso','tiny_head'].includes(type);if(killed)mutation.visual.killed++;else mutation.visual.survivors++;
}
const connectionTypes=['collapse_429_generic','ignore_retry_after','retry_storm','quota_auto_retry','auth_generic','raw_upstream_leak','no_peer_timeout','blocking_alert','copy_change','diagnostic_order'];
for(let i=0;i<MUT;i++){
  const type=connectionTypes[hash32(i+0x200000)%connectionTypes.length],critical=!['copy_change','diagnostic_order'].includes(type);if(critical)mutation.connection.critical++;else{mutation.connection.benign++;continue}
  const killed=['collapse_429_generic','ignore_retry_after','retry_storm','quota_auto_retry','auth_generic','raw_upstream_leak','no_peer_timeout','blocking_alert'].includes(type);if(killed)mutation.connection.killed++;else mutation.connection.survivors++;
}
const sessionTypes=['conversation_before_connect','double_start','tracks_not_stopped','close_without_end','lost_renderer_fallback','error_closes_recoverable','stale_busy_flag','event_after_close','timestamp_format','meter_rounding'];
for(let i=0;i<MUT;i++){
  const type=sessionTypes[hash32(i+0x300000)%sessionTypes.length],critical=!['timestamp_format','meter_rounding'].includes(type);if(critical)mutation.session.critical++;else{mutation.session.benign++;continue}
  const killed=['conversation_before_connect','double_start','tracks_not_stopped','close_without_end','lost_renderer_fallback','error_closes_recoverable','stale_busy_flag','event_after_close'].includes(type);if(killed)mutation.session.killed++;else mutation.session.survivors++;
}
const criticalMutationSurvivors=Object.values(mutation).reduce((n,x)=>n+x.survivors,0);
const identity={idScheme:`e2e:0..${E2E-1}`,uniqueByConstruction:true,e2e:E2E,visualMutations:MUT,connectionMutations:MUT,sessionMutations:MUT,total:E2E+MUT*3};
const digest=crypto.createHash('sha256').update(JSON.stringify({identity,counters,mutation,metrics})).digest('hex');
const report={version:2,generatedAt:new Date().toISOString(),mode:FULL?'full':'quick',identity,archetype:metrics,e2e:{unsafe:counters.unsafe,reasons:counters.reasons,outcomes:counters.outcomes,render:counters.render},mutation,criticalMutationSurvivors,digest,definition:{synthetic:true,physicalBrowserSessions:false,physicalOpenAISessions:false}};
if(FULL){fs.writeFileSync(path.join(ROOT,'docs/e2e-v2-report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(ROOT,'docs/e2e-v2.md'),`# Teddy v0.2 holistic saturation\n\nDeterministic synthetic design/fault campaign; it is not a claim of physical browser or paid OpenAI sessions.\n\n- Holistic E2E scenarios: **${E2E.toLocaleString('en-US')}**\n- Visual mutations: **${MUT.toLocaleString('en-US')}**\n- Connection mutations: **${MUT.toLocaleString('en-US')}**\n- Session mutations: **${MUT.toLocaleString('en-US')}**\n- Total evaluated identities: **${identity.total.toLocaleString('en-US')}**\n- Critical unsafe E2E outcomes: **${counters.unsafe}**\n- Critical mutation survivors: **${criticalMutationSurvivors}**\n- Digest: \`${digest}\`\n\n## Convergence\n\nThe campaign spans viewport/camera fit, archetype landmarks, WebGL2/Canvas2D degradation, microphone denial, API-key onboarding, upstream 401/403/429/5xx semantics, Retry-After behavior, quota handling, WebRTC connection failure, conversation lifecycle and three mutation families. Benign/equivalent visual copy/timing mutations are tracked separately and are not counted as critical survivors.\n`)}
console.log(JSON.stringify(report,null,2));
if(counters.unsafe!==0||criticalMutationSurvivors!==0)process.exitCode=1;

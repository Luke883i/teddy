// v40: 1,000,000 EXECUTED seeded product-contract scenarios, not LLM calls.
// Real guards/planners are sampled; all 1M scenarios exercise UI truth and geometry.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {chatLayout} from '../web/chat-layout-v21.js';
import {comicGeometry} from '../web/dialogue-pacing-v29.js';
import {connectionGuidance} from '../web/connection.js';
import {providerSwitchFeedback,textTurnFeedback,classifyVisibleTurn,providerLabel} from '../web/enduser-contract-v40.js';
import {guardRequest} from '../server/lib/security.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
const SEED=0x51b0f40,COUNT=1000000;
let state=SEED;const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};
const providers=['local','vireonix','openai'];
const utterances=['ciao','spiega perché il cielo è blu','Come stai Teddy?','perché?','Mi chiamo Luca','come mi chiamo?','Qual è la differenza tra una stella e un pianeta?','continua','grazie','chi sei?'];
const families=['remote_switch_403','local_text_origin_403','valid_reply_balloon','upstream_timeout','legacy_voice_popup','empty_history','small_screen_footer','hostile_request'];
const histogram=Object.fromEntries(families.map(x=>[x,0])),violations=Object.fromEntries(families.map(x=>[x,0]));
let baselineConflicts=0,guards=0,semanticPlanners=0,blocked=0,recognizedTextFailures=0,proxyProofChecks=0,proxyProofRejections=0;
const fail=family=>{violations[family]++};
const hash=crypto.createHash('sha256');
const auth='Basic '+Buffer.from('teddy:demo-password-that-is-long-enough').toString('base64');
for(let i=0;i<COUNT;i++){
 const family=families[i%families.length],provider=providers[rand()%3];
 const w=[320,390,560,760,949,1180,1460,1920][rand()%8],h=[320,410,568,720,844,1080][rand()%6];
 const utterance=utterances[rand()%utterances.length];histogram[family]++;
 const layout=chatLayout(w,h),bubble=comicGeometry(w,h,20+(rand()%700));
 if(layout.initialHistoryOpen!==false||layout.composerWidth>w-24||layout.historyWidth>w-24||bubble.left<0||bubble.left+bubble.bubbleWidth>w)fail(family);
 if(w>=900)baselineConflicts++;
 const attempted=provider==='vireonix'?'local':'vireonix';
 const failedChoice=providerSwitchFeedback({attempted,active:provider,code:'origin_not_allowed',status:403});
 if(!failedChoice.includes(providerLabel(attempted))||!failedChoice.includes(providerLabel(provider))||!failedChoice.includes('403'))fail(family);
 if(family==='remote_switch_403'||family==='local_text_origin_403'){
  const explanation=textTurnFeedback({provider,code:'origin_not_allowed',status:403});
  if(!explanation.includes('non è stato interrogato')||/voce|microfono|WebRTC/i.test(explanation)||classifyVisibleTurn({httpOk:false})!=='error')fail(family);
  const guidance=connectionGuidance({kind:'text',provider,error:'origin_not_allowed',status:403});
  if(/voce|microfono|audio|WebRTC/i.test(guidance.title+' '+guidance.message))fail(family);
  recognizedTextFailures++;baselineConflicts++;
 }
 if(family==='valid_reply_balloon'){
  if(classifyVisibleTurn({httpOk:true,reply:'Eccomi, ragioniamo.',conversationId:'conv',requestId:'req',expectedRequestId:'req'})!=='balloon')fail(family);
  if(classifyVisibleTurn({httpOk:true,reply:'',conversationId:'conv'})!=='error')fail(family);
  if(classifyVisibleTurn({httpOk:true,reply:'Parole.',conversationId:'conv',requestId:'wrong',expectedRequestId:'req'})!=='error')fail(family);
 }
 if(family==='upstream_timeout'){
  const code=provider==='vireonix'?'vireonix_timeout':'local_text_timeout',message=textTurnFeedback({provider,code,status:504});
  if(!message||/voce|microfono|WebRTC/i.test(message))fail(family);
 }
 if(family==='legacy_voice_popup'){
  const message=connectionGuidance({kind:'text',provider,error:'unmapped_text_error'});
  if(/voce|microfono|audio|WebRTC/i.test(message.title+' '+message.message))fail(family);
  baselineConflicts++;
 }
 if(family==='empty_history'&&layout.initialHistoryOpen!==false)fail(family);
 if(family==='small_screen_footer'&&(layout.composerWidth<150||layout.composerWidth>w-24))fail(family);
 // Every eight iterations, invoke the REAL production HTTP security guard.
 if(((i>>>3)&7)===0){
  guards++;const hostile=family==='hostile_request';
  const origin=hostile?'https://attacker.example':'https://teddy-bear.onrender.com';
  const req={method:'POST',url:'/api/text/turn',headers:{host:'teddy-bear.onrender.com',origin,'sec-fetch-site':hostile?'cross-site':'same-origin',authorization:auth},socket:{encrypted:false}};
  const result=guardRequest(req,{listenHost:'0.0.0.0',publicOrigin:'https://teddy-bear.onrender.com',authPassword:'demo-password-that-is-long-enough'});
  if(hostile){if(result.ok||result.status!==403)fail(family);else blocked++}else if(!result.ok)fail(family);
 }
 // V41: every 16th scenario falsifies the real proxy-origin CSRF capability.
 if((i&15)===0){
  proxyProofChecks++;
  const mode=rand()%6;
  const headers={host:'teddy-bear.onrender.com',origin:'https://alternate-browser.example.test',
    authorization:auth,'sec-fetch-site':'same-origin','sec-fetch-mode':'cors',
    'sec-fetch-dest':'empty','x-teddy-csrf':'preseeded-v41-token'};
  if(mode===1)headers['x-teddy-csrf']='incorrect';
  else if(mode===2)headers['sec-fetch-site']='cross-site';
  else if(mode===3)headers['sec-fetch-mode']='navigate';
  else if(mode===4)headers.host='attacker.invalid';
  else if(mode===5)headers.origin='null';
  const out=guardRequest({method:'POST',url:'/api/text/turn',headers,socket:{encrypted:false}},
    {listenHost:'0.0.0.0',publicOrigin:'https://teddy-bear.onrender.com',
     authPassword:'demo-password-that-is-long-enough',csrfToken:'preseeded-v41-token'});
  if(mode===0){if(!out.ok)fail(family)}
  else if(out.ok)fail(family);
  else proxyProofRejections++;
 }
 // Every 64 iterations invoke the REAL deterministic semantic planner.
 if((i&63)===0){
  const plan=planSemanticTurn({text:utterance,history:[]});semanticPlanners++;
  if(plan.path==='deterministic'&&(!plan.reply||!plan.reply.trim()))fail(family);
  if(plan.path==='model'&&plan.reply)fail(family);
 }
 if((i&16383)===0)hash.update([i,family,provider,w,h,utterance,layout.historyWidth,bubble.left].join(':'));
}
const total=Object.values(histogram).reduce((a,b)=>a+b,0),criticalSurvivors=Object.values(violations).reduce((a,b)=>a+b,0);
assert.equal(total,COUNT);
const proof={schema:'teddy.enduser.v40.mutation.1m',seed:'0x'+SEED.toString(16),scope:'preseeded deterministic contract mutations, not LLM generations or a million browser sessions',cases:total,families:histogram,realSecurityChecks:guards,securityRejections:blocked,proxyProofChecks,proxyProofRejections,realSemanticPlannerChecks:semanticPlanners,recognizedTextFailures,oldUXConflictOccurrences:baselineConflicts,criticalSurvivors,violations,traceSha256:hash.digest('hex'),pass:criticalSurvivors===0};
console.log('TEDDY_ENDUSER_MUTATION_V40',JSON.stringify(proof));
if(!proof.pass)process.exitCode=1;

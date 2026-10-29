import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {providerSwitchFeedback,textTurnFeedback,classifyVisibleTurn} from '../web/enduser-contract-v40.js';
import {connectionGuidance} from '../web/connection.js';
import {chatLayout} from '../web/chat-layout-v21.js';
import {guardRequest} from '../server/lib/security.mjs';
const source=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('failed Vireonix switch is attributed to attempted Vireonix, active Qwen',()=>{
 const message=providerSwitchFeedback({attempted:'vireonix',active:'local',code:'origin_not_allowed',status:403});
 assert.match(message,/Vireonix/);assert.match(message,/Qwen locale/);assert.match(message,/403.*origin_not_allowed/);
 assert.doesNotMatch(message,/voce|microfono|WebRTC/i);
});
test('all text error classes remain textual and never masquerade as confirmed speech',()=>{
 for(const [code,provider] of [['origin_not_allowed','local'],['origin_not_allowed','vireonix'],['local_text_timeout','local'],['vireonix_timeout','vireonix'],['unknown_problem','openai']]){
  const g=connectionGuidance({kind:'text',provider,error:code,status:code==='origin_not_allowed'?403:502});
  assert.doesNotMatch(g.title+' '+g.message,/voce|microfono|WebRTC|sessione vocale/i);
  assert.match(textTurnFeedback({provider,code,status:403}),/Teddy|Qwen|Vireonix|Messaggio/);
 }
 assert.equal(classifyVisibleTurn({httpOk:false,reply:'',conversationId:''}),'error');
 assert.equal(classifyVisibleTurn({httpOk:true,reply:'Eccomi.',conversationId:'conv',requestId:'same',expectedRequestId:'same'}),'balloon');
 assert.equal(classifyVisibleTurn({httpOk:true,reply:'Eccomi.',conversationId:'conv',requestId:'wrong',expectedRequestId:'same'}),'error');
 assert.match(textTurnFeedback({provider:'vireonix',code:'vireonix_upstream_unavailable',upstreamStatus:503}),/503/);
 assert.match(textTurnFeedback({provider:'vireonix',code:'vireonix_request_rejected',upstreamStatus:400}),/formato.*400/);
 assert.doesNotMatch(textTurnFeedback({provider:'vireonix',code:'vireonix_upstream_unavailable',upstreamStatus:503}),/voce|microfono|WebRTC/i);
});
test('history opt-in; model selector, status and inline errors use distinct regions',()=>{
 for(const [w,h] of [[320,568],[390,844],[800,600],[1180,760],[1920,1080]])assert.equal(chatLayout(w,h).initialHistoryOpen,false);
 const html=source('web/index.html'),css=source('web/styles.css'),app=source('web/app.js'),chat=source('web/text-chat-v17.js');
 assert.match(html,/id="chatFeedback"/);assert.match(html,/aria-live="assertive"/);
 assert.match(css,/grid-template-areas:'history engine fresh' 'status status status'/);
 assert.match(chat,/setFeedback\(providerSwitchFeedback/);
 assert.match(app,/textChat\?\.reportProblem\(lastConnectionProblem\)/);
 assert.match(app,/browserOrigin:window\.location\.origin/);
 assert.match(chat,/teddy:provider-switch-failed/);
 assert.match(app,/attemptedProvider:failure\.attemptedProvider/);
});
test('trusted hosted origin works, malicious hosts and origins stay blocked',()=>{
 const password='the-password-is-long-enough';
 const policy={listenHost:'0.0.0.0',publicOrigin:'https://teddy-bear.onrender.com',allowedHosts:'alias.onrender.com',authPassword:password};
 const req=(origin,site='same-origin',host='alias.onrender.com')=>({method:'POST',url:'/api/text/turn',headers:{host,origin,'sec-fetch-site':site,authorization:'Basic '+Buffer.from('teddy:'+password).toString('base64')},socket:{encrypted:false}});
 assert.equal(guardRequest(req('https://alias.onrender.com'),policy).ok,true);
 assert.equal(guardRequest(req('https://evil.example'),policy).status,403);
 assert.equal(guardRequest(req('https://alias.onrender.com','cross-site'),policy).status,403);
 assert.equal(guardRequest(req('https://evil.example','same-origin','evil.example'),policy).status,421);
});

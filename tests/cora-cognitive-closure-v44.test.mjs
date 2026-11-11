import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCognitiveMetrics} from '../tools/cora-cognitive-metrics-v44.mjs';
import {planSemanticTurn,semanticReceipt} from '../server/lib/semantic-spine.mjs';
import {buildLocalMessages} from '../server/lib/local-engines.mjs';
import {derivePremises} from '../server/lib/grounded-reasoner-v32.mjs';

test('CORA COG-01: all 120 directed-chain positive oracles, depth 1-24 and shuffled rule orders',()=>{
  const r=evaluateCognitiveMetrics();
  assert.equal(r.logicPositive.total,120);assert.equal(r.logicPositive.correct,120,JSON.stringify(r.logicPositive.counterexamples.slice(0,4)));
  assert.equal(r.logicNegative.total,120);assert.equal(r.logicNegative.correct,120);
});
test('CORA COG-02: 40 self-contained prompts remain open; short anaphora preserve followup',()=>{
  const r=evaluateCognitiveMetrics();
  assert.equal(r.illocutionStandalone.total,40);assert.equal(r.illocutionStandalone.correct,40,JSON.stringify(r.illocutionStandalone.counterexamples.slice(0,5)));
  assert.equal(r.illocutionBoundary.total,18);assert.equal(r.illocutionBoundary.correct,18,JSON.stringify(r.illocutionBoundary.counterexamples.slice(0,5)));
  assert.equal(r.illocutionFollowup.total,18);assert.equal(r.illocutionFollowup.correct,18,JSON.stringify(r.illocutionFollowup.counterexamples.slice(0,5)));
});
test('CORA COG-03: newest bounded history is kept; content remains chronological and current last',()=>{
  const r=evaluateCognitiveMetrics();
  assert.equal(r.freshHistory.pass,true,JSON.stringify(r.freshHistory));
  const messages=buildLocalMessages('nuova domanda', {turns:[{role:'user',text:'precedente'}, {role:'assistant',text:'ultima risposta'}]});
  assert.equal(messages.at(-1).content,'nuova domanda');
  assert.ok(messages.some(x=>x.content==='ultima risposta'));
});
test('CORA COG-04: negative controls prevent ungrounded authority, revoked premises and math regression',()=>{
  const r=evaluateCognitiveMetrics();
  assert.deepEqual(r.controls,{noAssistantPremise:true,retraction:true,arithmetic:true});
  const h=[{role:'user',text:'Premessa: alfa. Se alfa allora beta.'}];
  const plan=planSemanticTurn({text:'quindi beta?',history:h});
  assert.equal(plan.reasoning.status,'proved');
  assert.equal(semanticReceipt(plan,'local',plan.reply).cognitive.reasoning.authority,'conditional_not_external_truth');
});
test('CORA COG-05: derived goal never claims model truth or external product sign-off',()=>{
  const r=evaluateCognitiveMetrics();
  assert.equal(r.sourceGatePass,true);
  assert.equal(r.authorization,'NONE');
  assert.equal(r.external.qwen_actual,'UNOBSERVED');
  assert.equal(r.external.browser_product,'UNOBSERVED');
  assert.equal(r.external.human_review,'UNOBSERVED');
  assert.match(r.proofScope,/NOT_GENUINE_MODEL/);
  console.log('TEDDY_CORA_V44_METRICS',JSON.stringify({positive:r.logicPositive.correct,negative:r.logicNegative.correct,standalone:r.illocutionStandalone.correct,boundary:r.illocutionBoundary.correct,followups:r.illocutionFollowup.correct,fresh:r.freshHistory,sourceGatePass:r.sourceGatePass,external:r.external}));
});
test('CORA COG-06: no expansion beyond the bounded 24-rule authority',()=>{
  const lines=['Premessa: alpha.',...Array.from({length:25},(_,i)=>`Se k${i} allora k${i+1}.`)];
  const h=Array.from({length:3},(_,i)=>({role:'user',text:lines.slice(i*10,(i+1)*10).join(' ')}));
  const p=derivePremises({text:'quindi k25?',history:h});
  assert.ok(p.ruleCount<=24);
  assert.equal(p.provable,false);
});

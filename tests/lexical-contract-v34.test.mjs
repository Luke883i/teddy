import test from 'node:test';
import assert from 'node:assert/strict';
import {planSemanticTurn,semanticReceipt} from '../server/lib/semantic-spine.mjs';
import {lexicalReadback} from '../server/lib/lexical-contract-v34.mjs';
import {scopeExplicitPremises} from '../server/lib/goal-ledger-v33.mjs';
const id=i=>'00000000-0000-4000-8000-'+i.toString(16).padStart(12,'0');
test('1000 lexical/pragmatic mutations, five distinct illocutionary acts',()=>{
 const prompts=['chi sei?','ciao','grazie','a presto','bravo'];
 const acts=['identity','greeting','gratitude','farewell','praise'];
 for(let i=0;i<1000;i++){
  const which=i%5,p=planSemanticTurn({text:prompts[which],requestId:id(i)});
  assert.equal(p.act,acts[which]);assert.equal(p.path,'deterministic');
  assert.ok(p.reply?.length>2);
  const m=lexicalReadback({act:p.act,text:p.reply});
  assert.equal(m.review,false,'wording flagged '+i+': '+p.reply);
  assert.ok(m.words<=42);
  assert.equal(semanticReceipt(p,'local',p.reply).cognitive.lexical.review,false);
 }
 console.log('TEDDY_V34_LEXICAL',JSON.stringify({mutations:1000,speechActFamilies:5,realModelCalls:0}));
});
test('new sessions vary but identical request IDs reproduce exact text',()=>{
 const variants=new Set();
 for(let i=0;i<100;i++)variants.add(planSemanticTurn({text:'chi sei?',requestId:id(i)}).reply);
 assert.ok(variants.size>=4);
 assert.equal(planSemanticTurn({text:'chi sei?',requestId:id(20)}).reply,planSemanticTurn({text:'chi sei?',requestId:id(20)}).reply);
});
test('name query states evidence, without boasting',()=>{
 const p=planSemanticTurn({text:'come mi chiamo?',history:[{role:'user',text:'Mi chiamo Beatrice'}]});
 assert.equal(p.reply,'Ti chiami Beatrice.');
});
test('verified arithmetic repairs actual preceding dialogue without Qwen',()=>{
 const h=[{role:'user',text:'quanto fa 3 * 4?'},{role:'assistant',text:'Fa 12.'}];
 const p=planSemanticTurn({text:'non ho capito',history:h});
 assert.equal(p.act,'clarify_arithmetic');
 assert.equal(p.reply,'4 gruppi da 3: 3 + 3 + 3 + 3 = 12.');
 assert.equal(p.reasoning.source,'previous_committed_turn');
 const other=planSemanticTurn({text:'non ho capito',history:[h[0],{role:'assistant',text:'È un mistero.'}]});
 assert.equal(other.path,'model');
});
test('1000 operator clarifications have exact mathematical value',()=>{
 for(let i=0;i<1000;i++){
  const a=i%30,b=i%7+1,q='quanto fa '+a+' * '+b+'?';
  const base=planSemanticTurn({text:q});
  const p=planSemanticTurn({text:'non ho capito',history:[{role:'user',text:q},{role:'assistant',text:base.reply}]});
  assert.equal(p.path,'deterministic');assert.equal(p.act,'clarify_arithmetic');
  assert.ok(p.reply.includes(String(a*b)),String(i));
 }
});
test('chronological revocation does not invalidate later user reassertion',()=>{
 const h=[{role:'user',text:'Premessa: alfa.'},{role:'user',text:'Ritiro premessa: alfa.'},{role:'user',text:'Premessa: alfa. Se alfa allora beta.'}];
 assert.equal(planSemanticTurn({text:'quindi beta?',history:h}).reasoning?.status,'proved');
});
test('new current problem clears old episode and untouched text remains verbatim',()=>{
 const history=[{role:'user',text:'Premessa: alfa. Se alfa allora beta.'}];
 const p=planSemanticTurn({text:'Nuovo problema: esaminiamo 3.14',history});
 assert.equal(p.reasoning,null);assert.equal(p.goal.changedPremises,true);
 const utterance={role:'user',text:'Valore 3.14, URL https://example.org/v.1?x=3.14'};
 assert.deepEqual(scopeExplicitPremises([utterance]).turns,[utterance]);
});
test('lexical review never asserts truth or semantic relevance',()=>{
 const q=lexicalReadback({act:'open',text:'La Luna è una candela gigante.'});
 assert.equal(q.judgement,'lexical_only_not_semantic_truth');assert.equal(q.review,false);
});

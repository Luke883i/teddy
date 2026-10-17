import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCognitiveWorkspace,conceptTerms,workspaceDirective,workspaceContext,semanticReadback} from '../server/lib/cognitive-workspace-v31.mjs';
import {planSemanticTurn,semanticReceipt} from '../server/lib/semantic-spine.mjs';
import {buildLocalMessages} from '../server/lib/local-engines.mjs';
const history=[
 {role:'user',text:'Spiega perché una coperta trattiene il calore.'},
 {role:'assistant',text:'La coperta riduce lo scambio di energia termica con l’ambiente.'}
];
test('a contextual repair is no longer a generic deterministic canned phrase',()=>{
  const plan=planSemanticTurn({text:'non ho capito',history,conversationId:'A'});
  assert.equal(plan.path,'model');assert.equal(plan.act,'clarify_context');
  assert.equal(plan.workspace.move,'repair');
  assert.match(plan.workspace.antecedent,/coperta/i);
  assert.match(plan.workspace.previousAnswer,/scambio di energia/i);
  assert.match(plan.directive,/Riformula la risposta precedente/);
  assert.equal(planSemanticTurn({text:'non ho capito'}).path,'deterministic');
});
test('followups relate the current goal to a concrete, prior user question',()=>{
 const p=planSemanticTurn({text:'perché?',history});
 assert.equal(p.path,'model');assert.equal(p.act,'followup');
 assert.equal(p.workspace.move,'followup');
 assert.ok(p.workspace.edges.some(e=>e.type==='follows_up'));
 const m=buildLocalMessages('perché?',{workspace:p.workspace,semanticDirective:p.directive,turns:history});
 assert.ok(m.some(x=>x.content.includes('FOCUS CONVERSAZIONALE')));
 assert.ok(m.at(-1).content.includes('FOCUS CONVERSAZIONALE'));
 assert.ok(m.at(-1).content.endsWith('perché?'));
 assert.equal(m.filter(x=>x.role==='user'&&x.content.includes('FOCUS CONVERSAZIONALE')).length,1);
});
test('topic switch is not polluted by an unrelated antecedent',()=>{
 const p=buildCognitiveWorkspace({text:'Confronta due materiali isolanti.',history});
 assert.equal(p.move,'compare');assert.equal(p.antecedent,null);
 assert.ok(!p.previousAnswer);
 assert.ok(p.constraints.includes('make_comparison_explicit'));
});
test('bounded graph has typed links and does not claim external authority',()=>{
 const p=buildCognitiveWorkspace({text:'e quindi?',history});
 assert.ok(p.nodes.length<=18&&p.edges.length<=24);
 const ids=new Set(p.nodes.map(x=>x.id));
 assert.ok(p.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));
 assert.equal(p.evidenceAuthority,'user_or_model_claim_not_verified');
 assert.ok(workspaceContext(p).length<=1500);
 assert.ok(!workspaceDirective(p).includes(history[0].text));
 assert.ok(conceptTerms('la coperta trattiene calore').includes('coperta'));
});
test('semantic readback rejects verifiable bad responses, not synonyms',()=>{
 const workspace=buildCognitiveWorkspace({text:'Spiega perché il cielo è blu'});
 assert.equal(semanticReadback({question:'Spiega perché il cielo è blu',reply:'Ho sentito: Spiega perché il cielo è blu',workspace}).status,'reject');
 assert.equal(semanticReadback({question:'Spiega perché il cielo è blu',reply:'Spiega perché il cielo è blu',workspace}).status,'reject');
 const r=semanticReadback({question:'Spiega perché il cielo è blu',reply:'La diffusione di Rayleigh disperde soprattutto le lunghezze d’onda corte.',workspace});
 assert.equal(r.status,'observed');
 assert.equal(r.reason,'needs_human_or_model_review');
});
test('workspace receipts disclose structure only, never raw human utterances',()=>{
 const p=planSemanticTurn({text:'spiega il fenomeno fisico del cielo blu'});
 const receipt=semanticReceipt(p,'local','Le lunghezze d’onda più corte sono diffuse maggiormente.',{status:'observed',reason:'needs_human_or_model_review'});
 assert.equal(receipt.cognitive.schema,'teddy.workspace.v1');
 assert.ok(receipt.cognitive.nodes>0);
 assert.ok(!JSON.stringify(receipt).includes('fenomeno fisico'));
 assert.equal(receipt.cognitive.readback.reason,'needs_human_or_model_review');
});

test('complete why questions remain self-contained even after irrelevant social history',()=>{
 const questions=['Perché il cielo appare blu?','Perché la luna cambia aspetto?','Perché il ghiaccio galleggia?','Come mai il ferro arrugginisce?','Perche la luce attraversa il vetro?'];
 const prior=[{role:'user',text:'Mi chiamo Luca'},{role:'assistant',text:'Piacere Luca.'}];
 for(const text of questions){
   for(const h of [[],prior,history]){
     const p=planSemanticTurn({text,history:h,conversationId:'A'});
     assert.equal(p.path,'model');
     assert.equal(p.workspace.move,'explain',text);
     assert.equal(p.workspace.unresolved,false);
     assert.equal(p.workspace.antecedent,null);
     assert.ok(!p.directive.includes('Manca un antecedente'));
     const messages=buildLocalMessages(text,{workspace:p.workspace,semanticDirective:p.directive,turns:h});
     assert.equal(messages.at(-1).content,text);
     assert.ok(!messages.some(m=>m.content.includes('FOCUS CONVERSAZIONALE')));
   }
 }
});
test('anaphoric why without antecedent requests clarification rather than hallucination',()=>{
 for(const question of ['perché?','e quindi?','come mai?']){
   const w=buildCognitiveWorkspace({text:question});
   assert.equal(w.move,'followup');assert.equal(w.unresolved,true);
   assert.equal(w.antecedent,null);
 }
});
test('repair binds the answer actually paired with the prior substantive question',()=>{
 const h=[...history,{role:'user',text:'Mi chiamo Luca'},{role:'assistant',text:'Ti chiamerò Luca.'}];
 const w=buildCognitiveWorkspace({text:'non ho capito',history:h});
 assert.match(w.antecedent,/coperta/i);
 assert.match(w.previousAnswer,/scambio di energia/i);
 assert.doesNotMatch(w.previousAnswer,/chiamerò Luca/i);
});

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
 assert.equal(m.at(-1).content,'perché?');
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

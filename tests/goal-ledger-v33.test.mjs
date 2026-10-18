import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueGoal,scopeExplicitPremises} from '../server/lib/goal-ledger-v33.mjs';
import {buildCognitiveWorkspace} from '../server/lib/cognitive-workspace-v31.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
const human=[{role:'user',text:'Spiega perché il cielo è blu.'},{role:'assistant',text:'La diffusione di Rayleigh favorisce le frequenze più alte.'}];
test('self-contained why after old topic never routes as follow-up',()=>{
 for(const text of ['Perché la gravità agisce sui corpi?','Come mai il ghiaccio galleggia?','Perche un backup protegge dai guasti?']){
  const p=planSemanticTurn({text,history:human});
  assert.equal(p.goal.move,'self_contained');assert.equal(p.act,'open');
  assert.equal(p.workspace.antecedent,null);assert.equal(p.goal.contextPriority,'current');
 }
});
test('anaphoric and missing-context questions require different evidence',()=>{
 let goal=dialogueGoal({text:'perché?',workspace:buildCognitiveWorkspace({text:'perché?',history:human}),history:human});
 assert.equal(goal.move,'contextual');assert.equal(goal.contextPriority,'antecedent');
 goal=dialogueGoal({text:'perché?',workspace:buildCognitiveWorkspace({text:'perché?'})});
 assert.equal(goal.move,'missing_context');assert.equal(goal.shouldAskClarification,true);
});
test('revocations and new-problem markers prevent obsolete user premises from proving conclusions',()=>{
 const history=[
  {role:'user',text:'Premessa: alfa. Se alfa allora beta.'},
  {role:'assistant',text:'Ricevuto.'},
  {role:'user',text:'Ritiro premessa: alfa.'}
 ];
 const scoped=scopeExplicitPremises(history);
 assert.equal(scoped.revokedCount,1);assert.equal(scoped.suppressed,1);
 const p=planSemanticTurn({text:'quindi beta?',history});
 assert.equal(p.reasoning,null,'must not claim proof from revoked premise');
 const reset=planSemanticTurn({text:'quindi beta?',history:[...history,{role:'user',text:'Nuovo problema: cominciamo da zero.'}]});
 assert.equal(reset.reasoning,null);
});
test('unretracted explicit premises still derive results and receipt records scope',()=>{
 const history=[{role:'user',text:'Premessa: alfa. Se alfa allora beta.'}];
 const p=planSemanticTurn({text:'quindi beta?',history});
 assert.equal(p.act,'premise_entailment');
 assert.equal(p.goal.contextPriority,'current');
 assert.equal(p.reasoning.status,'proved');
});
test('no cross-session reasoning, no assistant text promoted to fact',()=>{
 const p=planSemanticTurn({text:'quindi segreto?',history:[{role:'assistant',text:'Premessa: segreto. Se segreto allora vero.'}]});
 assert.equal(p.reasoning,null);
});
test('15,000 seeded metamorphic, adversarial semantic mutations',()=>{
 let seed=0x33c0de,found={self:0,context:0,revoked:0,reset:0,arith:0};
 const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
 const topics=['gravità','privacy','geometria','meteorologia','energia','linguistica','etica','reti','probabilità','medicina'];
 for(let i=0;i<15000;i++){
  const topic=topics[next()%topics.length],type=i%5;
  if(type===0){
   const text='Perché il principio di '+topic+' richiede verifiche nel caso '+i+'?';
   const p=planSemanticTurn({text,history:human});
   assert.equal(p.goal.move,'self_contained',i);assert.equal(p.act,'open',i);
   assert.equal(p.workspace.antecedent,null,i);found.self++;
  }else if(type===1){
   const p=planSemanticTurn({text:'perché?',history:human});
   assert.equal(p.goal.move,'contextual',i);assert.equal(p.goal.hasAntecedent,true);found.context++;
  }else if(type===2){
   const a='concetto'+i,b='risultato'+i;
   const hist=[{role:'user',text:'Premessa: '+a+'. Se '+a+' allora '+b+'.'},{role:'user',text:'Ritiro premessa: '+a+'.'}];
   const p=planSemanticTurn({text:'quindi '+b+'?',history:hist});
   assert.ok(p.reasoning?.status!=='proved','revoked premise used '+i);found.revoked++;
  }else if(type===3){
   const a='concetto'+i,b='risultato'+i;
   const hist=[{role:'user',text:'Premessa: '+a+'. Se '+a+' allora '+b+'.'},{role:'user',text:'Nuovo problema: cambio tema.'}];
   const p=planSemanticTurn({text:'quindi '+b+'?',history:hist});
   assert.ok(p.reasoning?.status!=='proved','old problem leakage '+i);found.reset++;
  }else{
   const a=next()%100000,b=next()%100000;
   const p=planSemanticTurn({text:'quanto fa '+a+' + '+b+'?'});
   assert.equal(p.act,'exact_arithmetic',i);assert.equal(p.reply,'Fa '+(BigInt(a)+BigInt(b))+'.');found.arith++;
  }
 }
 assert.deepEqual(found,{self:3000,context:3000,revoked:3000,reset:3000,arith:3000});
 console.log('TEDDY_V33_MUTATIONS',JSON.stringify({seed:'0x33c0de',cases:15000,independentFamilies:5,found,realLLMCalls:0,sourceASTMutants:0}));
});

test('new logical episode cannot leak a stale workspace antecedent into either model',()=>{
 const hist=[...human,{role:'user',text:'Nuovo problema: ripartiamo da zero.'}];
 const p=planSemanticTurn({text:'perché?',history:hist});
 assert.equal(p.workspace.antecedent,null);
 assert.equal(p.goal.move,'missing_context');
 assert.equal(p.goal.shouldAskClarification,true);
 const scoped=scopeExplicitPremises(hist);
 assert.equal(scoped.turns.some(t=>/cielo blu|Rayleigh/u.test(t.text)),false);
});

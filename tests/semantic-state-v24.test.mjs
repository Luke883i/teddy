import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {planSemanticTurn,semanticReceipt} from '../server/lib/semantic-spine.mjs';
const setup=()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v24-state-'));return {home,state:new StateStore(home)}};
const teardown=({home,state})=>{state.close();fs.rmSync(home,{recursive:true,force:true})};
test('Step 0 migration and atomic transcript + provenance receipt survives cold reboot',()=>{
 const s=setup();let id;
 try{
  const p=planSemanticTurn({text:'chi sei?'});
  const receipt=semanticReceipt(p,'local',p.reply);
  id=s.state.commitTextTurn({text:'chi sei?',reply:p.reply,receipt});
  assert.equal(s.state.conversationHistory(id).length,2);
  assert.equal(s.state.semanticReceipts(id).length,1);
  assert.equal(s.state.semanticReceipts(id)[0].inputDigest,p.inputDigest);
  assert.equal(s.state.db.prepare('PRAGMA user_version').get().user_version,2);
  s.state.close();
  s.state=new StateStore(s.home);
  assert.equal(s.state.conversationHistory(id)[1].text,p.reply);
  assert.equal(s.state.semanticReceipts(id)[0].path,'deterministic');
 }finally{teardown(s)}
});
test('three sequential human turns are scoped to their own conversation',()=>{
 const s=setup();
 try{
  const name=planSemanticTurn({text:'Mi chiamo Luca'});
  const one=s.state.commitTextTurn({text:'Mi chiamo Luca',reply:name.reply,receipt:semanticReceipt(name,'local',name.reply)});
  const other=planSemanticTurn({text:'Mi chiamo Maria'});
  const two=s.state.commitTextTurn({text:'Mi chiamo Maria',reply:other.reply,receipt:semanticReceipt(other,'local',other.reply)});
  assert.notEqual(one,two);
  const q1=planSemanticTurn({text:'come mi chiamo?',history:s.state.conversationHistory(one),conversationId:one});
  const q2=planSemanticTurn({text:'come mi chiamo?',history:s.state.conversationHistory(two),conversationId:two});
  assert.match(q1.reply,/Luca/);assert.doesNotMatch(q1.reply,/Maria/);
  assert.match(q2.reply,/Maria/);assert.doesNotMatch(q2.reply,/Luca/);
  const thr=s.state.commitTextTurn({conversationId:one,text:'come mi chiamo?',reply:q1.reply,receipt:semanticReceipt(q1,'local',q1.reply)});
  assert.equal(one,thr);
  assert.equal(s.state.conversationHistory(one).length,4);
  assert.equal(s.state.conversationHistory(two).length,2);
  assert.equal(s.state.semanticReceipts(one).length,2);
 }finally{teardown(s)}
});
test('unknown or ended session rejects without inserting any turn',()=>{
 const s=setup();
 try{
  const p=planSemanticTurn({text:'ciao'});
  const receipt=semanticReceipt(p,'local',p.reply);
  assert.throws(()=>s.state.commitTextTurn({conversationId:'not-an-id',text:'ciao',reply:p.reply,receipt}),e=>e.code==='conversation_not_found');
  const id=s.state.startConversation();s.state.endConversation(id);
  assert.throws(()=>s.state.commitTextTurn({conversationId:id,text:'ciao',reply:p.reply,receipt}),e=>e.code==='conversation_not_found');
  assert.equal(s.state.history().length,0);
 }finally{teardown(s)}
});
test('forced receipt insertion failure rolls back BOTH human and Teddy turns',()=>{
 const s=setup();
 try{
  s.state.db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON semantic_receipts BEGIN SELECT RAISE(ABORT,'simulated_receipt_failure'); END;");
  const p=planSemanticTurn({text:'chi sei?'});
  assert.throws(()=>s.state.commitTextTurn({text:'chi sei?',reply:p.reply,receipt:semanticReceipt(p,'local',p.reply)}),/simulated_receipt_failure/);
  assert.equal(s.state.history().length,0);
  assert.equal(s.state.db.prepare('SELECT COUNT(*) n FROM conversations').get().n,0);
 }finally{teardown(s)}
});
test('bounded recent conversation retrieval does not walk global top 500',()=>{
 const s=setup();
 try{
  const first=s.state.startConversation(),second=s.state.startConversation();
  for(let i=0;i<60;i++)s.state.addTurn(first,'user','first-'+i);
  for(let i=0;i<620;i++)s.state.addTurn(second,'user','second-'+i);
  const visible=s.state.conversationHistory(first,12);
  assert.equal(visible.length,12);
  assert.equal(visible.at(-1).text,'first-59');
  assert.ok(visible.every(x=>x.text.startsWith('first-')));
 }finally{teardown(s)}
});

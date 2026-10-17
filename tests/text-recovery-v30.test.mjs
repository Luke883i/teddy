import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {planSemanticTurn,semanticReceipt} from '../server/lib/semantic-spine.mjs';
function fixture(){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v30-'));
 return {home,state:new StateStore(home)};
}
function dispose(f){try{f.state?.close()}catch{}fs.rmSync(f.home,{recursive:true,force:true})}
function reply(state,text,conversationId=null,requestId=crypto.randomUUID()){
 const plan=planSemanticTurn({text,conversationId:conversationId||null});
 const receipt=semanticReceipt(plan,'local',plan.reply||'Modello locale: risposta vera.');
 const real=plan.reply||'Modello locale: risposta vera.';
 const id=state.commitTextTurn({conversationId,text,reply:real,receipt,requestId});
 return {id,requestId,real};
}
test('v3 migration coexists with existing transcript and receipts',()=>{
 const f=fixture();
 try{
  assert.equal(f.state.db.prepare('PRAGMA user_version').get().user_version,3);
  assert.ok(f.state.db.prepare("SELECT name FROM sqlite_master WHERE name='text_requests'").get());
  const record=reply(f.state,'chi sei?');
  assert.equal(f.state.conversationHistory(record.id).length,2);
  f.state.close();f.state=new StateStore(f.home);
  assert.equal(f.state.db.prepare('PRAGMA user_version').get().user_version,3);
  assert.equal(f.state.findTextRequest({requestId:record.requestId,text:'chi sei?'}).reply,record.real);
 }finally{dispose(f)}
});
test('same UUID and same original new-session payload replays exact committed reply with no duplicates',()=>{
 const f=fixture();
 try{
  const {id,real,requestId}=reply(f.state,'chi sei?');
  const replay=f.state.findTextRequest({requestId,text:'chi sei?',conversationId:null});
  assert.deepEqual({id:replay.conversationId,reply:replay.reply,replayed:replay.replayed},{id,reply:real,replayed:true});
  assert.equal(replay.provider,'local');
  assert.equal(f.state.history().length,2);
  assert.equal(f.state.semanticReceipts(id).length,1);
  assert.equal(f.state.db.prepare('SELECT COUNT(*) n FROM text_requests').get().n,1);
 }finally{dispose(f)}
});
test('original requested conversation identity is bound, including null versus a committed new conversation',()=>{
 const f=fixture();
 try{
  const created=reply(f.state,'ciao');
  assert.throws(()=>f.state.findTextRequest({requestId:created.requestId,text:'ciao',conversationId:created.id}),e=>e.code==='text_request_conflict');
  const next=reply(f.state,'grazie',created.id);
  assert.equal(f.state.findTextRequest({requestId:next.requestId,text:'grazie',conversationId:created.id}).conversationId,created.id);
  assert.throws(()=>f.state.findTextRequest({requestId:next.requestId,text:'grazie',conversationId:null}),e=>e.code==='text_request_conflict');
 }finally{dispose(f)}
});
test('reuse with altered human content must never return another answer or append turns',()=>{
 const f=fixture();
 try{
  const a=reply(f.state,'chi sei?');
  assert.throws(()=>f.state.findTextRequest({requestId:a.requestId,text:'quali sono le mie password?'}),e=>e.code==='text_request_conflict');
  assert.throws(()=>reply(f.state,'grazie',null,a.requestId),e=>e.code==='text_request_conflict');
  assert.equal(f.state.history().length,2);
  assert.equal(f.state.db.prepare('SELECT COUNT(*) n FROM text_requests').get().n,1);
 }finally{dispose(f)}
});
test('reject invalid, predictable and non-v4 request identifiers',()=>{
 const f=fixture();
 try{
  for(const requestId of ['','abc','0'.repeat(36),'../../foo',42,null,'12345678-1234-1234-1234-123456789012']){
   assert.throws(()=>f.state.findTextRequest({requestId,text:'ciao'}),e=>e.code==='text_request_id_invalid');
  }
  assert.equal(f.state.findTextRequest({requestId:crypto.randomUUID(),text:'ciao'}),null);
 }finally{dispose(f)}
});
test('failure in the idempotency journal rolls back both chat turns and conversation',()=>{
 const f=fixture();
 try{
  f.state.db.exec("CREATE TRIGGER fail_idempotency BEFORE INSERT ON text_requests BEGIN SELECT RAISE(ABORT,'v30_forced_failure'); END;");
  assert.throws(()=>reply(f.state,'ciao'),/v30_forced_failure/);
  assert.equal(f.state.history().length,0);
  assert.equal(f.state.db.prepare('SELECT COUNT(*) n FROM conversations').get().n,0);
  assert.equal(f.state.db.prepare('SELECT COUNT(*) n FROM semantic_receipts').get().n,0);
 }finally{dispose(f)}
});
test('journal stores SHA256 only, not human or Teddy raw message contents',()=>{
 const f=fixture();
 try{
  const {requestId,id}=reply(f.state,'ciao');
  const row=f.state.db.prepare('SELECT * FROM text_requests WHERE request_id=?').get(requestId);
  assert.equal(row.input_sha256,crypto.createHash('sha256').update('ciao').digest('hex'));
  assert.ok(!JSON.stringify(row).includes('ciao'));
  assert.equal(f.state.conversationHistory(id).length,2);
 }finally{dispose(f)}
});

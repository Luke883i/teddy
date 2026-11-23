import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {planSemanticTurn,semanticReceipt} from '../server/lib/semantic-spine.mjs';
import {historicalSpeaker,historicalReplyVerified} from '../web/history-origin-v48.js';
test('legacy assistant remains visible but not receipt-backed; normal turn is backed',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-prov-v48-'));const db=new StateStore(home);
 try{
  const id=db.startConversation();db.addTurn(id,'assistant','messaggio importato');
  const p=planSemanticTurn({text:'ciao',conversationId:id});
  db.commitTextTurn({conversationId:id,text:'ciao',reply:p.reply,receipt:semanticReceipt(p,'local',p.reply)});
  const rows=db.history();const untrusted=rows.find(t=>t.text==='messaggio importato');
  const trusted=rows.find(t=>t.role==='assistant'&&t.text===p.reply);
  assert.equal(untrusted.origin,'legacy_unattested');
  assert.equal(historicalReplyVerified(untrusted),false);assert.equal(historicalSpeaker(untrusted),'Archivio · origine non attestata');
  assert.equal(trusted.origin,'receipt_backed');assert.equal(historicalReplyVerified(trusted),true);
  assert.equal(historicalSpeaker(trusted),'Teddy');
  assert.ok(db.history(1,rows.at(-1).id).length===1);
 }finally{db.close();fs.rmSync(home,{recursive:true,force:true})}
});
test('UI labels depend on receipt status, never role alone',()=>{
 const text=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
 assert.match(text,/historicalSpeaker\(\{role,origin:meta.origin\}\)/);
 assert.match(text,/meta.origin==='legacy_unattested'/);
 assert.match(text,/append\(turn.role,turn.text,turn.id,turn.conversation_id,turn\)/);
});

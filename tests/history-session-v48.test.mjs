import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {historySessionWritable,historySelection} from '../web/history-session-v48.js';
test('archive remains readable but is never selected as writable',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-archive-v48-'));const db=new StateStore(home);
 try{
  const id=db.startConversation();db.addTurn(id,'assistant','Messaggio storico');
  const prior=db.history();assert.equal(prior.length,1);assert.equal(prior[0].ended_at,null);
  assert.deepEqual(historySelection(prior[0]),{conversationId:id,readOnly:false});
  db.endConversation(id);const closed=db.history();assert.equal(closed.length,1);
  assert.ok(typeof closed[0].ended_at==='string');assert.equal(historySessionWritable(closed[0]),false);
  assert.deepEqual(historySelection(closed[0]),{conversationId:null,readOnly:true});
  assert.equal(db.conversationExists(id),false);
 }finally{db.close();fs.rmSync(home,{recursive:true,force:true})}
});
test('unidentified or malformed archive rows never become writable',()=>{
 for(const row of [{},{conversation_id:'a'}, {conversation_id:'',ended_at:null},{conversation_id:'a',ended_at:'2026'}]){
  assert.equal(historySelection(row).conversationId,null);
 }
});
test('client checks archival state in restore and click paths',()=>{
 const js=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
 assert.match(js,/historySelection\(latest\)/);assert.match(js,/historySelection\(\{conversation_id:conversationId,ended_at:/);
 assert.match(js,/if\(selected\.readOnly\)/);
});

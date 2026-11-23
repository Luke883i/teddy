import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
const inDb=fn=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-name-v48-'));let store;try{store=new StateStore(home);return fn(store,home)}finally{try{store?.close()}catch{}fs.rmSync(home,{recursive:true,force:true})}};
const ask=(store,id,options)=>planSemanticTurn({text:'come mi chiamo?',history:store.conversationHistory(id,12),nameEvidence:store.conversationNameEvidence(id,options),conversationId:id}).reply;
test('cursor scan: 40, 257, 1025 and 2049 unrelated retractions cannot eclipse named user',()=>inDb(db=>{
 const id=db.startConversation();db.addTurn(id,'user','Mi chiamo Chiara');
 for(let i=0;i<2049;i++){
  db.addTurn(id,'user','non chiamarmi Luca');
  if([40,257,1025,2049].includes(i+1))assert.equal(ask(db,id),'Ti chiami Chiara.');
 }
 const evidence=db.conversationNameEvidence(id);
 assert.equal(evidence.complete,true);assert.equal(evidence.length,2050);
 assert.equal(db.quickCheck(),true);
}));
test('named revocation and rename respect chronology across pages and after restart',()=>inDb((db,home)=>{
 const a=db.startConversation(),b=db.startConversation();
 db.addTurn(a,'user','Mi chiamo Chiara');db.addTurn(b,'user','Mi chiamo Luca');
 for(let i=0;i<1030;i++)db.addTurn(a,'user','non chiamarmi Elio');
 db.addTurn(a,'user','non chiamarmi Chiara');
 assert.match(ask(db,a),/Non lo ritrovo qui/);assert.equal(ask(db,b),'Ti chiami Luca.');
 db.addTurn(a,'user','Preferisco che tu mi chiami Sara');assert.equal(ask(db,a),'Ti chiami Sara.');
 db.close(); const reopened=new StateStore(home);try{assert.equal(ask(reopened,a),'Ti chiami Sara.')}finally{reopened.close()}
}));
test('exhaustion is uncertainty, never false denial or revival',()=>inDb(db=>{
 const id=db.startConversation();db.addTurn(id,'user','Mi chiamo Chiara');
 for(let i=0;i<18;i++)db.addTurn(id,'user','non chiamarmi Luca');
 assert.equal(db.conversationNameEvidence(id,{maxRows:3}).complete,false);
 assert.match(ask(db,id,{maxRows:3}),/Non posso verificare/);
 db.addTurn(id,'user','non chiamarmi Chiara');
 assert.match(ask(db,id,{maxRows:3}),/Non lo ritrovo qui|Non posso verificare/);
}));

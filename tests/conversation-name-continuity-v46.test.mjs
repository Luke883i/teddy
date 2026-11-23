import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
import {mostRecentDeclaredName} from '../server/lib/semantic-refinement-v26.mjs';
const create=()=>fs.mkdtempSync(path.join(os.tmpdir(),'teddy-name-v46-'));
const user=text=>({role:'user',text});
test('name query after 40 exchanges derives from persisted source, not transient 12 turns',()=>{
 const home=create();let db;
 try{
   db=new StateStore(home);const id=db.startConversation();
   db.addTurn(id,'user','Mi chiamo Chiara');db.addTurn(id,'assistant','Piacere, Chiara.');
   for(let i=0;i<40;i++){db.addTurn(id,'user',`grazie`);db.addTurn(id,'assistant',`Prego ${i}.`)}
   const recent=db.conversationHistory(id,12);
   assert.equal(recent.some(x=>x.text.includes('Chiara')),false);
   const semantic=planSemanticTurn({text:'come mi chiamo?',history:recent,nameEvidence:db.conversationNameEvidence(id),conversationId:id});
   assert.equal(semantic.act,'name_query');assert.equal(semantic.reply,'Ti chiami Chiara.');
   assert.equal(db.conversationNameEvidence('nonexistent').length,0);
   db.close();db=null;db=new StateStore(home);
   assert.equal(planSemanticTurn({text:'ricordi il mio nome?',history:db.conversationHistory(id,12),nameEvidence:db.conversationNameEvidence(id),conversationId:id}).reply,'Ti chiami Chiara.');
 }finally{db?.close();fs.rmSync(home,{recursive:true,force:true})}
});
test('explicit corrections and retractions do not resurrect an older superseded name',()=>{
 const home=create();let db;
 try{
   db=new StateStore(home);const id=db.startConversation();
   const add=text=>{db.addTurn(id,'user',text);db.addTurn(id,'assistant','OK')};
   const recall=()=>planSemanticTurn({text:'come mi chiamo?',history:db.conversationHistory(id),nameEvidence:db.conversationNameEvidence(id),conversationId:id}).reply;
   add('Mi chiamo Luca');add('In realtà mi chiamo Sara');assert.equal(recall(),'Ti chiami Sara.');
   add('non chiamarmi Sara');assert.match(recall(),/Non lo ritrovo qui/); // Not Luca
   add('chiamami Vera');assert.equal(recall(),'Ti chiami Vera.');
   add('non mi chiamo Marco');assert.equal(recall(),'Ti chiami Vera.'); // unrelated negative fact
   add('non usare più il nome Vera');assert.match(recall(),/Non lo ritrovo qui/);
   add('preferisco che tu mi chiami Chiara');assert.equal(recall(),'Ti chiami Chiara.');
 }finally{db?.close();fs.rmSync(home,{recursive:true,force:true})}
});
test('session facts remain scoped and hypothetical statements cannot introduce a name',()=>{
 const home=create();let db;
 try{
   db=new StateStore(home);const a=db.startConversation(),b=db.startConversation();
   db.addTurn(a,'user','Mi chiamo Nina');
   db.addTurn(b,'user','Se mi chiamo Luisa, rispondi comunque?');
   const recall=(id)=>planSemanticTurn({text:'come mi chiamo?',history:db.conversationHistory(id,12),nameEvidence:db.conversationNameEvidence(id),conversationId:id}).reply;
   assert.equal(recall(a),'Ti chiami Nina.');assert.match(recall(b),/Non lo ritrovo qui/);
   assert.equal(mostRecentDeclaredName([user('Mi chiamo Nina'),user('non mi chiamo Fabio')]),'Nina');
 }finally{db?.close();fs.rmSync(home,{recursive:true,force:true})}
});

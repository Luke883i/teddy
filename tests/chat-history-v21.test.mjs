import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';

test('real SQLite cursor pagination returns every turn once in stable ascending order',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v21-history-'));
 let db;
 try{
  db=new StateStore(home);
  const c1=db.startConversation();
  for(let i=0;i<1207;i++)db.addTurn(c1,i%2?'assistant':'user','Turn '+i);
  const first=db.history(500);
  assert.equal(first.length,500);
  assert.ok(first.every((v,i)=>i===0||v.id>first[i-1].id));
  let before=null,all=[];
  for(let batch=0;batch<5;batch++){
    const page=db.history(500,before);
    if(!page.length)break;
    assert.ok(page.every((v,i)=>i===0||v.id>page[i-1].id));
    all=[...page,...all];before=page[0].id;
    if(page.length<500)break;
  }
  assert.equal(all.length,1207);
  assert.equal(new Set(all.map(x=>x.id)).size,all.length);
  assert.deepEqual(all.map(t=>t.text),Array.from({length:1207},(_,i)=>'Turn '+i));
  assert.equal(all[0].conversation_id,c1);
  assert.equal(db.history(500,1).length,0);
 }finally{db?.close();fs.rmSync(home,{recursive:true,force:true})}
});

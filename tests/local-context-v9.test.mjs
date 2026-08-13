import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../server/lib/state.mjs';
import {buildLocalMessages,createLocalEngines} from '../server/lib/local-engines.mjs';
import {readLocalContext} from '../server/lib/local-context.mjs';

test('local prompt includes bounded memories and recent turns',()=>{
  const memories=Array.from({length:12},(_,i)=>({text:`memoria ${i} ${'x'.repeat(300)}`}));
  const turns=Array.from({length:14},(_,i)=>({role:i%2?'assistant':'user',text:`turno ${i} ${'y'.repeat(600)}`}));
  const messages=buildLocalMessages('domanda finale',{memories,turns});
  assert.equal(messages.at(-1).role,'user');assert.equal(messages.at(-1).content,'domanda finale');assert.match(messages[1].content,/memoria 0/);
  assert.ok(messages.filter(x=>x.role==='user'||x.role==='assistant').length<=9);assert.ok(messages.every(x=>x.content.length<=1400));
});

test('durable sqlite context is readable by the local provider',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-context-')),state=new StateStore(home),id=state.startConversation();
  state.addTurn(id,'user','Mi chiamo Luca');state.addTurn(id,'assistant','Me lo ricordo.');state.addMemory('Ama gli orsi',.9);state.close();
  const ctx=readLocalContext(home);assert.deepEqual(ctx.turns.map(x=>x.role),['user','assistant']);assert.match(ctx.turns[0].text,/Luca/);assert.match(ctx.memories[0].text,/orsi/);
  fs.rmSync(home,{recursive:true,force:true});
});

test('local engine forwards persistent context to llama messages',async()=>{
  let request;const fetchImpl=async(_url,init)=>{request=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{message:{content:'Ciao locale.'}}]}),{status:200,headers:{'content-type':'application/json'}})};
  const engines=createLocalEngines({fetchImpl});const text=await engines.llm('come mi chiamo?',{context:{memories:[{text:'Ti chiami Luca'}],turns:[{role:'user',text:'ricordalo'}]}});
  assert.equal(text,'Ciao locale.');assert.ok(request.messages.some(x=>/Ti chiami Luca/.test(x.content)));assert.ok(request.messages.some(x=>x.role==='user'&&x.content==='ricordalo'));assert.equal(request.messages.at(-1).content,'come mi chiamo?');
});

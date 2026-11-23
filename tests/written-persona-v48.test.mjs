import test from 'node:test';import assert from 'node:assert/strict';
import {writtenPersonaDirective} from '../server/lib/written-persona-v48.mjs';
import {buildLocalMessages} from '../server/lib/local-engines.mjs';
import {vireonixMessages} from '../server/lib/vireonix-text.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
import {openAITextTurn} from '../server/lib/text-service.mjs';
const low={persona:{warmth:0,wit:0,irritability:0,verbosity:0}};
const high={persona:{warmth:1,wit:1,irritability:1,verbosity:1}};
test('canonical written persona changes all four sliders and rejects audio instructions',()=>{
 const a=writtenPersonaDirective(low),b=writtenPersonaDirective(high);
 assert.notEqual(a,b);for(const key of ['calore','arguzia','irritabilità','verbosità'])assert.ok(a.includes(key));
 assert.ok(!a.includes('gain')&&!a.includes('velocità della voce'));
 assert.ok(b.includes('tre-cinque frasi'));
});
test('Qwen and Vireonix receive exactly the same canonical written persona, not user-role instructions',()=>{
 const directive=writtenPersonaDirective(high);
 const local=buildLocalMessages('ciao',{semanticDirective:'semantica',personaDirective:directive});
 const remote=vireonixMessages({text:'ciao',semanticDirective:'semantica',personaDirective:directive});
 assert.ok(local.some(m=>m.role==='system'&&m.content===directive));
 assert.ok(remote.some(m=>m.role==='system'&&m.content.includes(directive)));
 assert.ok(local.some(m=>m.role==='user'&&m.content==='ciao'));
});
test('OpenAI text API receives canonical written directive and no realtime voice settings',async()=>{
 let payload;
 const fetchImpl=async(_url,req)=>{payload=JSON.parse(req.body);return new Response(JSON.stringify({output_text:'Risposta.'}),{status:200,headers:{'content-type':'application/json'}})};
 const result=await openAITextTurn({apiKey:'test-secret',text:'ciao',config:high,fetchImpl});
 assert.equal(result,'Risposta.');assert.ok(payload.instructions.includes(writtenPersonaDirective(high)));
 assert.ok(!payload.instructions.includes('intonazione espressiva'));
});
test('deterministic social variants are sensitive to written persona without becoming arbitrary model replies',()=>{
 const variants=new Set();for(const p of [low,high,{persona:{warmth:.5,wit:.4,irritability:.7,verbosity:.2}}]){
  for(const t of ['ciao','grazie','chi sei']){const plan=planSemanticTurn({text:t,persona:p.persona,conversationId:'n'});assert.equal(plan.path,'deterministic');variants.add(plan.reply)}
 }
 assert.ok(variants.size>=5);
});

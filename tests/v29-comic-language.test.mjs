import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {comicGeometry,minimumThinkingMs,settleThinking} from '../web/dialogue-pacing-v29.js';
import {semanticDepth,chooseNovelVariant,localGenerationSettings} from '../server/lib/semantic-adaptation-v29.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
import {buildLocalMessages,createLocalEngines} from '../server/lib/local-engines.mjs';
test('comic anchors just outside Teddy central zone and expands with text',()=>{
  for(const [w,h] of [[320,568],[390,844],[768,1024],[900,600],[1180,760],[1440,900],[2560,1440]]){
    const short=comicGeometry(w,h,16),long=comicGeometry(w,h,750);
    for(const p of [short,long]){
      assert.ok(p.left>=12 && p.left+p.bubbleWidth<=w-12);
      assert.ok(p.top>=90 && p.maxHeight<=360 && p.textMaxHeight<p.maxHeight);
    }
    assert.ok(long.bubbleWidth>=short.bubbleWidth);
    if(w>=900){
      assert.ok(short.centerClearance>=80,'speech bubble must clear Teddy center');
      assert.ok(long.left<w*.75,'bubble must stay close to Teddy, not stick to far edge');
    }else assert.equal(short.compact,true);
  }
});
test('thinking buffer is bounded, cancellable and instant once model work exceeds target',async()=>{
  assert.ok(minimumThinkingMs('deterministic',80)>=190);
  assert.ok(minimumThinkingMs('deterministic',3000)<=350);
  assert.equal(minimumThinkingMs('model',1000),180);
  let awaited=null;
  assert.equal(await settleThinking({started:0,now:()=>60,minimum:220,wait:async ms=>{awaited=ms}}),160);
  assert.equal(awaited,160);
  assert.equal(await settleThinking({started:0,now:()=>500,minimum:220,wait:async()=>{throw Error('should not wait')}}),0);
  const c=new AbortController();c.abort();
  await assert.rejects(settleThinking({started:0,now:()=>5,signal:c.signal,minimum:190}),e=>e.name==='AbortError');
});
test('adult novelty avoids exact recent repetition yet is stable for identical context',()=>{
 const choices=['Sì, va bene.','Certo, ragioniamo.','Parliamone con calma.'];
 const history=[{role:'assistant',text:'Certo, ragioniamo.'},{role:'assistant',text:'Sì, va bene.'}];
 const r=chooseNovelVariant(choices,'1234567890abcdef',history);
 assert.equal(r,'Parliamone con calma.');
 assert.equal(r,chooseNovelVariant(choices,'1234567890abcdef',history));
 const p=planSemanticTurn({text:'ciao',history:[{role:'assistant',text:planSemanticTurn({text:'ciao'}).reply}],conversationId:'s'});
 assert.equal(p.path,'deterministic');assert.ok(p.reply.length>18);
});
test('abstract complexity gets a bounded evidence-conscious budget, social chat stays fast',async()=>{
 assert.equal(semanticDepth('ciao','greeting'),0);
 assert.equal(semanticDepth('spiega la differenza fra due modelli','open'),1);
 assert.equal(semanticDepth('analizza il paradosso epistemologico della conoscenza','open'),2);
 assert.deepEqual([0,1,2].map(d=>localGenerationSettings(d).max_tokens),[112,208,288]);
 assert.ok(localGenerationSettings(2).temperature<=.6);
 const q=planSemanticTurn({text:'spiega il paradosso epistemologico della conoscenza'});
 assert.equal(q.path,'model');assert.equal(q.depth,2);
 assert.match(q.directive,/obiezione|controesempio/);
 const fake=[];
 const fetchImpl=async(_url,init)=>{fake.push(JSON.parse(init.body));return new Response(JSON.stringify({choices:[{message:{content:'Le premesse contano più della retorica.'}}]}),{status:200})};
 const engine=createLocalEngines({fetchImpl});
 await engine.llm('spiega le cause',{context:{depth:1}});
 await engine.llm('analizza un paradosso',{context:{depth:2}});
 assert.deepEqual(fake.map(x=>x.max_tokens),[208,288]);
 assert.ok(fake.every(x=>x.chat_template_kwargs.enable_thinking===false));
 assert.ok(buildLocalMessages('domanda',{semanticDirective:q.directive}).some(m=>m.content.includes('controesempio')));
});
test('the whole UI reflects the actual runtime, never uses static placeholder speech',()=>{
 const ui=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../web/styles.css',import.meta.url),'utf8');
 assert.match(ui,/startThinking\(\)/);
 assert.match(ui,/settleThinking\(\{started,signal:own.signal/);
 assert.match(ui,/showBubble\(body.reply,body.conversationId\)/);
 assert.match(ui,/bubbleText.textContent=text/);
 assert.match(ui,/if\(own.signal.aborted\)return/);
 assert.match(ui,/minimumThinkingMs\(body.semantic\?\.path/);
 assert.match(css,/\.teddy-bubble\.is-thinking/);
 assert.match(css,/--comic-left/);
 assert.match(css,/prefers-reduced-motion/);
});

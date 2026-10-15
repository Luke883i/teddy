import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalEngines} from '../server/lib/local-engines.mjs';

test('tiny local Qwen uses bounded completion budgets on complex and normal questions',async()=>{
  const bodies=[];
  const fakeFetch=async(_url,opts)=>{
    bodies.push(JSON.parse(opts.body));
    return new Response(JSON.stringify({choices:[{message:{content:'Una risposta verificabile, e abbastanza concisa.'}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  const engine=createLocalEngines({fetchImpl:fakeFetch});
  const standard=await engine.llm('ciao',{context:{extended:false}});
  const extended=await engine.llm('spiega la gravità',{context:{extended:true}});
  assert.match(standard,/risposta/);
  assert.match(extended,/risposta/);
  assert.deepEqual(bodies.map(x=>x.max_tokens),[112,160]);
  assert.ok(bodies.every(x=>x.chat_template_kwargs?.enable_thinking===false),'Qwen3 must not spend short replies on hidden thinking');
  assert.ok(bodies.every(x=>x.stream===false&&x.temperature===.35));
  assert.ok(bodies.every(x=>x.messages.some(m=>m.role==='user')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeUserText,extractOpenAIText,openAITextTurn} from '../server/lib/text-service.mjs';
import {createLocalService} from '../server/lib/local-service.mjs';

const config=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url),'utf8'));

test('text payload normalization rejects blank, control and oversized inputs',()=>{
  assert.equal(normalizeUserText('  ciao\r\nTeddy '),'ciao\nTeddy');
  for(const input of ['',null,'a'.repeat(2001),'hi\u0000'])assert.throws(()=>normalizeUserText(input));
});
test('responses output must be actual text, never tool or refusal-only content',()=>{
  assert.equal(extractOpenAIText({output:[{content:[{type:'output_text',text:'Ciao.'}]}]}),'Ciao.');
  assert.throws(()=>extractOpenAIText({output:[{content:[{type:'refusal',text:'no'}]}]}));
});
test('cloud route uses OpenAI API with no model fallback and no cloud storage request',async()=>{
  let intercepted;
  const fetchImpl=async(url,options)=>{intercepted={url,options};return new Response(JSON.stringify({output_text:'Ciao, umano.'}),{status:200})};
  const reply=await openAITextTurn({apiKey:'sk-test-only',text:'Ciao',config,fetchImpl});
  assert.equal(reply,'Ciao, umano.');
  assert.equal(intercepted.url,'https://api.openai.com/v1/responses');
  const payload=JSON.parse(intercepted.options.body);
  assert.equal(payload.store,false);assert.equal(payload.input.at(-1).content,'Ciao');
  assert.ok(payload.instructions.includes('Sei Teddy'));
  assert.ok(!intercepted.options.body.includes('sk-test-only'));
});
test('cloud refusal, oversized data, rate limit and invalid keys fail closed',async()=>{
  for(const [status,code] of [[401,'openai_auth_failed'],[429,'openai_rate_limited']]){
    await assert.rejects(openAITextTurn({apiKey:'sk-test',text:'ciao',config,fetchImpl:async()=>new Response('',{status})}),e=>e.code===code);
  }
  await assert.rejects(openAITextTurn({apiKey:'sk-test',text:'ciao',config,fetchImpl:async()=>new Response('x'.repeat(67000),{status:200})}),e=>e.code==='openai_text_response_too_large');
  await assert.rejects(openAITextTurn({apiKey:'sk-test',text:'ciao',config,fetchImpl:async()=>new Response('{}',{status:200})}),e=>e.code==='openai_text_invalid_reply');
});
test('text service separates LLM readiness from missing ASR and TTS',async()=>{
  const mock=createLocalService({env:{TEDDY_LOCAL_ENGINE_MOCK:'1'}});
  assert.equal(mock.status().textReady,true);assert.match(await mock.text('ciao'),/ciao/i);
  const missing=createLocalService({env:{},runtime:{status:()=>({ready:false,engines:{llm:{healthy:false}}}),config:()=>null}});
  assert.equal(missing.status().textReady,false);
  await assert.rejects(missing.text('ciao'),e=>e.code==='local_text_not_ready');
});
test('chat UI contains only real API/wiring and closes secondary surfaces',()=>{
  const index=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  const chat=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
  assert.match(index,/id="chatForm"/);assert.match(index,/id="chatLog"/);
  assert.match(chat,/fetch\('\/api\/text\/turn'/);assert.match(chat,/body\.reply/);
  assert.match(app,/textChat=installTextChat/);
  assert.match(app,/id='closeDrawer'/);assert.match(app,/function closeMenu/);
  assert.match(app,/if\(localMode\(\)\)drawer\.innerHTML/);
});
test('server route validates provider readiness and persists both real turns',()=>{
  const main=fs.readFileSync(new URL('../server/main.mjs',import.meta.url),'utf8');
  assert.match(main,/u\.pathname==='\/api\/text\/turn'/);
  assert.match(main,/localService\.status\(\)\.textReady/);
  assert.match(main,/state\.addTurn\(conversationId,'user',text\)/);
  assert.match(main,/state\.addTurn\(conversationId,'assistant',reply\)/);
});

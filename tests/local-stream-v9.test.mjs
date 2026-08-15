import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalEngines,parseSseData} from '../server/lib/local-engines.mjs';
import {localTurn,safeStreamSnapshot} from '../server/lib/local-runtime.mjs';

test('SSE parser survives arbitrary chunk boundaries',()=>{const state={buffer:''},out=[];out.push(...parseSseData(state,'data: {"choices":[{"delta":{"content":"Ci"}}]}\n'));out.push(...parseSseData(state,'data: {"choices":[{"delta":{"content":"ao"}}]}\ndata: [DONE]\n'));assert.deepEqual(out,['Ci','ao'])});

test('stream sanitizer never exposes split hidden reasoning',()=>{assert.equal(safeStreamSnapshot('<thi'),null);assert.equal(safeStreamSnapshot('<think>segreto'),null);assert.equal(safeStreamSnapshot('<think>segreto</think> Ciao.'),'Ciao.')});

test('llama adapter exposes SSE as an async response stream',async()=>{const sse='data: {"choices":[{"delta":{"content":"Ciao "}}]}\n\ndata: {"choices":[{"delta":{"content":"Teddy."}}]}\n\ndata: [DONE]\n\n';const engines=createLocalEngines({fetchImpl:async()=>new Response(sse,{status:200,headers:{'content-type':'text/event-stream'}})}),source=await engines.llm('ciao',{stream:true});let text='';for await(const delta of source)text+=delta;assert.equal(text,'Ciao Teddy.')});

test('streaming local turn starts phrase speech before the model completes',async()=>{let release;const firstTts=new Promise(r=>release=r),events=[];async function* model(){yield 'Ciao Teddy. ';await firstTts;yield 'Come va?'}const llm=async(_text,{stream}={})=>stream?model():'Ciao Teddy. Come va?';const result=await localTurn({audio:Buffer.from('x'),asr:async()=> 'ciao',llm,tts:async phrase=>{if(phrase.startsWith('Ciao'))release();return Buffer.alloc(44)},onEvent:e=>events.push(e)});const firstAudio=events.findIndex(e=>e.type==='audio'),secondText=events.findIndex(e=>e.type==='text.delta'&&String(e.text).includes('Come'));assert.ok(firstAudio>=0&&secondText>=0&&firstAudio<secondText);assert.equal(result.text,'Ciao Teddy. Come va?');assert.equal(result.audioChunks,2);assert.ok(result.metrics.ttftMs<=result.metrics.llmMs);assert.ok(result.metrics.speechStartMs<=result.metrics.totalTurnMs)});

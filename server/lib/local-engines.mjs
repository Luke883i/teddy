import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {localOnlyUrl} from './local-policy.mjs';
import {sanitizeSpokenText} from './local-runtime.mjs';

const abortError=()=>Object.assign(new Error('local_aborted'),{name:'AbortError',code:'local_aborted'});
const clip=(value,max)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
export function buildLocalMessages(text,context={}){
  const messages=[{role:'system',content:'Sei Teddy, un piccolo orsetto italiano: breve, naturale, arguto e affettuosamente insofferente. Rispondi normalmente in una o due frasi. Non mostrare ragionamenti interni, markdown o liste lette ad alta voce. /no_think'}];
  if(typeof context.semanticDirective==='string'&&context.semanticDirective.length<2000)messages.push({role:'system',content:context.semanticDirective});
  const memories=(Array.isArray(context.memories)?context.memories:[]).slice(0,6).map(m=>clip(m?.text??m,220)).filter(Boolean);
  if(memories.length)messages.push({role:'system',content:`Memorie persistenti utili, da usare solo se pertinenti: ${memories.join(' | ')}`});
  const turns=(Array.isArray(context.turns)?context.turns:[]).slice(-8);let budget=2600;
  for(const turn of turns){if(!['user','assistant'].includes(turn?.role)||budget<=0)continue;const content=clip(turn.text,Math.min(420,budget));if(!content)continue;messages.push({role:turn.role,content});budget-=content.length;}
  messages.push({role:'user',content:clip(text,2000)});return messages;
}
export function parseSseData(state,chunk){state.buffer=(state.buffer||'')+chunk;const lines=state.buffer.split('\n');state.buffer=lines.pop()||'';const out=[];for(const line of lines){const s=line.trim();if(!s.startsWith('data:'))continue;const data=s.slice(5).trim();if(!data||data==='[DONE]')continue;try{const body=JSON.parse(data),delta=body?.choices?.[0]?.delta?.content;if(typeof delta==='string'&&delta)out.push(delta)}catch{}}return out;}
export async function runCommand(command,args=[],{signal,stdin,maxOutput=1_000_000,spawnImpl=spawn,env={}}={}){
  if(signal?.aborted)throw abortError();
  return await new Promise((resolve,reject)=>{
    const child=spawnImpl(command,args,{env:{...process.env,...env},stdio:['pipe','pipe','pipe'],shell:false});
    const out=[],err=[];let outBytes=0,errBytes=0,settled=false;
    const finish=(fn,v)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',onAbort);fn(v)};
    const onAbort=()=>{child.kill('SIGKILL');finish(reject,abortError())};signal?.addEventListener('abort',onAbort,{once:true});
    child.on('error',e=>finish(reject,e));
    child.stdout.on('data',b=>{outBytes+=b.length;if(outBytes>maxOutput){child.kill('SIGKILL');finish(reject,Object.assign(new Error('local_engine_output_too_large'),{code:'local_engine_output_too_large'}));return}out.push(b)});
    child.stderr.on('data',b=>{errBytes+=b.length;if(errBytes<=64_000)err.push(b)});
    child.on('exit',(code,signalName)=>{if(settled)return;if(code!==0)return finish(reject,Object.assign(new Error('local_engine_failed'),{code:'local_engine_failed',exitCode:code,signal:signalName,stderr:Buffer.concat(err).toString('utf8').slice(0,2000)}));finish(resolve,Buffer.concat(out))});
    if(stdin!=null)child.stdin.end(stdin);else child.stdin.end();
  });
}

export function createLocalEngines({llamaUrl='http://127.0.0.1:8080',asrCommand,asrArgs=[],ttsCommand,ttsArgs=[],tmpDir=os.tmpdir(),fetchImpl=fetch,run=runCommand}={}){
  const base=localOnlyUrl(llamaUrl),temp=suffix=>path.join(tmpDir,`teddy-${process.pid}-${crypto.randomUUID()}${suffix}`);
  const requestBody=(text,context,stream)=>({model:'local',stream,max_tokens:context?.extended?192:112,temperature:.35,messages:buildLocalMessages(text,context)});
  async function* streamCompletion(text,{signal,context}={}){
    const url=new URL('/v1/chat/completions',base),response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','accept':'text/event-stream'},body:JSON.stringify(requestBody(text,context,true)),signal});
    if(!response.ok||!response.body)throw Object.assign(new Error('local_llm_failed'),{code:'local_llm_failed',status:response.status});
    const reader=response.body.getReader(),decoder=new TextDecoder(),state={buffer:''};let chars=0;
    for(;;){if(signal?.aborted)throw abortError();const {done,value}=await reader.read();for(const delta of parseSseData(state,decoder.decode(value||new Uint8Array(),{stream:!done}))){chars+=delta.length;if(chars>1600)throw Object.assign(new Error('local_llm_output_too_large'),{code:'local_llm_output_too_large'});yield delta}if(done)break}
    for(const delta of parseSseData(state,'\n'))yield delta;
  }
  return {
    async asr(audio,{signal}={}){if(!asrCommand)throw Object.assign(new Error('local_asr_unavailable'),{code:'local_asr_unavailable'});const wav=temp('.wav');await fs.promises.writeFile(wav,audio,{mode:0o600});try{return (await run(asrCommand,[...asrArgs,wav],{signal,maxOutput:128_000})).toString('utf8').trim()}finally{await fs.promises.rm(wav,{force:true})}},
    async llm(text,{signal,context,stream=false}={}){if(stream)return streamCompletion(text,{signal,context});const url=new URL('/v1/chat/completions',base);const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody(text,context,false)),signal});if(!response.ok)throw Object.assign(new Error('local_llm_failed'),{code:'local_llm_failed',status:response.status});const reader=response.body?.getReader();if(!reader)throw Object.assign(new Error('local_llm_empty'),{code:'local_llm_empty'});let bytes=0,chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>32768)throw Object.assign(new Error('local_llm_response_too_large'),{code:'local_llm_response_too_large'});chunks.push(value)}}finally{reader.releaseLock()};let body;try{body=JSON.parse(Buffer.concat(chunks.map(x=>Buffer.from(x))).toString('utf8'))}catch{throw Object.assign(new Error('local_llm_invalid_json'),{code:'local_llm_invalid_json'})}return sanitizeSpokenText(body?.choices?.[0]?.message?.content||'')},
    async tts(text,{signal}={}){if(!ttsCommand)throw Object.assign(new Error('local_tts_unavailable'),{code:'local_tts_unavailable'});const txt=temp('.txt'),wav=temp('.wav');await fs.promises.writeFile(txt,String(text),{mode:0o600});try{await run(ttsCommand,[...ttsArgs,txt,wav],{signal,maxOutput:128_000});const b=await fs.promises.readFile(wav);if(b.length<44||b.subarray(0,4).toString()!=='RIFF')throw Object.assign(new Error('local_tts_invalid_wav'),{code:'local_tts_invalid_wav'});return b}finally{await fs.promises.rm(txt,{force:true});await fs.promises.rm(wav,{force:true})}}
  };
}

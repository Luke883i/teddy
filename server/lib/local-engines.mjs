import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {localOnlyUrl} from './local-policy.mjs';
import {sanitizeSpokenText} from './local-runtime.mjs';
import {timeoutSignal} from './runtime-installation.mjs';

const abortError=()=>Object.assign(new Error('local_aborted'),{name:'AbortError',code:'local_aborted'});
const timeoutError=()=>Object.assign(new Error('local_engine_timeout'),{code:'local_engine_timeout'});
const clip=(value,max)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
export function buildLocalMessages(text,context={}){
  const messages=[{role:'system',content:'Sei Teddy, un piccolo orsetto italiano: breve, naturale, arguto e affettuosamente insofferente. Rispondi normalmente in una o due frasi. Non mostrare ragionamenti interni, markdown o liste lette ad alta voce. /no_think'}];
  const memories=(Array.isArray(context.memories)?context.memories:[]).slice(0,6).map(m=>clip(m?.text??m,220)).filter(Boolean);
  if(memories.length)messages.push({role:'system',content:`Memorie persistenti utili, da usare solo se pertinenti: ${memories.join(' | ')}`});
  const turns=(Array.isArray(context.turns)?context.turns:[]).slice(-8);let budget=2600;
  for(const turn of turns){if(!['user','assistant'].includes(turn?.role)||budget<=0)continue;const content=clip(turn.text,Math.min(420,budget));if(!content)continue;messages.push({role:turn.role,content});budget-=content.length;}
  messages.push({role:'user',content:clip(text,1200)});return messages;
}
export function parseSseData(state,chunk){state.buffer=(state.buffer||'')+chunk;const lines=state.buffer.split('\n');state.buffer=lines.pop()||'';const out=[];for(const line of lines){const s=line.trim();if(!s.startsWith('data:'))continue;const data=s.slice(5).trim();if(!data||data==='[DONE]')continue;try{const body=JSON.parse(data),delta=body?.choices?.[0]?.delta?.content;if(typeof delta==='string'&&delta)out.push(delta)}catch{}}return out;}
export async function runCommand(command,args=[],{signal,stdin,maxOutput=1_000_000,spawnImpl=spawn,env={},timeoutMs=45_000}={}){
  if(signal?.aborted)throw abortError();
  return await new Promise((resolve,reject)=>{
    const child=spawnImpl(command,args,{env:{...process.env,...env},stdio:['pipe','pipe','pipe'],shell:false});
    const out=[],err=[];let outBytes=0,errBytes=0,settled=false,timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;try{child.kill('SIGKILL')}catch{}finish(reject,timeoutError())},Math.max(1,timeoutMs));timer.unref?.();
    const finish=(fn,v)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',onAbort);fn(v)};
    const onAbort=()=>{try{child.kill('SIGKILL')}catch{}finish(reject,abortError())};signal?.addEventListener('abort',onAbort,{once:true});
    child.on('error',e=>finish(reject,e));
    child.stdout.on('data',b=>{outBytes+=b.length;if(outBytes>maxOutput){try{child.kill('SIGKILL')}catch{}finish(reject,Object.assign(new Error('local_engine_output_too_large'),{code:'local_engine_output_too_large'}));return}out.push(b)});
    child.stderr.on('data',b=>{errBytes+=b.length;if(errBytes<=64_000)err.push(b)});
    child.on('exit',(code,signalName)=>{if(settled||timedOut)return;if(code!==0)return finish(reject,Object.assign(new Error('local_engine_failed'),{code:'local_engine_failed',exitCode:code,signal:signalName,stderr:Buffer.concat(err).toString('utf8').slice(0,2000)}));finish(resolve,Buffer.concat(out))});
    if(stdin!=null)child.stdin.end(stdin);else child.stdin.end();
  });
}

export function createLocalEngines({llamaUrl='http://127.0.0.1:8080',asrCommand,asrArgs=[],ttsCommand,ttsArgs=[],tmpDir=os.tmpdir(),fetchImpl=fetch,run=runCommand,asrTimeoutMs=45_000,llmTimeoutMs=45_000,ttsTimeoutMs=45_000}={}){
  const base=localOnlyUrl(llamaUrl),temp=suffix=>path.join(tmpDir,`teddy-${process.pid}-${crypto.randomUUID()}${suffix}`);
  const requestBody=(text,context,stream)=>({model:'local',stream,max_tokens:96,temperature:.45,messages:buildLocalMessages(text,context)});
  async function* streamCompletion(text,{signal,context}={}){
    const guard=timeoutSignal(signal,{timeoutMs:llmTimeoutMs,code:'local_llm_timeout'});
    try{
      const url=new URL('/v1/chat/completions',base),response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','accept':'text/event-stream'},body:JSON.stringify(requestBody(text,context,true)),signal:guard.signal});
      if(!response.ok||!response.body)throw Object.assign(new Error('local_llm_failed'),{code:'local_llm_failed',status:response.status});
      const reader=response.body.getReader(),decoder=new TextDecoder(),state={buffer:''};let chars=0;
      for(;;){if(guard.signal.aborted)throw guard.timedOut()?Object.assign(new Error('local_llm_timeout'),{code:'local_llm_timeout'}):abortError();const {done,value}=await reader.read();for(const delta of parseSseData(state,decoder.decode(value||new Uint8Array(),{stream:!done}))){chars+=delta.length;if(chars>1600)throw Object.assign(new Error('local_llm_output_too_large'),{code:'local_llm_output_too_large'});yield delta}if(done)break}
      for(const delta of parseSseData(state,'\n'))yield delta;
    }finally{guard.cleanup()}
  }
  return {
    async asr(audio,{signal}={}){if(!asrCommand)throw Object.assign(new Error('local_asr_unavailable'),{code:'local_asr_unavailable'});const wav=temp('.wav');await fs.promises.writeFile(wav,audio,{mode:0o600});try{return (await run(asrCommand,[...asrArgs,wav],{signal,maxOutput:128_000,timeoutMs:asrTimeoutMs})).toString('utf8').trim()}finally{await fs.promises.rm(wav,{force:true})}},
    async llm(text,{signal,context,stream=false}={}){if(stream)return streamCompletion(text,{signal,context});const guard=timeoutSignal(signal,{timeoutMs:llmTimeoutMs,code:'local_llm_timeout'});try{const url=new URL('/v1/chat/completions',base);const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody(text,context,false)),signal:guard.signal});if(!response.ok)throw Object.assign(new Error('local_llm_failed'),{code:'local_llm_failed',status:response.status});const body=await response.json();return sanitizeSpokenText(body?.choices?.[0]?.message?.content||'')}catch(e){if(guard.timedOut())throw Object.assign(new Error('local_llm_timeout'),{code:'local_llm_timeout',cause:e});throw e}finally{guard.cleanup()}},
    async tts(text,{signal}={}){if(!ttsCommand)throw Object.assign(new Error('local_tts_unavailable'),{code:'local_tts_unavailable'});const txt=temp('.txt'),wav=temp('.wav');await fs.promises.writeFile(txt,String(text),{mode:0o600});try{await run(ttsCommand,[...ttsArgs,txt,wav],{signal,maxOutput:128_000,timeoutMs:ttsTimeoutMs});const b=await fs.promises.readFile(wav);if(b.length<44||b.subarray(0,4).toString()!=='RIFF')throw Object.assign(new Error('local_tts_invalid_wav'),{code:'local_tts_invalid_wav'});return b}finally{await fs.promises.rm(txt,{force:true});await fs.promises.rm(wav,{force:true})}}
  };
}

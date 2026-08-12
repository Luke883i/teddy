import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {localOnlyUrl} from './local-policy.mjs';
import {sanitizeSpokenText} from './local-runtime.mjs';

const abortError=()=>Object.assign(new Error('local_aborted'),{name:'AbortError',code:'local_aborted'});
export async function runCommand(command,args=[],{signal,stdin,maxOutput=1_000_000,spawnImpl=spawn,env={}}={}){
  if(signal?.aborted)throw abortError();
  return await new Promise((resolve,reject)=>{
    const child=spawnImpl(command,args,{env:{...process.env,...env},stdio:['pipe','pipe','pipe'],shell:false});
    const out=[],err=[];let outBytes=0,errBytes=0,settled=false;
    const finish=(fn,v)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',onAbort);fn(v)};
    const onAbort=()=>{child.kill('SIGKILL');finish(reject,abortError())};
    signal?.addEventListener('abort',onAbort,{once:true});
    child.on('error',e=>finish(reject,e));
    child.stdout.on('data',b=>{outBytes+=b.length;if(outBytes>maxOutput){child.kill('SIGKILL');finish(reject,Object.assign(new Error('local_engine_output_too_large'),{code:'local_engine_output_too_large'}));return}out.push(b)});
    child.stderr.on('data',b=>{errBytes+=b.length;if(errBytes<=64_000)err.push(b)});
    child.on('exit',(code,signalName)=>{if(settled)return;if(code!==0)return finish(reject,Object.assign(new Error('local_engine_failed'),{code:'local_engine_failed',exitCode:code,signal:signalName,stderr:Buffer.concat(err).toString('utf8').slice(0,2000)}));finish(resolve,Buffer.concat(out))});
    if(stdin!=null)child.stdin.end(stdin);else child.stdin.end();
  });
}

export function createLocalEngines({llamaUrl='http://127.0.0.1:8080',asrCommand,asrArgs=[],ttsCommand,ttsArgs=[],tmpDir=os.tmpdir(),fetchImpl=fetch,run=runCommand}={}){
  const base=localOnlyUrl(llamaUrl);
  const temp=suffix=>path.join(tmpDir,`teddy-${process.pid}-${crypto.randomUUID()}${suffix}`);
  return {
    async asr(audio,{signal}={}){if(!asrCommand)throw Object.assign(new Error('local_asr_unavailable'),{code:'local_asr_unavailable'});const wav=temp('.wav');await fs.promises.writeFile(wav,audio,{mode:0o600});try{return (await run(asrCommand,[...asrArgs,wav],{signal,maxOutput:128_000})).toString('utf8').trim()}finally{await fs.promises.rm(wav,{force:true})}},
    async llm(text,{signal}={}){const url=new URL('/v1/chat/completions',base);const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'local',stream:false,max_tokens:96,temperature:.45,messages:[{role:'system',content:'Sei Teddy, un piccolo orsetto italiano: breve, naturale, arguto e affettuosamente insofferente. Non mostrare ragionamenti interni. /no_think'},{role:'user',content:String(text)}]}),signal});if(!response.ok)throw Object.assign(new Error('local_llm_failed'),{code:'local_llm_failed',status:response.status});const body=await response.json();return sanitizeSpokenText(body?.choices?.[0]?.message?.content||'')},
    async tts(text,{signal}={}){if(!ttsCommand)throw Object.assign(new Error('local_tts_unavailable'),{code:'local_tts_unavailable'});const txt=temp('.txt'),wav=temp('.wav');await fs.promises.writeFile(txt,String(text),{mode:0o600});try{await run(ttsCommand,[...ttsArgs,txt,wav],{signal,maxOutput:128_000});const b=await fs.promises.readFile(wav);if(b.length<44||b.subarray(0,4).toString()!=='RIFF')throw Object.assign(new Error('local_tts_invalid_wav'),{code:'local_tts_invalid_wav'});return b}finally{await fs.promises.rm(txt,{force:true});await fs.promises.rm(wav,{force:true})}}
  };
}

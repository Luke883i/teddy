import {spawn} from 'node:child_process';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clock=()=>Number(process.hrtime.bigint()/1000000n);
export class ProcessSupervisor{
  constructor({name,command,args=[],env={},health,spawnImpl=spawn,maxRestarts=3,backoffMs=100}={}){Object.assign(this,{name,command,args,env,health,spawnImpl,maxRestarts,backoffMs});this.child=null;this.restarts=0;this.stopping=false;}
  async start(){if(this.child&&!this.child.killed)return this.child;if(!this.command)throw new Error(`${this.name||'engine'}_command_missing`);this.stopping=false;this.child=this.spawnImpl(this.command,this.args,{env:{...process.env,...this.env},stdio:['ignore','pipe','pipe']});this.child.once('exit',()=>{const restart=!this.stopping&&this.restarts<this.maxRestarts;this.child=null;if(restart){this.restarts++;setTimeout(()=>this.start().catch(()=>{}),this.backoffMs*Math.min(this.restarts,10)).unref?.();}});return this.child;}
  async waitReady({timeoutMs=5000,intervalMs=50,signal}={}){const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');if(this.health&&await this.health())return true;await sleep(intervalMs);}throw Object.assign(new Error(`${this.name}_not_ready`),{code:'local_engine_timeout'});}
  stop(){this.stopping=true;if(this.child&&!this.child.killed)this.child.kill('SIGTERM');this.child=null;}
  status(){return {name:this.name,running:!!this.child&&!this.child.killed,restarts:this.restarts};}
}
export function sanitizeSpokenText(text=''){
  return String(text).replace(/<think>[\s\S]*?<\/think>/gi,' ').replace(/```[\s\S]*?```/g,' ').replace(/[*_#>`~]/g,' ').replace(/^\s*[-+]\s+/gm,'').replace(/\s+/g,' ').trim().slice(0,1200);
}
export function phraseChunks(text,{maxChars=180}={}){
  const clean=sanitizeSpokenText(text),out=[];let buf='';for(const token of clean.split(/(?<=[.!?;:])\s+/)){if(!token)continue;if(buf&&buf.length+1+token.length>maxChars){out.push(buf);buf=token}else buf=buf?`${buf} ${token}`:token;if(/[.!?;:]$/.test(buf)&&buf.length>=24){out.push(buf);buf='';}}if(buf)out.push(buf);return out;
}
export async function localTurn({audio,asr,llm,tts,onEvent=()=>{},signal}){
  const turnStart=clock();if(signal?.aborted)throw signal.reason;onEvent({type:'state',state:'transcribing'});const asrStart=clock(),transcript=String(await asr(audio,{signal})||'').trim(),asrMs=clock()-asrStart;if(!transcript)throw Object.assign(new Error('local_asr_empty'),{code:'local_asr_empty'});onEvent({type:'transcript',text:transcript});onEvent({type:'state',state:'thinking'});
  const llmStart=clock(),raw=await llm(transcript,{signal}),llmMs=clock()-llmStart;const text=sanitizeSpokenText(raw);if(!text)throw Object.assign(new Error('local_llm_empty'),{code:'local_llm_empty'});onEvent({type:'text.delta',text});onEvent({type:'state',state:'speaking'});
  let seq=0,ttsFirstPcmMs=null;const ttsStart=clock();for(const phrase of phraseChunks(text)){if(signal?.aborted)throw signal.reason;const chunk=await tts(phrase,{signal});if(!chunk?.length)throw Object.assign(new Error('local_tts_empty'),{code:'local_tts_empty'});if(ttsFirstPcmMs==null)ttsFirstPcmMs=clock()-ttsStart;onEvent({type:'audio',seq:seq++,data:Buffer.from(chunk).toString('base64'),mime:'audio/wav'});}const metrics={asrMs,ttftMs:llmMs,llmMs,ttsFirstPcmMs:ttsFirstPcmMs??0,totalTurnMs:clock()-turnStart,audioChunks:seq};onEvent({type:'telemetry',metrics});onEvent({type:'done'});return {transcript,text,audioChunks:seq,metrics};
}

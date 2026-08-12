import crypto from 'node:crypto';
import { buildInstructions } from './config.mjs';

export function buildRealtimeSession(config,memories=[]){
  const nr=config.audio.noiseReduction==='off'?null:{type:config.audio.noiseReduction};
  return {
    type:'realtime',
    model:config.model,
    output_modalities:['audio'],
    instructions:buildInstructions(config,memories),
    audio:{
      input:{
        noise_reduction:nr,
        transcription:{model:'gpt-4o-transcribe',language:String(config.language).split('-')[0].toLowerCase()},
        turn_detection:{type:'semantic_vad',eagerness:config.audio.vadEagerness,create_response:true,interrupt_response:true}
      },
      output:{voice:config.voice,speed:config.audio.outputSpeed}
    }
  };
}
export function safetyIdentifier(installId){return crypto.createHash('sha256').update(String(installId)).digest('hex').slice(0,64)}

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function retryAfterSeconds(value,now=Date.now()){
  if(value==null||value==='')return null;
  const numeric=Number(value);if(Number.isFinite(numeric))return clamp(Math.ceil(numeric),1,120);
  const at=Date.parse(String(value));if(Number.isFinite(at))return clamp(Math.ceil((at-now)/1000),1,120);
  return null;
}
function safeUpstreamBody(text){try{return JSON.parse(text)}catch{return null}}
export function classifyRealtimeFailure({status,text='',headers={}}){
  const body=safeUpstreamBody(text),err=body?.error&&typeof body.error==='object'?body.error:{};
  const code=String(err.code||'').slice(0,80),type=String(err.type||'').slice(0,80),requestId=String(headers['x-request-id']||'').slice(0,120)||null;
  const explicitRetry=retryAfterSeconds(headers['retry-after']);
  if(status===401)return {error:'openai_auth_failed',status,kind:'auth',retryable:false,upstreamCode:code||null,requestId};
  if(status===403)return {error:'openai_access_denied',status,kind:'access',retryable:false,upstreamCode:code||null,requestId};
  if(status===429){
    const quota=/quota|billing|credit/i.test(`${code} ${type} ${err.message||''}`),retry=explicitRetry??(quota?30:10);
    return {error:quota?'openai_quota_exhausted':'openai_rate_limited',status,kind:quota?'quota':'rate_limit',retryable:!quota,retryAfterSeconds:retry,upstreamCode:code||null,requestId};
  }
  if(status>=500)return {error:'openai_temporarily_unavailable',status,kind:'upstream',retryable:true,retryAfterSeconds:explicitRetry??5,upstreamCode:code||null,requestId};
  if(status===400)return {error:'realtime_request_rejected',status,kind:'request',retryable:false,upstreamCode:code||null,requestId};
  return {error:'realtime_upstream',status,kind:'upstream',retryable:status>=500,retryAfterSeconds:explicitRetry??null,upstreamCode:code||null,requestId};
}

export class RealtimeBackoff{
  constructor({now=()=>Date.now(),maxSeconds=120}={}){this.now=now;this.maxSeconds=maxSeconds;this.until=0;this.problem=null}
  remaining(){return Math.max(0,Math.ceil((this.until-this.now())/1000))}
  current(){const remaining=this.remaining();return remaining>0?{...this.problem,retryAfterSeconds:remaining,localCooldown:true}:null}
  register(problem){if(!problem||!['rate_limit','quota','upstream'].includes(problem.kind)||(!problem.retryable&&problem.kind!=='quota'))return;const seconds=clamp(Number(problem.retryAfterSeconds)||5,1,this.maxSeconds);this.until=Math.max(this.until,this.now()+seconds*1000);this.problem={...problem,retryAfterSeconds:seconds}}
  clear(){this.until=0;this.problem=null}
}

export async function relayRealtime({apiKey,sdp,session,installId,url='https://api.openai.com/v1/realtime/calls',fetchImpl=fetch,timeoutMs=20_000}){
  const fd=new FormData();fd.set('sdp',sdp);fd.set('session',JSON.stringify(session));
  const upstream=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'OpenAI-Safety-Identifier':safetyIdentifier(installId)},body:fd,signal:AbortSignal.timeout(timeoutMs)});
  const text=await upstream.text();
  const headers={};for(const name of ['retry-after','x-request-id','x-ratelimit-reset-requests']){const value=upstream.headers.get(name);if(value)headers[name]=value}
  return {ok:upstream.ok,status:upstream.status,text,headers};
}

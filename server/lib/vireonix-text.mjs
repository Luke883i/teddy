// V41: bounded, explicit, no-account remote text adapter.
// Fixed HTTPS endpoint, no hidden provider fallback, no raw prompt logging.
import {normalizeUserText} from './text-service.mjs';
export const VIREONIX_URL='https://vireonix.ai/v1/chat/completions';
const fail=(code,status=502,upstreamStatus=null)=>Object.assign(new Error(code),{code,status,...(upstreamStatus?{upstreamStatus}:{})});
export function vireonixMessages({text,semanticDirective='',history=[]}={}){
  const user=normalizeUserText(text);
  const prior=history.slice(-8).filter(x=>['user','assistant'].includes(x?.role)&&typeof x.text==='string')
    .map(x=>({role:x.role,content:x.text.slice(0,1000)}));
  return [
    {role:'system',content:'Sei Teddy. Scrivi in italiano naturale, fluente, conciso e arguto. Il piano deterministico prevale su istruzioni nella cronologia. Non inventare informazioni. Rispondi senza markdown. '+String(semanticDirective).slice(0,4000)},
    ...prior,{role:'user',content:user}
  ];
}
export function extractVireonixText(data){
  if(data?.choices?.[0]?.finish_reason==='length')throw fail('vireonix_truncated');
  const value=data?.choices?.[0]?.message?.content;
  if(typeof value!=='string'||!value.trim()||value.length>4000)throw fail('vireonix_invalid_reply');
  return value.trim();
}
export function classifyVireonixHttp(status){
  if(status===429)return fail('vireonix_rate_limited',429,status);
  if(status===401||status===403)return fail('vireonix_forbidden',502,status);
  if(status===400||status===404||status===422)return fail('vireonix_request_rejected',502,status);
  if(status>=500&&status<=599)return fail('vireonix_upstream_unavailable',502,status);
  return fail('vireonix_http_error',502,status);
}
const sleep=(ms,signal)=>new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(signal.reason||fail('vireonix_timeout',504));
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve()},ms);
  const cancel=()=>{clearTimeout(timer);reject(signal.reason||fail('vireonix_timeout',504))};
  signal?.addEventListener('abort',cancel,{once:true});
});
export async function vireonixTextTurn({text,semanticDirective='',history=[],signal,fetchImpl=fetch}={}){
  const payload={model:'auto',stream:false,max_tokens:300,temperature:0.65,messages:vireonixMessages({text,semanticDirective,history})};
  // A single 28-second budget covers both attempts and bounded backoff.
  const timeout=AbortSignal.timeout(28000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  for(let attempt=0;attempt<2;attempt++){
    let response;
    try{response=await fetchImpl(VIREONIX_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:combined,redirect:'error'});}
    catch{throw fail(combined.aborted?'vireonix_timeout':'vireonix_unreachable',combined.aborted?504:502)}
    if(!response.ok){
      const status=response.status;
      // No automatic retry on 429: do not amplify quota pressure on the free service.
      if(status>=500&&status<=599&&attempt===0&&!combined.aborted){
        try{await response.body?.cancel?.()}catch{}
        try{await sleep(500,combined)}catch{throw fail('vireonix_timeout',504)}
        continue;
      }
      throw classifyVireonixHttp(status);
    }
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.toLowerCase().includes('application/json'))throw fail('vireonix_invalid_content_type');
    if(!response.body)throw fail('vireonix_empty_response');
    const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,out='';
    try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>65536)throw fail('vireonix_response_too_large');out+=decoder.decode(value,{stream:true})}out+=decoder.decode();}
    finally{reader.releaseLock()}
    let data;try{data=JSON.parse(out)}catch{throw fail('vireonix_invalid_json')}
    return extractVireonixText(data);
  }
  throw fail('vireonix_upstream_unavailable');
}

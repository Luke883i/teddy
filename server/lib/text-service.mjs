import {buildInstructions} from './config.mjs';

export function normalizeUserText(value){
  if(typeof value!=='string')throw new TypeError('text_input_invalid');
  const text=value.replace(/\r\n?/g,'\n').trim();
  if(!text||text.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw new TypeError('text_input_invalid');
  return text;
}
export function extractOpenAIText(payload){
  const parts=[];
  if(typeof payload?.output_text==='string')parts.push(payload.output_text);
  else for(const item of payload?.output||[])for(const part of item?.content||[])if(part?.type==='output_text'&&typeof part.text==='string')parts.push(part.text);
  const output=parts.join('').trim();
  if(!output||output.length>4000)throw Object.assign(new Error('openai_text_invalid_reply'),{code:'openai_text_invalid_reply',status:502});
  return output;
}
export async function openAITextTurn({apiKey,text,config,memories=[],history=[],model='gpt-4.1-mini',signal,fetchImpl=fetch,semanticDirective=''}={}){
  if(!apiKey)throw Object.assign(new Error('openai_key_missing'),{code:'openai_key_missing',status:409});
  if(!/^[a-z0-9][a-z0-9._-]{2,79}$/i.test(model))throw Object.assign(new Error('openai_text_model_invalid'),{code:'openai_text_model_invalid',status:500});
  const prior=history.slice(-10).filter(x=>['user','assistant'].includes(x?.role)&&typeof x.text==='string').map(x=>({role:x.role,content:x.text.slice(0,2000)}));
  const payload={model,store:false,max_output_tokens:256,instructions:buildInstructions(config,memories)+(semanticDirective?' '+semanticDirective.slice(0,1800):''),input:[...prior,{role:'user',content:normalizeUserText(text)}]};
  const combined=AbortSignal.any([AbortSignal.timeout(25000),...(signal?[signal]:[])]);
  let response;
  try{response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify(payload),signal:combined})}
  catch{throw Object.assign(new Error('openai_text_unreachable'),{code:combined.aborted?'openai_text_timeout':'openai_text_unreachable',status:combined.aborted?504:502})}
  if(!response.ok){const status=response.status;throw Object.assign(new Error('openai_text_http_error'),{code:status===401?'openai_auth_failed':status===429?'openai_rate_limited':'openai_text_http_error',status:status===401?401:status===429?429:502})}
  if(!response.body)throw Object.assign(new Error('openai_text_empty_response'),{code:'openai_text_empty_response',status:502});
  const reader=response.body.getReader(),decoder=new TextDecoder();let out='',bytes=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>65536)throw Object.assign(new Error('openai_text_response_too_large'),{code:'openai_text_response_too_large',status:502});out+=decoder.decode(value,{stream:true})}
    out+=decoder.decode();
  }finally{reader.releaseLock()}
  try{return extractOpenAIText(JSON.parse(out))}
  catch(e){if(e?.code)throw e;throw Object.assign(new Error('openai_text_invalid_json'),{code:'openai_text_invalid_json',status:502})}
}

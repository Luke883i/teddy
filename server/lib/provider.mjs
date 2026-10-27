export const LOCAL_EVENTS = Object.freeze(['state','transcript','text.delta','audio','done','error']);
export function normalizeProvider(value='local'){
  const v=String(value||'local').toLowerCase();
  return ['openai','vireonix','local'].includes(v)?v:'local';
}
export function providerCapabilities(provider){
  if(provider==='vireonix')return {local:false,offline:false,accountRequired:false,transport:'https'};
  return provider==='openai'
    ? {local:false,offline:false,accountRequired:true,transport:'webrtc'}
    : {local:true,offline:true,accountRequired:false,transport:'ndjson'};
}
export function event(type,payload={}){
  if(!LOCAL_EVENTS.includes(type)) throw new Error('invalid_local_event');
  return {type,...payload};
}
export function ndjson(value){ return `${JSON.stringify(value)}\n`; }

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
export async function relayRealtime({apiKey,sdp,session,installId,url='https://api.openai.com/v1/realtime/calls',fetchImpl=fetch,timeoutMs=20_000}){
  const fd=new FormData();fd.set('sdp',sdp);fd.set('session',JSON.stringify(session));
  const upstream=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'OpenAI-Safety-Identifier':safetyIdentifier(installId)},body:fd,signal:AbortSignal.timeout(timeoutMs)});
  const text=await upstream.text();return {ok:upstream.ok,status:upstream.status,text};
}

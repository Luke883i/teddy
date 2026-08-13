import {TeddyRealtime} from '../realtime.js';
import {motionIntentsFromText,motionIntentsFromTelemetry,sanitizeMotionIntent} from './motion-contract.js';

function dispatch(intent){const safe=sanitizeMotionIntent(intent);if(!safe)return;if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('teddy:motion-intent',{detail:safe}));}
function dispatchMany(items){for(const item of items||[])dispatch(item);}
function consumeRuntimeEvent(event={}){
  dispatchMany(motionIntentsFromTelemetry(event));
  const t=event?.type||'';
  if(t==='conversation.item.input_audio_transcription.completed')dispatchMany(motionIntentsFromText(event.transcript||'',{role:'user'}));
  if(t==='response.audio_transcript.done'||t==='response.output_audio_transcript.done')dispatchMany(motionIntentsFromText(event.transcript||'',{role:'assistant'}));
}
function consumeLocalEvent(event={}){
  if(event?.type==='motion'&&event.motion)dispatch(event.motion);
  dispatchMany(motionIntentsFromTelemetry(event));
  if(event?.type==='transcript')dispatchMany(motionIntentsFromText(event.text||'',{role:'user'}));
  if(event?.type==='text.delta')dispatchMany(motionIntentsFromText(event.text||'',{role:'assistant'}));
}
export function installMotionTelemetryBridge(){
  if(TeddyRealtime.prototype.__motionBridgeV8)return;TeddyRealtime.prototype.__motionBridgeV8=true;
  const original=TeddyRealtime.prototype.emit;
  TeddyRealtime.prototype.emit=function(type,detail){if(type==='event')consumeRuntimeEvent(detail);return original.call(this,type,detail)};
  globalThis.window?.addEventListener?.('teddy:local-event',e=>consumeLocalEvent(e.detail));
}

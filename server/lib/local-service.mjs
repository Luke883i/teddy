import {createLocalEngines} from './local-engines.mjs';
import {localTurn} from './local-runtime.mjs';
import {ndjson,providerCapabilities} from './provider.mjs';

const mockWav=()=>{const b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(36,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(0,40);return b};

export function createLocalService({env=process.env,fetchImpl=fetch}={}){
  const mock=env.TEDDY_LOCAL_ENGINE_MOCK==='1';
  const engines=mock?{
    asr:async(_audio,{signal}={})=>{if(signal?.aborted)throw signal.reason;return env.TEDDY_LOCAL_MOCK_TRANSCRIPT||'ciao Teddy'},
    llm:async(text,{signal}={})=>{if(signal?.aborted)throw signal.reason;return `Ciao. Ho sentito: ${String(text).slice(0,120)}.`},
    tts:async(_text,{signal}={})=>{if(signal?.aborted)throw signal.reason;return mockWav()}
  }:createLocalEngines({
    llamaUrl:env.TEDDY_LLAMA_URL||'http://127.0.0.1:8080',
    asrCommand:env.TEDDY_ASR_COMMAND,
    asrArgs:env.TEDDY_ASR_ARGS?JSON.parse(env.TEDDY_ASR_ARGS):[],
    ttsCommand:env.TEDDY_TTS_COMMAND,
    ttsArgs:env.TEDDY_TTS_ARGS?JSON.parse(env.TEDDY_TTS_ARGS):[],
    fetchImpl
  });
  const configured=mock||!!(env.TEDDY_ASR_COMMAND&&env.TEDDY_TTS_COMMAND);
  return {
    status(){return {provider:'local',...providerCapabilities('local'),configured,mock,engines:{asr:mock||!!env.TEDDY_ASR_COMMAND,llm:true,tts:mock||!!env.TEDDY_TTS_COMMAND}}},
    async turn(audio,{signal,onEvent}={}){if(!configured)throw Object.assign(new Error('local_engines_not_configured'),{code:'local_engines_not_configured',status:503});return localTurn({audio,asr:engines.asr,llm:engines.llm,tts:engines.tts,signal,onEvent})},
    async stream(audio,res,{signal}={}){res.writeHead(200,{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});try{await this.turn(audio,{signal,onEvent:e=>res.write(ndjson(e))})}catch(e){if(!res.writableEnded)res.write(ndjson({type:'error',error:e?.code||'local_turn_failed'}))}finally{if(!res.writableEnded)res.end()}}
  };
}

import {createLocalEngines} from './local-engines.mjs';
import {localTurn} from './local-runtime.mjs';
import {ndjson,providerCapabilities} from './provider.mjs';
import {readLocalContext,resolveTeddyHome} from './local-context.mjs';

const mockWav=()=>{const b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(36,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(0,40);return b};

export function createLocalService({env=process.env,fetchImpl=fetch,runtime=null,contextProvider}={}){
  const mock=env.TEDDY_LOCAL_ENGINE_MOCK==='1';
  const loadContext=contextProvider||(()=>readLocalContext(resolveTeddyHome(env)));
  const mockEngines={asr:async(_audio,{signal}={})=>{if(signal?.aborted)throw signal.reason;return env.TEDDY_LOCAL_MOCK_TRANSCRIPT||'ciao Teddy'},llm:async(text,{signal}={})=>{if(signal?.aborted)throw signal.reason;return `Ciao. Ho sentito: ${String(text).slice(0,120)}.`},tts:async(_text,{signal}={})=>{if(signal?.aborted)throw signal.reason;return mockWav()}};
  function runtimeStatus(){return runtime?.status?.()||null}
  function resolvedConfig(){if(runtime?.config?.())return runtime.config();if(env.TEDDY_ASR_COMMAND&&env.TEDDY_TTS_COMMAND)return {llamaUrl:env.TEDDY_LLAMA_URL||'http://127.0.0.1:8080',asrCommand:env.TEDDY_ASR_COMMAND,asrArgs:env.TEDDY_ASR_ARGS?JSON.parse(env.TEDDY_ASR_ARGS):[],ttsCommand:env.TEDDY_TTS_COMMAND,ttsArgs:env.TEDDY_TTS_ARGS?JSON.parse(env.TEDDY_TTS_ARGS):[]};return null}
  function status(){if(mock)return {provider:'local',...providerCapabilities('local'),configured:true,ready:true,mock:true,availability:'pronto',engines:{asr:true,llm:true,tts:true},textReady:true};const rs=runtimeStatus(),cfg=resolvedConfig(),ready=rs?rs.ready:Boolean(cfg),textReady=Boolean(cfg&&(!rs||rs.engines?.llm?.healthy===true));return {provider:'local',textReady,...providerCapabilities('local'),configured:ready,ready,mock:false,availability:rs?.availability||(ready?'pronto':'non_disponibile'),engines:rs?.engines?{asr:rs.engines.asr.healthy,llm:rs.engines.llm.healthy,tts:rs.engines.tts.healthy}:{asr:Boolean(cfg?.asrCommand),llm:Boolean(cfg),tts:Boolean(cfg?.ttsCommand)},runtime:rs}}
  function engines(){if(mock)return mockEngines;const cfg=resolvedConfig();if(!cfg)throw Object.assign(new Error('local_engines_not_configured'),{code:'local_engines_not_configured',status:503});return createLocalEngines({...cfg,fetchImpl})}
  return {
    status,
    async text(text,{signal,context}={}){if(!status().textReady)throw Object.assign(new Error('local_text_not_ready'),{code:'local_text_not_ready',status:503});const e=engines(),ctx=context??(mock?{}:loadContext());return String(await e.llm(text,{signal,context:ctx,stream:false})||'').trim()},
    async turn(audio,{signal,onEvent,context}={}){if(!status().ready){const code=runtime?'local_runtime_not_ready':'local_engines_not_configured';throw Object.assign(new Error(code),{code,status:503})}const e=engines(),ctx=context??(mock?{}:loadContext());const llm=(text,opts={})=>e.llm(text,{...opts,context:ctx});return localTurn({audio,asr:e.asr,llm,tts:e.tts,signal,onEvent})},
    async stream(audio,res,{signal,context}={}){res.writeHead(200,{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});try{await this.turn(audio,{signal,context,onEvent:e=>res.write(ndjson(e))})}catch(e){if(!res.writableEnded)res.write(ndjson({type:'error',error:e?.code||'local_turn_failed'}))}finally{if(!res.writableEnded)res.end()}}
  };
}

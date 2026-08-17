import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createLocalEngines} from './local-engines.mjs';
import {publicRuntimeStatus,assertRuntimeInvariant} from './runtime-state.mjs';
import {artifactProblem,publicFailure,retryDelay,withRetry} from './runtime-resilience.mjs';
import {runtimeCatalogKey,runtimeCatalogCacheRecord,hydrateRuntimeCatalogCache} from './runtime-catalog.mjs';

const SHERPA_VERSION='1.13.3';
const LLAMA_BUILD='b10218';
const ASR_MODEL='sherpa-onnx-whisper-tiny.tar.bz2';
const TTS_MODEL='vits-piper-it_IT-riccardo-x_low.tar.bz2';
const QWEN_MODEL='Qwen3-0.6B-Q8_0.gguf';
const QWEN_URL=`https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/${QWEN_MODEL}?download=true`;
const now=()=>new Date().toISOString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function platformNames(){
  const arch=process.arch==='x64'?'x64':process.arch==='arm64'?'arm64':null;
  if(!arch||!['linux','darwin'].includes(process.platform))throw Object.assign(new Error('runtime_platform_unsupported'),{code:'runtime_platform_unsupported',stage:'catalog',retryable:false});
  return {
    arch,
    sherpa:process.platform==='linux'?`sherpa-onnx-v${SHERPA_VERSION}-linux-${arch==='arm64'?'aarch64':arch}-static.tar.bz2`:`sherpa-onnx-v${SHERPA_VERSION}-osx-${arch}-static.tar.bz2`,
    llamaNeedle:process.platform==='linux'?`bin-ubuntu-${arch}`:`bin-macos-${arch}`
  };
}

async function atomicJson(file,value){await fs.promises.mkdir(path.dirname(file),{recursive:true,mode:0o700});const tmp=`${file}.${process.pid}.${crypto.randomUUID()}.tmp`;await fs.promises.writeFile(tmp,JSON.stringify(value,null,2),{mode:0o600});await fs.promises.rename(tmp,file);}
async function readJson(file){try{return JSON.parse(await fs.promises.readFile(file,'utf8'))}catch{return null}}
async function sha256(file){return await new Promise((resolve,reject)=>{const h=crypto.createHash('sha256'),s=fs.createReadStream(file);s.on('data',b=>h.update(b));s.on('error',reject);s.on('end',()=>resolve(h.digest('hex')))});}
function cleanDigest(v=''){return String(v).replace(/^sha256:/,'').replace(/^W\//,'').replace(/^"|"$/g,'').trim();}
async function exec(command,args,{cwd}={}){return await new Promise((resolve,reject)=>{const c=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe'],shell:false});let err='';c.stderr.on('data',b=>{if(err.length<8000)err+=b});c.on('error',reject);c.on('exit',code=>code===0?resolve():reject(Object.assign(new Error(`command_failed:${path.basename(command)}`),{code:'runtime_command_failed',stage:'extract',retryable:false,detail:err.slice(-2000)})))});}
async function findNamed(root,name){const q=[root];while(q.length){const d=q.shift();let entries;try{entries=await fs.promises.readdir(d,{withFileTypes:true})}catch{continue}for(const e of entries){const p=path.join(d,e.name);if(e.isDirectory())q.push(p);else if(e.name===name)return p;}}return null;}
async function portListening(port,{host='127.0.0.1',timeoutMs=180}={}){return await new Promise(resolve=>{let settled=false;const finish=v=>{if(settled)return;settled=true;socket.destroy();resolve(v)},socket=net.createConnection({host,port:Number(port)});socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.setTimeout(timeoutMs,()=>finish(false));});}
async function terminateChild(child,{graceMs=900}={}){if(!child||child.exitCode!=null)return;await new Promise(resolve=>{let settled=false,exited=false,timer;const done=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve()},onExit=()=>{exited=true;done()};child.once?.('exit',onExit);try{child.kill('SIGTERM')}catch{return done()}timer=setTimeout(()=>{if(!exited){try{child.kill('SIGKILL')}catch{}}done()},graceMs)})}

export function createRuntimeManager({home,env=process.env,fetchImpl=fetch,spawnImpl=spawn}={}){
  const root=path.join(home,'runtime'),generations=path.join(root,'generations'),staging=path.join(root,'staging'),pointer=path.join(root,'current.json'),statusFile=path.join(root,'install-state.json'),catalogCache=path.join(root,'catalog-cache.json');
  const external=Boolean(env.TEDDY_ASR_COMMAND&&env.TEDDY_TTS_COMMAND);
  const autoinstall=env.TEDDY_RUNTIME_AUTOINSTALL==='1';
  const retryAttempts=Math.max(1,Math.min(8,Number(env.TEDDY_RUNTIME_FETCH_ATTEMPTS||4)));
  const initialRetryLimit=Math.max(0,Math.min(5,Number(env.TEDDY_RUNTIME_INITIAL_RETRY_CYCLES??3)));
  let llama=null,startPromise=null,engineConfig=null,retryTimer=null,initialRetryCycles=0,stopping=false;
  let state={installPhase:'idle',currentGeneration:null,previousGeneration:null,engines:{asr:{state:'missing',healthy:false},llm:{state:'missing',healthy:false},tts:{state:'missing',healthy:false}},artifacts:[],selfTest:null,lastError:null};
  const publish=async()=>{assertRuntimeInvariant(state);await atomicJson(statusFile,publicRuntimeStatus(state)).catch(()=>{});};
  const setPhase=async phase=>{state.installPhase=phase;await publish()};
  const fail=async e=>{state.lastError={...publicFailure(e),at:now()};state.installPhase=state.currentGeneration?'rolled_back':'failed';await publish();};
  const status=()=>publicRuntimeStatus(state);

  async function releaseAsset(repo,tag,predicate,{artifactId}={}){
    const provider='github';
    return withRetry(async()=>{
      let r;try{r=await fetchImpl(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,{headers:{accept:'application/vnd.github+json','user-agent':'teddy-local-runtime',...(env.GITHUB_TOKEN?{authorization:`Bearer ${env.GITHUB_TOKEN}`}:{})}})}catch(e){throw artifactProblem({stage:'catalog',artifactId,provider,cause:e,retryable:true})}
      if(!r.ok)throw artifactProblem({stage:'catalog',artifactId,provider,status:r.status,retryable:[408,425,429,500,502,503,504].includes(r.status)});
      const body=await r.json();const a=(body.assets||[]).find(predicate);
      if(!a)throw Object.assign(artifactProblem({stage:'catalog',artifactId,provider,status:404,retryable:false}),{code:'artifact_not_found'});
      const digest=cleanDigest(a.digest);if(!/^[0-9a-f]{64}$/i.test(digest))throw Object.assign(artifactProblem({stage:'verify',artifactId,provider,retryable:false}),{code:'artifact_digest_unavailable'});
      return {source:a.browser_download_url,totalBytes:Number(a.size||0),sha256:digest,name:a.name};
    },{attempts:retryAttempts});
  }
  async function hfArtifact(){
    const artifactId='qwen3-0.6b',provider='huggingface';
    return withRetry(async()=>{
      let r;try{r=await fetchImpl(QWEN_URL,{method:'HEAD',redirect:'follow'})}catch(e){throw artifactProblem({stage:'catalog',artifactId,provider,cause:e,retryable:true})}
      if(!r.ok)throw artifactProblem({stage:'catalog',artifactId,provider,status:r.status,retryable:[408,425,429,500,502,503,504].includes(r.status)});
      const digest=cleanDigest(r.headers.get('x-linked-etag')||r.headers.get('etag')||'');if(!/^[0-9a-f]{64}$/i.test(digest))throw Object.assign(artifactProblem({stage:'verify',artifactId,provider,retryable:false}),{code:'artifact_digest_unavailable'});
      return {source:QWEN_URL,totalBytes:Number(r.headers.get('content-length')||0),sha256:digest,name:QWEN_MODEL};
    },{attempts:retryAttempts});
  }
  async function download(a,dest){
    await withRetry(async()=>{
      await fs.promises.rm(dest,{force:true}).catch(()=>{});a.downloadedBytes=0;a.verified=false;
      await fs.promises.mkdir(path.dirname(dest),{recursive:true,mode:0o700});let r;
      try{r=await fetchImpl(a.source,{redirect:'follow'})}catch(e){throw artifactProblem({stage:'download',artifactId:a.id,provider:a.publisher,cause:e,retryable:true})}
      if(!r.ok||!r.body)throw artifactProblem({stage:'download',artifactId:a.id,provider:a.publisher,status:r.status,retryable:[408,425,429,500,502,503,504].includes(r.status)});
      a.totalBytes=Number(r.headers.get('content-length')||a.totalBytes||0);a.phase='downloading';let bytes=0,lastPublish=0;const file=fs.createWriteStream(dest,{mode:0o600});
      try{for await(const chunk of r.body){if(!file.write(chunk))await new Promise(ok=>file.once('drain',ok));bytes+=chunk.length;a.downloadedBytes=bytes;if(bytes-lastPublish>=4*1024*1024){lastPublish=bytes;await publish();}}await new Promise((ok,bad)=>file.end(e=>e?bad(e):ok()));}catch(e){file.destroy();throw artifactProblem({stage:'download',artifactId:a.id,provider:a.publisher,cause:e,retryable:true})}
      a.phase='verifying';await publish();const got=await sha256(dest);if(got.toLowerCase()!==a.sha256.toLowerCase())throw Object.assign(artifactProblem({stage:'verify',artifactId:a.id,provider:a.publisher,retryable:false}),{code:'artifact_digest_mismatch'});a.verified=true;a.downloadedBytes=bytes;await publish();
    },{attempts:retryAttempts});
  }
  async function extract(archive,dest){await fs.promises.mkdir(dest,{recursive:true,mode:0o700});await exec('tar',['-xf',archive,'-C',dest]);}
  async function discoverCatalog(p){
    const sherpa=await releaseAsset('k2-fsa/sherpa-onnx',`v${SHERPA_VERSION}`,a=>a.name===p.sherpa,{artifactId:'sherpa-runtime'});
    const asr=await releaseAsset('k2-fsa/sherpa-onnx','asr-models',a=>a.name===ASR_MODEL,{artifactId:'asr-whisper-tiny'});
    const tts=await releaseAsset('k2-fsa/sherpa-onnx','tts-models',a=>a.name===TTS_MODEL,{artifactId:'tts-riccardo'});
    const llamaMeta=await releaseAsset('ggml-org/llama.cpp',LLAMA_BUILD,a=>a.name.includes(p.llamaNeedle)&&/\.tar\.(gz|bz2)$/.test(a.name),{artifactId:'llama-runtime'});
    const qwen=await hfArtifact();
    return [
      {id:'sherpa-runtime',role:'runtime',version:SHERPA_VERSION,publisher:'k2-fsa',...sherpa},
      {id:'asr-whisper-tiny',role:'asr',version:'tiny-multilingual',publisher:'k2-fsa',...asr},
      {id:'tts-riccardo',role:'tts',version:'it_IT-riccardo-x_low',publisher:'k2-fsa',...tts},
      {id:'llama-runtime',role:'runtime',version:LLAMA_BUILD,publisher:'ggml-org',...llamaMeta},
      {id:'qwen3-0.6b',role:'llm',version:'Q8_0',publisher:'Qwen',...qwen}
    ].map(a=>({...a,phase:'pending',downloadedBytes:0,verified:false,catalogSource:'live'}));
  }
  async function buildCatalog(){
    const p=platformNames(),key=runtimeCatalogKey({platform:process.platform,arch:p.arch,sherpaVersion:SHERPA_VERSION,llamaBuild:LLAMA_BUILD,asrModel:ASR_MODEL,ttsModel:TTS_MODEL,qwenModel:QWEN_MODEL});
    try{
      const live=await discoverCatalog(p);await atomicJson(catalogCache,runtimeCatalogCacheRecord(key,live));return live;
    }catch(e){
      if(e?.retryable!==true)throw e;
      const cached=hydrateRuntimeCatalogCache(await readJson(catalogCache),key);if(cached)return cached;
      throw e;
    }
  }
  async function writeWrappers(gen,sherpaBin,asrDir,ttsDir){
    const asrWrapper=path.join(gen,'asr-wrapper.mjs'),ttsWrapper=path.join(gen,'tts-wrapper.mjs');
    const offline=await findNamed(sherpaBin,'sherpa-onnx-offline');
    const ttsExe=await findNamed(sherpaBin,'sherpa-onnx-offline-tts');
    const enc=await findNamed(asrDir,'tiny-encoder.int8.onnx')||await findNamed(asrDir,'tiny-encoder.onnx'),dec=await findNamed(asrDir,'tiny-decoder.int8.onnx')||await findNamed(asrDir,'tiny-decoder.onnx'),tokens=await findNamed(asrDir,'tiny-tokens.txt');
    const voice=await findNamed(ttsDir,'it_IT-riccardo-x_low.onnx'),voiceTokens=await findNamed(ttsDir,'tokens.txt'),dataDir=voice?path.join(path.dirname(voice),'espeak-ng-data'):null;
    let dataOk=false;try{dataOk=Boolean(dataDir&&(await fs.promises.stat(dataDir)).isDirectory())}catch{}
    if(!offline||!ttsExe||!enc||!dec||!tokens||!voice||!voiceTokens||!dataOk)throw Object.assign(new Error('runtime_layout_invalid'),{code:'runtime_layout_invalid',stage:'layout',retryable:false});
    for(const exe of [offline,ttsExe]){try{await fs.promises.access(exe,fs.constants.X_OK)}catch{throw Object.assign(new Error('runtime_layout_invalid'),{code:'runtime_layout_invalid',stage:'layout',retryable:false})}}
    const runner=`import{spawnSync}from'node:child_process';const [exe,args]=JSON.parse(Buffer.from(process.argv[2],'base64').toString());const r=spawnSync(exe,[...args,...process.argv.slice(3)],{stdio:['ignore','inherit','inherit'],shell:false});process.exit(r.status??1);`;
    const asrSpec=Buffer.from(JSON.stringify([offline,[`--whisper-encoder=${enc}`,`--whisper-decoder=${dec}`,`--tokens=${tokens}`,'--whisper-language=it','--whisper-task=transcribe']])).toString('base64');
    await fs.promises.writeFile(asrWrapper,`${runner}\n`,{mode:0o700});
    const ttsCode=`import fs from'node:fs';import{spawnSync}from'node:child_process';const [txt,wav]=process.argv.slice(2);const text=fs.readFileSync(txt,'utf8').trim();const r=spawnSync(${JSON.stringify(ttsExe)},[${JSON.stringify(`--vits-model=${voice}`)},${JSON.stringify(`--vits-tokens=${voiceTokens}`)},${JSON.stringify(`--vits-data-dir=${dataDir}`)},'--output-filename='+wav,text],{stdio:['ignore','pipe','pipe'],shell:false});if(r.status!==0){process.stderr.write(r.stderr||'tts failed');process.exit(r.status??1);}`;
    await fs.promises.writeFile(ttsWrapper,ttsCode,{mode:0o700});
    return {asrCommand:process.execPath,asrArgs:[asrWrapper,asrSpec],ttsCommand:process.execPath,ttsArgs:[ttsWrapper]};
  }
  async function startLlama(config){
    if(llama){const old=llama;llama=null;await terminateChild(old)}
    if(await portListening(config.port))throw Object.assign(new Error('local_llm_port_in_use'),{code:'local_llm_port_in_use',stage:'start',retryable:false});
    const args=['-m',config.model,'--host','127.0.0.1','--port',String(config.port),'--ctx-size','2048','--n-predict','128'];
    let child;try{child=spawnImpl(config.executable,args,{stdio:['ignore','ignore','pipe'],shell:false})}catch(e){throw Object.assign(new Error('local_llm_start_failed'),{code:'local_llm_start_failed',stage:'start',retryable:false,cause:e})}
    llama=child;let exited=false,spawnError=null;child.stderr?.on('data',()=>{});child.once?.('error',e=>{spawnError=e});child.once?.('exit',()=>{exited=true;if(state.engines.llm.healthy){state.engines.llm={state:'stopped',healthy:false};state.installPhase='failed';publish().catch(()=>{})}});
    for(let i=0;i<120;i++){if(stopping){if(llama===child)llama=null;await terminateChild(child);throw Object.assign(new Error('runtime_stopped'),{code:'runtime_stopped',stage:'start',retryable:false})}if(spawnError||exited){if(llama===child)llama=null;throw Object.assign(new Error('local_llm_start_failed'),{code:'local_llm_start_failed',stage:'start',retryable:false,cause:spawnError||undefined})}try{const r=await fetchImpl(`http://127.0.0.1:${config.port}/v1/models`);if(r.ok&&!exited&&!spawnError)return}catch{}await sleep(250)}
    if(llama===child)llama=null;await terminateChild(child);throw Object.assign(new Error('local_llm_start_timeout'),{code:'local_llm_start_timeout',stage:'start',retryable:true});
  }
  async function activate(generation){
    const cfg=await readJson(path.join(generation.path,'runtime.json'));if(!cfg)return false;
    await setPhase('starting');await startLlama(cfg.llama);engineConfig=cfg.engines;
    state.engines={asr:{state:'checking',healthy:false},llm:{state:'running',healthy:true},tts:{state:'checking',healthy:false}};await publish();
    const engines=createLocalEngines({...engineConfig,llamaUrl:`http://127.0.0.1:${cfg.llama.port}`,fetchImpl});
    await setPhase('self_testing');const steps={};
    try{
      const first=await engines.tts('Ciao Teddy',{});steps.ttsSeed=first.length>44;
      const transcript=await engines.asr(first,{});steps.asr=Boolean(transcript.trim());
      const reply=await engines.llm(transcript||'Ciao Teddy',{});steps.llm=Boolean(reply.trim());
      const final=await engines.tts(reply||'Sono pronto',{});steps.tts=final.length>44;
    }catch(e){throw Object.assign(e,{stage:'self_test',retryable:false})}
    if(!Object.values(steps).every(Boolean))throw Object.assign(new Error('runtime_self_test_failed'),{code:'runtime_self_test_failed',stage:'self_test',retryable:false});
    state.engines={asr:{state:'ready',healthy:true},llm:{state:'ready',healthy:true},tts:{state:'ready',healthy:true}};state.selfTest={ok:true,at:now(),steps};state.currentGeneration={id:generation.id,createdAt:generation.createdAt};state.lastError=null;state.installPhase='ready';initialRetryCycles=0;if(retryTimer){clearTimeout(retryTimer);retryTimer=null}await publish();return true;
  }
  async function loadCurrent(){const p=await readJson(pointer);if(!p?.id)return false;const g={id:p.id,createdAt:p.createdAt,path:path.join(generations,p.id)};try{const activated=await activate(g);if(!activated){await fs.promises.rm(pointer,{force:true}).catch(()=>{});throw Object.assign(new Error('runtime_generation_invalid'),{code:'runtime_generation_invalid',stage:'layout',retryable:false})}return true}catch(e){await fail(e);return false}}
  async function provision(){
    await fs.promises.mkdir(staging,{recursive:true,mode:0o700});await setPhase('discovering');state.artifacts=await buildCatalog();await publish();
    const id=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,stage=path.join(staging,id);await fs.promises.mkdir(stage,{recursive:true,mode:0o700});
    try{
      for(const a of state.artifacts){const archive=path.join(stage,'downloads',a.name);await download(a,archive);if(a.id!=='qwen3-0.6b'){a.phase='extracting';await publish();await extract(archive,path.join(stage,a.id));}else{await fs.promises.mkdir(path.join(stage,'qwen3-0.6b'),{recursive:true});await fs.promises.rename(archive,path.join(stage,'qwen3-0.6b',QWEN_MODEL));}a.phase='installed';await publish();}
      const wrappers=await writeWrappers(stage,path.join(stage,'sherpa-runtime'),path.join(stage,'asr-whisper-tiny'),path.join(stage,'tts-riccardo'));
      const llamaExe=await findNamed(path.join(stage,'llama-runtime'),'llama-server');if(!llamaExe)throw Object.assign(new Error('runtime_layout_invalid'),{code:'runtime_layout_invalid',stage:'layout',retryable:false});
      try{await fs.promises.access(llamaExe,fs.constants.X_OK)}catch{throw Object.assign(new Error('runtime_layout_invalid'),{code:'runtime_layout_invalid',stage:'layout',retryable:false})}
      const model=path.join(stage,'qwen3-0.6b',QWEN_MODEL);let modelOk=false;try{modelOk=(await fs.promises.stat(model)).isFile()}catch{}if(!modelOk)throw Object.assign(new Error('runtime_layout_invalid'),{code:'runtime_layout_invalid',stage:'layout',retryable:false});
      const port=Number(env.TEDDY_LLAMA_PORT||8080);if(!Number.isInteger(port)||port<1||port>65535)throw Object.assign(new Error('local_llm_port_invalid'),{code:'local_llm_port_invalid',stage:'start',retryable:false});
      await atomicJson(path.join(stage,'runtime.json'),{engines:wrappers,llama:{executable:llamaExe,model,port},artifacts:state.artifacts.map(({id,sha256,source,version})=>({id,sha256,source,version}))});
      const final=path.join(generations,id);await fs.promises.mkdir(generations,{recursive:true,mode:0o700});await fs.promises.rename(stage,final);
      const candidate={id,createdAt:now(),path:final};const old=await readJson(pointer);state.previousGeneration=old?.id?{id:old.id,createdAt:old.createdAt}:null;
      await activate(candidate);await atomicJson(pointer,{id,createdAt:candidate.createdAt});return status();
    }catch(e){await fs.promises.rm(stage,{recursive:true,force:true}).catch(()=>{});if(await loadCurrent())state.installPhase='rolled_back';else await fail(e);await publish();throw e}
  }
  async function attemptStart(){
    if(status().ready)return status();
    if(env.TEDDY_LOCAL_ENGINE_MOCK==='1')return status();
    if(external){engineConfig={llamaUrl:env.TEDDY_LLAMA_URL||'http://127.0.0.1:8080',asrCommand:env.TEDDY_ASR_COMMAND,asrArgs:env.TEDDY_ASR_ARGS?JSON.parse(env.TEDDY_ASR_ARGS):[],ttsCommand:env.TEDDY_TTS_COMMAND,ttsArgs:env.TEDDY_TTS_ARGS?JSON.parse(env.TEDDY_TTS_ARGS):[]};state.engines={asr:{state:'external',healthy:true},llm:{state:'external',healthy:true},tts:{state:'external',healthy:true}};state.currentGeneration={id:'external',createdAt:now()};state.installPhase='ready';state.lastError=null;initialRetryCycles=0;await publish();return status();}
    if(await loadCurrent())return status();
    if(!autoinstall){if(!state.lastError)state.lastError={error:'local_runtime_not_installed',stage:null,artifactId:null,provider:null,httpStatus:null,retryable:false,at:now()};await publish();return status();}
    return provision();
  }
  function scheduleInitialRetry(error){
    if(stopping||status().ready||error?.retryable!==true||initialRetryCycles>=initialRetryLimit||retryTimer)return;
    initialRetryCycles++;const delay=retryDelay(initialRetryCycles);
    retryTimer=setTimeout(()=>{retryTimer=null;start().catch(()=>{})},delay);retryTimer.unref?.();
  }
  async function start(){
    if(startPromise)return startPromise;
    startPromise=attemptStart().catch(async e=>{await fail(e);scheduleInitialRetry(e);return status()}).finally(()=>{startPromise=null});
    return startPromise;
  }
  async function retry(){if(status().ready)return status();if(retryTimer){clearTimeout(retryTimer);retryTimer=null}initialRetryCycles=0;return start()}
  function config(){return engineConfig?{...engineConfig,llamaUrl:engineConfig.llamaUrl||`http://127.0.0.1:${Number(env.TEDDY_LLAMA_PORT||8080)}`}:null}
  function stop(){stopping=true;if(retryTimer){clearTimeout(retryTimer);retryTimer=null}if(llama){const child=llama;llama=null;try{child.kill('SIGTERM')}catch{}}}
  return {start,retry,status,config,stop,paths:{root,pointer,statusFile}};
}

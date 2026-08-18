import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runtimePlatformSpec,runtimeExecutableName,llamaAssetMatches,requiresExecutableBit} from '../server/lib/runtime-platform.mjs';
import {createRuntimeManager} from '../server/lib/runtime-manager.mjs';
import {runtimeCatalogCacheRecord,runtimeCatalogKey} from '../server/lib/runtime-catalog.mjs';
import {QWEN_PIN,qwenUrl,releaseDownloadUrl,classifyReleaseTrust} from '../server/lib/runtime-trust.mjs';
import {acquireInstallLock,timeoutSignal} from '../server/lib/runtime-installation.mjs';
import {createLocalEngines} from '../server/lib/local-engines.mjs';
import {retryDelay,withRetry} from '../server/lib/runtime-resilience.mjs';
import {deriveAvailability,AVAILABILITY,assertRuntimeInvariant} from '../server/lib/runtime-state.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test('runtime platform matrix includes Windows x64 with exact executable/archive semantics',()=>{
  const win=runtimePlatformSpec('win32','x64');
  assert.equal(win.sherpa,'sherpa-onnx-v1.13.3-win-x64-static-MD-Release.tar.bz2');
  assert.equal(win.llamaNeedle,'bin-win-cpu-x64');
  assert.equal(win.llamaArchive,'zip');
  assert.equal(win.tarCommand,'tar.exe');
  assert.equal(runtimeExecutableName('llama-server',win),'llama-server.exe');
  assert.equal(runtimeExecutableName('sherpa-onnx-offline-tts',win),'sherpa-onnx-offline-tts.exe');
  assert.equal(requiresExecutableBit(win),false);
  assert.equal(llamaAssetMatches('llama-b10218-bin-win-cpu-x64.zip',win),true);
  assert.equal(llamaAssetMatches('llama-b10218-bin-win-cuda-13.1-x64.zip',win),false);
  assert.throws(()=>runtimePlatformSpec('win32','ia32'),e=>e?.code==='runtime_platform_unsupported');
});

test('Unix runtime platform selections remain stable',()=>{
  const linux=runtimePlatformSpec('linux','x64'),arm=runtimePlatformSpec('linux','arm64'),mac=runtimePlatformSpec('darwin','arm64');
  assert.equal(linux.sherpa,'sherpa-onnx-v1.13.3-linux-x64-static.tar.bz2');
  assert.equal(arm.sherpa,'sherpa-onnx-v1.13.3-linux-aarch64-static.tar.bz2');
  assert.equal(mac.sherpa,'sherpa-onnx-v1.13.3-osx-arm64-static.tar.bz2');
  assert.equal(llamaAssetMatches('llama-b10218-bin-ubuntu-x64.tar.gz',linux),true);
  assert.equal(llamaAssetMatches('llama-b10218-bin-macos-arm64.tar.gz',mac),true);
  assert.equal(requiresExecutableBit(linux),true);
});

test('a live install owner is never stolen merely because its heartbeat is old',async()=>{
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-live-lock-')),lockDir=path.join(root,'install.lock');
  await fs.promises.mkdir(lockDir);await fs.promises.writeFile(path.join(lockDir,'owner.json'),JSON.stringify({pid:4242,token:'live',heartbeatAt:1}));
  let t=10_000;try{
    await assert.rejects(()=>acquireInstallLock(lockDir,{timeoutMs:5,staleMs:10,pollMs:1,now:()=>t++,sleep:async()=>{},isProcessAlive:()=>true}),e=>e?.code==='runtime_install_locked');
    const owner=JSON.parse(await fs.promises.readFile(path.join(lockDir,'owner.json'),'utf8'));assert.equal(owner.token,'live');
  }finally{await fs.promises.rm(root,{recursive:true,force:true})}
});

test('install lock release cannot delete a lock after ownership token changes',async()=>{
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-lock-token-')),lockDir=path.join(root,'install.lock');
  try{const lock=await acquireInstallLock(lockDir,{timeoutMs:100});await fs.promises.writeFile(path.join(lockDir,'owner.json'),JSON.stringify({pid:process.pid,token:'new-owner',heartbeatAt:Date.now()}));await lock.release();assert.equal(fs.existsSync(lockDir),true)}finally{await fs.promises.rm(root,{recursive:true,force:true})}
});

test('parent cancellation remains cancellation and cannot later become timeout',async()=>{
  const parent=new AbortController(),guard=timeoutSignal(parent.signal,{timeoutMs:15,code:'late_timeout'});parent.abort(Object.assign(new Error('cancelled'),{code:'cancelled'}));assert.equal(guard.signal.aborted,true);assert.equal(guard.timedOut(),false);guard.cleanup();await sleep(25);assert.equal(guard.timedOut(),false);
});

test('LLM timeout is intrinsic even when caller supplies no abort signal',async()=>{
  const fetchImpl=async(_url,{signal}={})=>await new Promise((resolve,reject)=>{signal?.addEventListener('abort',()=>reject(signal.reason),{once:true})});
  const engines=createLocalEngines({asrCommand:process.execPath,ttsCommand:process.execPath,fetchImpl,llmTimeoutMs:15});
  await assert.rejects(()=>engines.llm('ciao'),e=>e?.code==='local_llm_timeout');
});

test('ASR and TTS propagate their independent timeout budgets to the child runner',async()=>{
  const seen=[];const run=async(cmd,args,{timeoutMs}={})=>{seen.push(timeoutMs);if(cmd==='asr')return Buffer.from('ciao');const out=args.at(-1);await fs.promises.writeFile(out,Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(40)]));return Buffer.alloc(0)};
  const tmpDir=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-engine-budget-'));try{const engines=createLocalEngines({asrCommand:'asr',ttsCommand:'tts',run,tmpDir,asrTimeoutMs:111,ttsTimeoutMs:222});assert.equal(await engines.asr(Buffer.from('wav')),'ciao');await engines.tts('ciao');assert.deepEqual(seen,[111,222])}finally{await fs.promises.rm(tmpDir,{recursive:true,force:true})}
});

test('retry semantics never retry permanent errors and jitter is bounded and observable',async()=>{
  let calls=0;await assert.rejects(()=>withRetry(async()=>{calls++;throw Object.assign(new Error('permanent'),{retryable:false})},{attempts:8,sleep:async()=>{}}),/permanent/);assert.equal(calls,1);
  const low=retryDelay(3,{baseMs:250,maxMs:4000,jitter:.2,random:()=>0}),high=retryDelay(3,{baseMs:250,maxMs:4000,jitter:.2,random:()=>1});assert.ok(low<high);assert.equal(low,800);assert.equal(high,1000);
});

test('managed readiness cannot be inferred from healthy engines without the oral self-test',()=>{
  const state={installPhase:'ready',currentGeneration:{id:'g'},engines:{asr:{healthy:true},llm:{healthy:true},tts:{healthy:true}},selfTest:{ok:false}};
  assert.notEqual(deriveAvailability(state),AVAILABILITY.READY);
});

function cacheFixtureArtifacts({firstSha='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'}={}){
  const p=runtimePlatformSpec(process.platform,process.arch);
  const common=(id,role,name,version,publisher,source,sha256)=>({id,role,name,version,publisher,source,totalBytes:3,sha256,trust:'sha256'});
  return [
    common('sherpa-runtime','runtime',p.sherpa,'1.13.3','k2-fsa',`https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.3/${p.sherpa}`,firstSha),
    common('asr-whisper-tiny','asr','sherpa-onnx-whisper-tiny.tar.bz2','tiny-multilingual','k2-fsa',releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models','sherpa-onnx-whisper-tiny.tar.bz2'),firstSha),
    common('tts-riccardo','tts','vits-piper-it_IT-riccardo-x_low.tar.bz2','it_IT-riccardo-x_low','k2-fsa',releaseDownloadUrl('k2-fsa/sherpa-onnx','tts-models','vits-piper-it_IT-riccardo-x_low.tar.bz2'),firstSha),
    common('llama-runtime','runtime',p.llamaArchive==='zip'?'llama-b10218-bin-win-cpu-x64.zip':`llama-b10218-${p.llamaNeedle}.tar.gz`,'b10218','ggml-org',`https://github.com/ggml-org/llama.cpp/releases/download/b10218/${p.llamaArchive==='zip'?'llama-b10218-bin-win-cpu-x64.zip':`llama-b10218-${p.llamaNeedle}.tar.gz`}`,firstSha),
    common('qwen3-0.6b','llm',QWEN_PIN.name,'Q8_0','Qwen',qwenUrl(),QWEN_PIN.sha256)
  ];
}

async function writeCachedCatalog(home,items){
  const p=runtimePlatformSpec(process.platform,process.arch),runtime=path.join(home,'runtime');
  await fs.promises.mkdir(runtime,{recursive:true});
  const key=runtimeCatalogKey({platform:process.platform,arch:p.arch,sherpaVersion:'1.13.3',llamaBuild:'b10218',asrModel:'sherpa-onnx-whisper-tiny.tar.bz2',ttsModel:'vits-piper-it_IT-riccardo-x_low.tar.bz2',qwenModel:QWEN_PIN.name});
  await fs.promises.writeFile(path.join(runtime,'catalog-cache.json'),JSON.stringify(runtimeCatalogCacheRecord(key,items)));
}

test('manager composition serializes provisioning across two managers sharing one Teddy home',async()=>{
  if(!['linux','darwin'].includes(process.platform))return;
  const home=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-manager-lock-'));await writeCachedCatalog(home,cacheFixtureArtifacts());
  let active=0,maxActive=0,downloads=0;
  const fetchImpl=async url=>{url=String(url);if(url.includes('api.github.com')||url.includes('/Qwen/Qwen3-0.6B-GGUF/'))return {ok:false,status:503,body:null,headers:new Headers()};downloads++;active++;maxActive=Math.max(maxActive,active);await sleep(35);active--;return {ok:true,status:200,headers:new Headers({'content-length':'3'}),body:(async function*(){yield Buffer.from('abc')})()};};
  const env={TEDDY_RUNTIME_AUTOINSTALL:'1',TEDDY_RUNTIME_FETCH_ATTEMPTS:'1',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0',TEDDY_RUNTIME_LOCK_TIMEOUT_MS:'1000'};
  const a=createRuntimeManager({home,env,fetchImpl}),b=createRuntimeManager({home,env,fetchImpl});
  try{await Promise.all([a.start(),b.start()]);assert.equal(maxActive,1);assert.equal(downloads,2)}finally{a.stop();b.stop();await fs.promises.rm(home,{recursive:true,force:true})}
});

test('digest mismatch fails closed before extraction and leaves no finalized download',async()=>{
  if(!['linux','darwin'].includes(process.platform))return;
  const home=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-digest-fail-'));await writeCachedCatalog(home,cacheFixtureArtifacts({firstSha:'b'.repeat(64)}));
  const fetchImpl=async url=>{url=String(url);if(url.includes('api.github.com')||url.includes('/Qwen/Qwen3-0.6B-GGUF/'))return {ok:false,status:503,body:null,headers:new Headers()};return {ok:true,status:200,headers:new Headers({'content-length':'3'}),body:(async function*(){yield Buffer.from('abc')})()};};
  const manager=createRuntimeManager({home,env:{TEDDY_RUNTIME_AUTOINSTALL:'1',TEDDY_RUNTIME_FETCH_ATTEMPTS:'1',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0'},fetchImpl});
  try{const status=await manager.start();assert.equal(status.ready,false);assert.equal(status.lastProblem?.error,'artifact_digest_mismatch');const staging=path.join(home,'runtime','staging');let files=[];try{for(const d of await fs.promises.readdir(staging)){const root=path.join(staging,d,'downloads');try{files.push(...await fs.promises.readdir(root))}catch{}}}catch{}assert.equal(files.some(n=>!n.endsWith('.part')),false)}finally{manager.stop();await fs.promises.rm(home,{recursive:true,force:true})}
});

test('runtime manager composition preserves verify-before-finalize, lock wrapping, and canary-before-pointer ordering',async()=>{
  const source=await fs.promises.readFile(new URL('../server/lib/runtime-manager.mjs',import.meta.url),'utf8');
  const hashAt=source.indexOf('const got=await sha256(part)'),renameAt=source.indexOf('await fs.promises.rename(part,dest)'),lockAt=source.indexOf('return withInstallLock(installLock'),provisionAt=source.indexOf('function provisionUnlocked'),activateAt=source.indexOf('await activate(candidate)'),pointerAt=source.indexOf('await atomicJson(pointer');
  assert.ok(hashAt>=0&&renameAt>hashAt);assert.ok(provisionAt>=0&&lockAt>provisionAt);assert.ok(activateAt>=0&&pointerAt>activateAt);
});

test('a fresh ownerless lock directory is treated as initializing, not stale',async()=>{
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-lock-init-')),lockDir=path.join(root,'install.lock');await fs.promises.mkdir(lockDir);
  try{await assert.rejects(()=>acquireInstallLock(lockDir,{timeoutMs:5,staleMs:60_000,pollMs:1,sleep:async()=>{}}),e=>e?.code==='runtime_install_locked');assert.equal(fs.existsSync(lockDir),true)}finally{await fs.promises.rm(root,{recursive:true,force:true})}
});

test('Qwen pin includes the exact audited SHA-256, not merely a well-formed digest',()=>{
  assert.equal(QWEN_PIN.sha256,'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031');
});

test('legacy trust rejects zero-byte release assets',()=>{
  const name='sherpa-onnx-whisper-tiny.tar.bz2',asset={name,size:0,browser_download_url:releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models',name)};
  assert.throws(()=>classifyReleaseTrust({repo:'k2-fsa/sherpa-onnx',tag:'asr-models',artifactId:'asr-whisper-tiny',asset,digest:''}),e=>e?.code==='artifact_integrity_metadata_missing');
});

test('verified artifacts require complete HTTPS provenance',()=>{
  const a=cacheFixtureArtifacts()[0],state={installPhase:'failed',engines:{asr:{healthy:false},llm:{healthy:false},tts:{healthy:false}},artifacts:[{...a,downloadedBytes:3,verified:true,observedSha256:a.sha256}],lastError:{error:'x'}};
  assert.throws(()=>assertRuntimeInvariant({...state,artifacts:[{...state.artifacts[0],publisher:''}]}),/verified_without_provenance/);
  assert.throws(()=>assertRuntimeInvariant({...state,artifacts:[{...state.artifacts[0],source:'http://github.com/unsafe'}]}),/verified_without_provenance/);
});

test('TTS rejects a non-RIFF output even when the child exits successfully',async()=>{
  const tmpDir=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-bad-wav-'));const run=async(_cmd,args)=>{await fs.promises.writeFile(args.at(-1),Buffer.alloc(44));return Buffer.alloc(0)};
  try{const engines=createLocalEngines({asrCommand:'asr',ttsCommand:'tts',run,tmpDir});await assert.rejects(()=>engines.tts('ciao'),e=>e?.code==='local_tts_invalid_wav')}finally{await fs.promises.rm(tmpDir,{recursive:true,force:true})}
});

test('catalog cache rejects otherwise-valid artifacts moved to an untrusted host',()=>{
  const items=cacheFixtureArtifacts(),p=runtimePlatformSpec(process.platform,process.arch),key=runtimeCatalogKey({platform:process.platform,arch:p.arch,sherpaVersion:'1.13.3',llamaBuild:'b10218',asrModel:'sherpa-onnx-whisper-tiny.tar.bz2',ttsModel:'vits-piper-it_IT-riccardo-x_low.tar.bz2',qwenModel:QWEN_PIN.name});
  items[0]={...items[0],source:'https://evil.example/releases/runtime.tar.gz'};assert.throws(()=>runtimeCatalogCacheRecord(key,items),/runtime catalog invalid/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {classifyReleaseTrust,releaseDownloadUrl,QWEN_PIN,qwenUrl} from '../server/lib/runtime-trust.mjs';
import {runtimeCatalogCacheRecord,hydrateRuntimeCatalogCache,runtimeCatalogKey} from '../server/lib/runtime-catalog.mjs';
import {createRuntimeManager} from '../server/lib/runtime-manager.mjs';
import {acquireInstallLock,timeoutSignal} from '../server/lib/runtime-installation.mjs';
import {assertRuntimeInvariant,deriveAvailability,AVAILABILITY} from '../server/lib/runtime-state.mjs';
import {runCommand} from '../server/lib/local-engines.mjs';

const sha='a'.repeat(64);
const artifact=(id,overrides={})=>({
  id,role:id==='asr-whisper-tiny'?'asr':id==='tts-riccardo'?'tts':id==='qwen3-0.6b'?'llm':'runtime',
  name:id==='asr-whisper-tiny'?'sherpa-onnx-whisper-tiny.tar.bz2':id==='tts-riccardo'?'vits-piper-it_IT-riccardo-x_low.tar.bz2':id==='qwen3-0.6b'?QWEN_PIN.name:`${id}.tar.gz`,
  version:id==='sherpa-runtime'?'1.13.3':id==='asr-whisper-tiny'?'tiny-multilingual':id==='tts-riccardo'?'it_IT-riccardo-x_low':id==='llama-runtime'?'b10218':'Q8_0',
  publisher:id.startsWith('sherpa')||id.startsWith('asr')||id.startsWith('tts')?'k2-fsa':id==='llama-runtime'?'ggml-org':'Qwen',
  source:id==='qwen3-0.6b'?qwenUrl():`https://github.com/${id==='llama-runtime'?'ggml-org/llama.cpp':'k2-fsa/sherpa-onnx'}/releases/download/v1/${id}.tar.gz`,
  totalBytes:100,sha256:sha,trust:'sha256',...overrides
});

test('legacy trust is exact and non-generalizable',()=>{
  const name='sherpa-onnx-whisper-tiny.tar.bz2',asset={name,size:123,browser_download_url:releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models',name)};
  assert.deepEqual(classifyReleaseTrust({repo:'k2-fsa/sherpa-onnx',tag:'asr-models',artifactId:'asr-whisper-tiny',asset,digest:''}),{trust:'legacy_release_identity',sha256:null});
  assert.throws(()=>classifyReleaseTrust({repo:'k2-fsa/sherpa-onnx',tag:'asr-models',artifactId:'asr-whisper-tiny',asset:{...asset,browser_download_url:asset.browser_download_url+'?mutable=1'},digest:''}),/artifact_integrity_metadata_missing/);
  assert.throws(()=>classifyReleaseTrust({repo:'k2-fsa/sherpa-onnx',tag:'asr-models',artifactId:'other',asset,digest:''}),/artifact_integrity_metadata_missing/);
  assert.equal(classifyReleaseTrust({artifactId:'other',asset:{},digest:sha}).trust,'sha256');
});

test('Qwen identity is immutable and cryptographically pinned',()=>{
  assert.match(QWEN_PIN.revision,/^[0-9a-f]{40}$/);assert.match(QWEN_PIN.sha256,/^[0-9a-f]{64}$/);assert.ok(qwenUrl().includes(QWEN_PIN.revision));assert.ok(!qwenUrl().includes('/resolve/main/'));
});

test('catalog cache preserves strict mixed trust modes',()=>{
  const items=[artifact('sherpa-runtime'),artifact('asr-whisper-tiny',{source:releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models','sherpa-onnx-whisper-tiny.tar.bz2'),sha256:null,trust:'legacy_release_identity'}),artifact('tts-riccardo',{source:releaseDownloadUrl('k2-fsa/sherpa-onnx','tts-models','vits-piper-it_IT-riccardo-x_low.tar.bz2'),sha256:null,trust:'legacy_release_identity'}),artifact('llama-runtime'),artifact('qwen3-0.6b')];
  const key='linux|x64|1.13.3|b10218|asr|tts|qwen',record=runtimeCatalogCacheRecord(key,items),hydrated=hydrateRuntimeCatalogCache(record,key);
  assert.equal(hydrated.length,5);assert.equal(hydrated[1].trust,'legacy_release_identity');assert.equal(hydrated[1].sha256,null);assert.equal(hydrated[4].trust,'sha256');
  assert.equal(hydrateRuntimeCatalogCache({...record,schema:1},key),null);
});

test('verified legacy bytes require an observed SHA while pinned bytes must match',()=>{
  const base={installPhase:'failed',engines:{asr:{healthy:false},llm:{healthy:false},tts:{healthy:false}},artifacts:[artifact('asr-whisper-tiny',{source:releaseDownloadUrl('k2-fsa/sherpa-onnx','asr-models','sherpa-onnx-whisper-tiny.tar.bz2'),sha256:null,trust:'legacy_release_identity',verified:true,observedSha256:sha})],lastError:{error:'x'}};
  assert.equal(assertRuntimeInvariant(base),true);assert.equal(deriveAvailability(base),AVAILABILITY.INSTALL_FAILED);
  assert.throws(()=>assertRuntimeInvariant({...base,artifacts:[{...base.artifacts[0],observedSha256:null}]}),/verified_without_observed_sha256/);
  assert.throws(()=>assertRuntimeInvariant({...base,artifacts:[artifact('sherpa-runtime',{verified:true,observedSha256:'b'.repeat(64)})]}),/verified_sha256_mismatch/);
});

test('filesystem installer lock has exactly one writer and hands off',async()=>{
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-lock-')),lockPath=path.join(root,'install.lock');let active=0,maxActive=0;
  const worker=async hold=>{const lock=await acquireInstallLock(lockPath,{timeoutMs:2000,staleMs:5000,pollMs:2});active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,hold));active--;await lock.release();};
  await Promise.all([worker(25),worker(5)]);assert.equal(maxActive,1);await fs.promises.rm(root,{recursive:true,force:true});
});

test('stale dead installer lock is recovered deterministically',async()=>{
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-stale-')),lockPath=path.join(root,'install.lock');await fs.promises.mkdir(lockPath);await fs.promises.writeFile(path.join(lockPath,'owner.json'),JSON.stringify({pid:99999999,token:'dead',heartbeatAt:1}));
  const lock=await acquireInstallLock(lockPath,{timeoutMs:200,staleMs:10,pollMs:1,isProcessAlive:()=>false});assert.ok(lock.token);await lock.release();await fs.promises.rm(root,{recursive:true,force:true});
});


test('managed download exposes only a .part pathname before verification',async()=>{
  const home=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-part-')),runtime=path.join(home,'runtime');await fs.promises.mkdir(runtime,{recursive:true});
  const digest='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',ids=['sherpa-runtime','asr-whisper-tiny','tts-riccardo','llama-runtime','qwen3-0.6b'];
  const items=ids.map((id,i)=>artifact(id,{name:`${id}.bin`,source:id==='qwen3-0.6b'?'https://huggingface.co/Qwen/fixture.bin':`https://github.com/${id==='llama-runtime'?'ggml-org/llama.cpp':'k2-fsa/sherpa-onnx'}/releases/download/fixture/${id}.bin`,totalBytes:3,sha256:i===0?digest:sha,trust:'sha256'}));
  const arch=process.arch==='arm64'?'arm64':'x64',key=runtimeCatalogKey({platform:process.platform,arch,sherpaVersion:'1.13.3',llamaBuild:'b10218',asrModel:'sherpa-onnx-whisper-tiny.tar.bz2',ttsModel:'vits-piper-it_IT-riccardo-x_low.tar.bz2',qwenModel:QWEN_PIN.name});
  await fs.promises.writeFile(path.join(runtime,'catalog-cache.json'),JSON.stringify(runtimeCatalogCacheRecord(key,items)));
  let sawPart=false,sawFinal=false;
  const fetchImpl=async url=>{url=String(url);if(url.includes('api.github.com')||url.includes('/Qwen/Qwen3-0.6B-GGUF/'))return {ok:false,status:503,body:null,headers:new Headers()};return {ok:true,status:200,headers:new Headers({'content-length':'3'}),body:(async function*(){const downloadRoots=[];try{for(const d of await fs.promises.readdir(path.join(runtime,'staging'))){downloadRoots.push(path.join(runtime,'staging',d,'downloads'))}}catch{}for(const d of downloadRoots){try{for(const name of await fs.promises.readdir(d)){sawPart ||= name.endsWith('.part');sawFinal ||= !name.endsWith('.part')}}catch{}}yield Buffer.from('abc')})()};};
  const manager=createRuntimeManager({home,env:{TEDDY_RUNTIME_AUTOINSTALL:'1',TEDDY_RUNTIME_FETCH_ATTEMPTS:'1',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0'},fetchImpl});
  try{const status=await manager.start();assert.equal(sawPart,true);assert.equal(sawFinal,false);assert.equal(status.ready,false)}finally{manager.stop();await fs.promises.rm(home,{recursive:true,force:true})}
});

test('intrinsic timeout aborts signals and real child processes',async()=>{
  const guard=timeoutSignal(undefined,{timeoutMs:10,code:'unit_timeout'});await new Promise(r=>setTimeout(r,20));assert.equal(guard.signal.aborted,true);assert.equal(guard.timedOut(),true);guard.cleanup();
  await assert.rejects(runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:25}),e=>e?.code==='local_engine_timeout');
});

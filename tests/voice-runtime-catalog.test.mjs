import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runtimeCatalogKey,runtimeCatalogCacheRecord,hydrateRuntimeCatalogCache,RUNTIME_CATALOG_IDS} from '../server/lib/runtime-catalog.mjs';
import {createRuntimeManager} from '../server/lib/runtime-manager.mjs';
const key=runtimeCatalogKey({platform:'linux',arch:'x64',sherpaVersion:'1.13.3',llamaBuild:'b10218',asrModel:'asr.tar',ttsModel:'tts.tar',qwenModel:'qwen.gguf'});
const spec={
  'sherpa-runtime':['runtime','k2-fsa','1.13.3','github.com'],
  'asr-whisper-tiny':['asr','k2-fsa','tiny-multilingual','github.com'],
  'tts-riccardo':['tts','k2-fsa','it_IT-riccardo-x_low','github.com'],
  'llama-runtime':['runtime','ggml-org','b10218','github.com'],
  'qwen3-0.6b':['llm','QuantFactory','Q4_K_M','huggingface.co']
};
const artifacts=RUNTIME_CATALOG_IDS.map((id,i)=>{const [role,publisher,version,host]=spec[id];return{id,role,name:`${id}.bin`,version,publisher,source:`https://${host}/fixture/${id}`,totalBytes:100+i,sha256:String(i+1).repeat(64)}});
test('catalog cache round-trips only the complete pinned provenance set',()=>{const record=runtimeCatalogCacheRecord(key,artifacts,{createdAt:'2026-08-17T00:00:00.000Z'}),cached=hydrateRuntimeCatalogCache(record,key);assert.equal(cached.length,5);assert.deepEqual(cached.map(x=>x.id),RUNTIME_CATALOG_IDS);assert.ok(cached.every(x=>x.catalogSource==='cache'&&x.phase==='pending'&&!x.verified))});
test('catalog cache rejects stale keys, duplicates, wrong publisher/host and invalid digests',()=>{const record=runtimeCatalogCacheRecord(key,artifacts);assert.equal(hydrateRuntimeCatalogCache(record,`${key}|other`),null);assert.equal(hydrateRuntimeCatalogCache({...record,artifacts:[...record.artifacts.slice(0,4),record.artifacts[0]]},key),null);assert.equal(hydrateRuntimeCatalogCache({...record,artifacts:record.artifacts.map((a,i)=>i?a:{...a,publisher:'evil'})},key),null);assert.equal(hydrateRuntimeCatalogCache({...record,artifacts:record.artifacts.map((a,i)=>i?a:{...a,source:'https://evil.invalid/a'})},key),null);assert.equal(hydrateRuntimeCatalogCache({...record,artifacts:record.artifacts.map((a,i)=>i?a:{...a,sha256:'deadbeef'})},key),null)});
test('transient live discovery falls back to an integrity-valid local catalog cache',{skip:!['linux','darwin'].includes(process.platform)||!['x64','arm64'].includes(process.arch)},async()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-catalog-cache-')),runtime=path.join(home,'runtime');fs.mkdirSync(runtime,{recursive:true});const arch=process.arch==='arm64'?'arm64':'x64',realKey=runtimeCatalogKey({platform:process.platform,arch,sherpaVersion:'1.13.3',llamaBuild:'b10218',asrModel:'sherpa-onnx-whisper-tiny.tar.bz2',ttsModel:'vits-piper-it_IT-riccardo-x_low.tar.bz2',qwenModel:'Qwen3-0.6B.Q4_K_M.gguf'});fs.writeFileSync(path.join(runtime,'catalog-cache.json'),JSON.stringify(runtimeCatalogCacheRecord(realKey,artifacts)));let catalogCalls=0,downloadCalls=0;const fetchImpl=async url=>{url=String(url);if(url.includes('api.github.com')||url.includes('huggingface.co/Qwen')){catalogCalls++;return {ok:false,status:503,body:null,headers:new Headers()}}downloadCalls++;return {ok:false,status:404,body:null,headers:new Headers()}};const manager=createRuntimeManager({home,env:{TEDDY_RUNTIME_AUTOINSTALL:'1',TEDDY_RUNTIME_FETCH_ATTEMPTS:'1',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0'},fetchImpl});try{const status=await manager.start();assert.ok(catalogCalls>=1);assert.equal(downloadCalls,1);assert.equal(status.lastProblem?.error,'artifact_download_failed');assert.equal(status.lastProblem?.stage,'download')}finally{manager.stop();fs.rmSync(home,{recursive:true,force:true})}});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {artifactProblem,publicFailure,retryDelay,withRetry} from '../server/lib/runtime-resilience.mjs';
import {publicRuntimeStatus} from '../server/lib/runtime-state.mjs';

test('transient artifact failures retry with bounded attempts',async()=>{
  let calls=0,sleeps=0;
  const value=await withRetry(async()=>{
    calls++;
    if(calls<3)throw artifactProblem({stage:'catalog',artifactId:'llama-runtime',provider:'github',status:429,retryable:true});
    return 'ok';
  },{attempts:4,sleep:async()=>{sleeps++}});
  assert.equal(value,'ok');
  assert.equal(calls,3);
  assert.equal(sleeps,2);
  assert.ok(retryDelay(99)<=4000);
});

test('permanent catalog failures fail closed without retry storm',async()=>{
  let calls=0;
  await assert.rejects(()=>withRetry(async()=>{
    calls++;
    throw artifactProblem({stage:'catalog',artifactId:'asr-whisper-tiny',provider:'github',status:404,retryable:false});
  },{attempts:8,sleep:async()=>{}}),/artifact_catalog_unavailable/);
  assert.equal(calls,1);
});

test('voice provisioning diagnostics preserve actionable public failure context',()=>{
  const failure=artifactProblem({stage:'download',artifactId:'tts-riccardo',provider:'k2-fsa',status:503,retryable:true});
  const pub=publicFailure(failure);
  assert.deepEqual(pub,{error:'artifact_download_failed',stage:'download',artifactId:'tts-riccardo',provider:'k2-fsa',httpStatus:503,retryable:true});
  const status=publicRuntimeStatus({installPhase:'failed',lastError:{...pub,at:'2026-08-17T00:00:00.000Z'}});
  assert.equal(status.lastProblem.artifactId,'tts-riccardo');
  assert.equal(status.lastProblem.httpStatus,503);
  assert.equal(status.lastProblem.retryable,true);
  assert.equal(publicFailure(artifactProblem({stage:'catalog'})).httpStatus,null);
  assert.equal(publicRuntimeStatus({installPhase:'failed',lastError:{error:'x',httpStatus:null}}).lastProblem.httpStatus,null);
});

test('managed runtime uses a verified existing llama build and can be retried after failure',()=>{
  const source=fs.readFileSync(new URL('../server/lib/runtime-manager.mjs',import.meta.url),'utf8');
  assert.match(source,/LLAMA_BUILD='b10218'/);
  assert.doesNotMatch(source,/LLAMA_BUILD='b10375'/);
  assert.match(source,/finally\(\(\)=>\{startPromise=null\}\)/);
  assert.match(source,/return \{start,retry,status,config,stop/);
  assert.match(source,/TEDDY_RUNTIME_FETCH_ATTEMPTS/);
  assert.match(source,/GITHUB_TOKEN/);
});

test('runtime preflight requires TTS data and executable engine binaries',()=>{
  const source=fs.readFileSync(new URL('../server/lib/runtime-manager.mjs',import.meta.url),'utf8');
  assert.match(source,/dataOk/);
  assert.match(source,/fs\.constants\.X_OK/);
  assert.match(source,/stage:'self_test'/);
});

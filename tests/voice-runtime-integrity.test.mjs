import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {EventEmitter} from 'node:events';
import {createRuntimeManager} from '../server/lib/runtime-manager.mjs';

const envBase={TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0'};
const tempHome=()=>fs.mkdtempSync(path.join(os.tmpdir(),'teddy-runtime-integrity-'));
const writeGeneration=(home,id,runtime)=>{const dir=path.join(home,'runtime','generations',id);fs.mkdirSync(dir,{recursive:true});if(runtime!==undefined)fs.writeFileSync(path.join(dir,'runtime.json'),JSON.stringify(runtime));fs.mkdirSync(path.join(home,'runtime'),{recursive:true});fs.writeFileSync(path.join(home,'runtime','current.json'),JSON.stringify({id,createdAt:'2026-08-17T00:00:00.000Z'}));return dir};
const closeServer=server=>new Promise(resolve=>server.close(resolve));

test('corrupt current generation is quarantined instead of blocking bootstrap forever',async()=>{
  const home=tempHome();
  try{
    writeGeneration(home,'broken',undefined);
    const manager=createRuntimeManager({home,env:envBase,fetchImpl:async()=>{throw new Error('network should not be used')}});
    const status=await manager.start();
    assert.equal(status.ready,false);
    assert.equal(fs.existsSync(path.join(home,'runtime','current.json')),false);
    assert.equal(status.lastProblem?.error,'runtime_generation_invalid');
    assert.equal(status.lastProblem?.stage,'layout');
    manager.stop();
  }finally{fs.rmSync(home,{recursive:true,force:true})}
});

test('occupied llama port is rejected before spawning and failure identity is preserved',async()=>{
  const home=tempHome(),server=net.createServer();
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',resolve).once('error',reject));
  const port=server.address().port;let spawns=0;
  try{
    writeGeneration(home,'g1',{engines:{asrCommand:'/unused',asrArgs:[],ttsCommand:'/unused',ttsArgs:[]},llama:{executable:'/unused',model:'/unused.gguf',port}});
    const manager=createRuntimeManager({home,env:envBase,spawnImpl:()=>{spawns++;throw new Error('must not spawn')},fetchImpl:async()=>{throw new Error('must not fetch')}});
    const status=await manager.start();
    assert.equal(spawns,0);
    assert.equal(status.ready,false);
    assert.equal(status.lastProblem?.error,'local_llm_port_in_use');
    assert.equal(status.lastProblem?.stage,'start');
    assert.equal(status.lastProblem?.retryable,false);
    manager.stop();
  }finally{await closeServer(server);fs.rmSync(home,{recursive:true,force:true})}
});

test('spawn errors fail closed instead of becoming uncaught process errors',async()=>{
  const home=tempHome();
  let child;
  try{
    const probe=net.createServer();await new Promise((resolve,reject)=>probe.listen(0,'127.0.0.1',resolve).once('error',reject));const port=probe.address().port;await closeServer(probe);
    writeGeneration(home,'g2',{engines:{asrCommand:'/unused',asrArgs:[],ttsCommand:'/unused',ttsArgs:[]},llama:{executable:'/missing',model:'/unused.gguf',port}});
    const spawnImpl=()=>{child=new EventEmitter();child.stderr=new EventEmitter();child.killed=false;child.kill=()=>{child.killed=true;return true};queueMicrotask(()=>child.emit('error',Object.assign(new Error('ENOENT'),{code:'ENOENT'})));return child};
    const manager=createRuntimeManager({home,env:envBase,spawnImpl,fetchImpl:async()=>{throw new Error('not ready')}});
    const status=await manager.start();
    assert.equal(status.ready,false);
    assert.equal(status.lastProblem?.error,'local_llm_start_failed');
    assert.equal(status.lastProblem?.stage,'start');
    manager.stop();
  }finally{fs.rmSync(home,{recursive:true,force:true})}
});

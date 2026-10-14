import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRuntimeManager} from '../server/lib/runtime-manager.mjs';
import {createLocalService} from '../server/lib/local-service.mjs';
import {validateTextGeneration} from '../server/lib/text-runtime-contract.mjs';

const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const serverStub=`#!/usr/bin/env node
const http=require('node:http'),fs=require('node:fs'),a=process.argv;
const port=Number(a[a.indexOf('--port')+1]),model=a[a.indexOf('-m')+1];
if(!fs.existsSync(model))process.exit(23);
const server=http.createServer((req,res)=>{
 if(req.url==='/v1/models')return res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({data:[{id:'teddy-text-fixture'}]}));
 if(req.url==='/v1/chat/completions'){let body='';req.on('data',c=>body+=c);req.on('end',()=>{const msg=JSON.parse(body).messages.at(-1).content;res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({choices:[{message:{content:'Ciao dal processo locale: '+msg}}]}))});return}
 res.writeHead(404).end();
});server.listen(port,'127.0.0.1');process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
`;
const tarFixture=root=>{
 const bin=path.join(root,'bin-ubuntu-x64');fs.mkdirSync(bin);
 const script=path.join(bin,'llama-server');fs.writeFileSync(script,serverStub,{mode:0o755});fs.chmodSync(script,0o755);
 const out=path.join(root,'llama.tar.gz');const r=spawnSync('tar',['-czf',out,'-C',root,'bin-ubuntu-x64']);if(r.status!==0)throw Error('tar unavailable');return fs.readFileSync(out);
};
const openPort=async()=>{const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port};
const waitClosed=async port=>{for(let i=0;i<50;i++){const ok=await new Promise(resolve=>{const sock=net.connect(port,'127.0.0.1');sock.once('connect',()=>{sock.destroy();resolve(false)});sock.once('error',()=>resolve(true))});if(ok)return;await new Promise(r=>setTimeout(r,50))}throw Error('old process did not stop')};

test('text-only managed install, promoted GGUF paths, actual loopback HTTP and networkless reboot',{skip:process.platform!=='linux'||process.arch!=='x64',timeout:35000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-text-e2e-')),home=path.join(root,'home');
 const tar=tarFixture(root),gguf=Buffer.from('GGUF language model fixture - not real model');
 const tarHash=digest(tar),ggufHash=digest(gguf),port=await openPort();
 const env={TEDDY_TEXT_ONLY:'1',TEDDY_RUNTIME_AUTOINSTALL:'1',TEDDY_RUNTIME_FETCH_ATTEMPTS:'1',TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0',TEDDY_LLAMA_PORT:String(port)};
 const asset={name:'llama-b10218-bin-ubuntu-x64.tar.gz',digest:'sha256:'+tarHash,size:tar.length,browser_download_url:'https://github.com/fixtures/teddy-llama'};
 let network=0;const fetchImpl=async(url,options={})=>{
   const name=String(url);
   if(name.startsWith('http://127.0.0.1:'))return fetch(name,options);
   network++;
   if(name.includes('api.github.com/repos/ggml-org/llama.cpp/releases/tags/b10218'))return Response.json({assets:[asset]});
   if(name.includes('huggingface.co/QuantFactory/Qwen3-0.6B-GGUF')){
     if(options.method==='HEAD')throw Error('Xet HEAD hash is not a model SHA-256');
     return new Response(gguf);
   }
   if(name==='https://github.com/fixtures/teddy-llama')return new Response(tar);
   throw Error('unrequested network: '+name);
 };
 let runtime,offline;
 try{
   runtime=createRuntimeManager({home,env,fetchImpl,modelSha256:ggufHash,modelBytes:gguf.length});
   const installed=await runtime.start();
   assert.equal(installed.ready,true,JSON.stringify(installed.lastProblem));
   assert.equal(installed.textReady,true);assert.equal(installed.mode,'text');
   assert.equal(installed.engines.llm.healthy,true);
   assert.equal(installed.engines.asr.healthy,false);assert.equal(installed.engines.tts.healthy,false);
   assert.deepEqual(installed.artifacts.map(x=>x.id),['llama-runtime','qwen3-0.6b']);
   assert.ok(installed.artifacts.every(x=>x.verified));
   const pointer=JSON.parse(fs.readFileSync(path.join(home,'runtime','current.json'),'utf8'));
   const rootGen=path.join(home,'runtime','generations',pointer.id);
   const manifest=JSON.parse(fs.readFileSync(path.join(rootGen,'runtime.json'),'utf8'));
   assert.equal(validateTextGeneration(rootGen,manifest),true);
   assert.ok(manifest.llama.model.startsWith(rootGen));assert.ok(!manifest.llama.model.includes('/staging/'));
   const service=createLocalService({runtime,env,contextProvider:()=>({turns:[],memories:[]})});
   const answer=await service.text('Teddy funziona?',{context:{turns:[],memories:[]}});
   assert.match(answer,/Ciao dal processo locale: Teddy funziona/);
   assert.ok(network>=3);
   runtime.stop();await waitClosed(port);
   const prohibited=async(url,options)=>{if(String(url).startsWith('http://127.0.0.1:'))return fetch(url,options);throw Error('network forbidden after install')};
   offline=createRuntimeManager({home,env:{...env,TEDDY_RUNTIME_AUTOINSTALL:'0'},fetchImpl:prohibited,modelSha256:ggufHash});
   const restarted=await offline.start();
   assert.equal(restarted.textReady,true);assert.equal(restarted.ready,true);
   assert.match(await createLocalService({runtime:offline,env}).text('Senza rete?',{context:{turns:[],memories:[]}}),/Senza rete/);
 }finally{offline?.stop();runtime?.stop();await new Promise(r=>setTimeout(r,150));fs.rmSync(root,{recursive:true,force:true})}
});

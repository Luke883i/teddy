import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

test('fur OFF/ON survives the real HTTP config API and process restart', {timeout:30000},async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-fur-http-'));
  const port=19321;
  let processHandle=null;
  const request=(method,url,payload)=>new Promise((resolve,reject)=>{
    const data=payload===undefined?null:JSON.stringify(payload);
    const req=http.request({hostname:'127.0.0.1',port,path:url,method,headers:data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{}},res=>{
      const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>{const text=Buffer.concat(chunks).toString();try{resolve({status:res.statusCode,data:JSON.parse(text)})}catch{reject(new Error('invalid response: '+text.slice(0,100)))}})});
    req.on('error',reject);if(data)req.write(data);req.end();
  });
  async function start(){
    processHandle=spawn(process.execPath,['server/main.mjs'],{
      cwd:new URL('..',import.meta.url).pathname,
      env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'127.0.0.1',TEDDY_PORT:String(port)},
      stdio:['ignore','pipe','pipe']});
    let reason='';processHandle.stderr.on('data',x=>{reason+=String(x).slice(0,500)});
    for(let k=0;k<100;k++){
      if(processHandle.exitCode!==null)throw Error('server exited: '+reason);
      try{const r=await request('GET','/api/bootstrap');if(r.status===200)return}catch{}
      await new Promise(r=>setTimeout(r,75));
    }
    throw Error('server start failed: '+reason);
  }
  async function stop(){
    if(!processHandle)return;
    const child=processHandle;processHandle=null;
    if(child.exitCode!==null)return;
    await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');setTimeout(resolve,1800).unref()});
  }
  try{
    await start();
    const initial=await request('GET','/api/bootstrap');
    assert.equal(initial.data.config.appearance.furEnabled,true);
    const off=await request('PUT','/api/config',{...initial.data.config,appearance:{...initial.data.config.appearance,furEnabled:false}});
    assert.equal(off.status,200);assert.equal(off.data.config.appearance.furEnabled,false);
    assert.equal((await request('GET','/api/bootstrap')).data.config.appearance.furEnabled,false);
    await stop();await start();
    assert.equal((await request('GET','/api/bootstrap')).data.config.appearance.furEnabled,false);
    const on=await request('PUT','/api/config',{appearance:{furEnabled:true}});
    assert.equal(on.status,200);assert.equal(on.data.config.appearance.furEnabled,true);
    const invalid=await request('PUT','/api/config',{appearance:{furEnabled:'off'}});
    assert.equal(invalid.data.config.appearance.furEnabled,true);
  }finally{await stop();fs.rmSync(home,{recursive:true,force:true})}
});

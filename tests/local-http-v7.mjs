import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const port=8797,home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v7-http-'));
const child=spawn(process.execPath,['server/main.mjs'],{cwd:process.cwd(),env:{...process.env,TEDDY_HOME:home,TEDDY_PORT:String(port),TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_PROVIDER:'local'},stdio:['ignore','pipe','pipe']});
const base=`http://127.0.0.1:${port}`;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(`${base}/api/health`);if(r.ok){ready=true;break}}catch{}await sleep(50)}assert.equal(ready,true,'server ready');
 const boot=await (await fetch(`${base}/api/bootstrap`)).json();assert.equal(boot.version,'0.7.0');assert.equal(boot.ai.provider,'local');assert.equal(boot.ai.accountRequired,false);assert.equal(boot.ai.configured,true);
 const wav=Buffer.alloc(44);wav.write('RIFF');wav.write('WAVE',8);wav.write('data',36);
 const turn=await fetch(`${base}/api/local/turn`,{method:'POST',headers:{'content-type':'audio/wav'},body:wav});assert.equal(turn.status,200);const text=await turn.text();for(const type of ['transcript','text.delta','audio','done'])assert.match(text,new RegExp(`"type":"${type.replace('.','\\.')}"`));
 const cloud=await fetch(`${base}/api/realtime/session`,{method:'POST',headers:{'content-type':'application/sdp'},body:'v=0\r\n'});assert.equal(cloud.status,409);assert.equal((await cloud.json()).error,'cloud_provider_not_selected');
 console.log('local v0.7 HTTP smoke ok');
}finally{child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(1500)]);fs.rmSync(home,{recursive:true,force:true})}

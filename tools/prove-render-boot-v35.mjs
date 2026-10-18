// An actual local Node/HTTP/SQLite boot through the same Render entrypoint.
// Requires CI runner to create writable /var/data; does NOT claim live Render.
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import fs from 'node:fs';
import crypto from 'node:crypto';
import net from 'node:net';
import assert from 'node:assert/strict';
const port=await new Promise((resolve,reject)=>{
 const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});
});
const sha='a'.repeat(40),password='CI-only-passcode-123456789012345';
const env={...process.env,RENDER:'true',RENDER_EXTERNAL_URL:'https://teddy-render-smoke.onrender.com',
 RENDER_EXTERNAL_HOSTNAME:'teddy-render-smoke.onrender.com',RENDER_GIT_COMMIT:sha,
 TEDDY_RENDER_MASTER_B64:Buffer.alloc(32,33).toString('base64'),TEDDY_AUTH_PASSWORD:password,
 TEDDY_PROVIDER:'openai',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_HOME:'/var/data/teddy',
 NODE_ENV:'production',PORT:String(port),TEDDY_ENABLE_VOICE_ENDPOINTS:'0'};
const basic='Basic '+Buffer.from('teddy:'+password).toString('base64');
let child;
async function launch(){
 child=spawn(process.execPath,['scripts/render-start-v35.mjs'],{env,stdio:['ignore','pipe','pipe']});
 let logs='';child.stderr.on('data',b=>{logs+=String(b).slice(-400)});
 for(let i=0;i<120;i++){
  if(child.exitCode!=null)throw Error('render_child_exited:'+child.exitCode+':'+logs.slice(-400));
  try{const r=await hit('/api/health',{auth:false});if(r.status===200)return}catch{}
  await sleep(100);
 }
 throw Error('render_startup_timeout:'+logs.slice(-400));
}
async function stop(){
 if(!child)return;
 const p=child;child=null;
 if(p.exitCode===null){p.kill('SIGTERM');await Promise.race([new Promise(resolve=>p.once('exit',resolve)),sleep(4500)]);if(p.exitCode===null)p.kill('SIGKILL')}
}
async function hit(route,{auth=true,method='GET',body,host='teddy-render-smoke.onrender.com'}={}){
 const headers={host,...(auth?{authorization:basic}:{})};
 if(body)headers['content-type']='application/json';
 const r=await fetch('http://127.0.0.1:'+port+route,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(3000)});
 return {status:r.status,payload:await r.json().catch(()=>({}))};
}
const checks=[];
const check=(name,valid)=>{assert.equal(valid,true,name);checks.push(name)};
try{
 await launch();
 let r=await hit('/api/health',{auth:false});check('liveness',r.status===200&&r.payload.liveness==='up');
 r=await hit('/api/version',{auth:false});check('version-protected',r.status===401);
 r=await hit('/api/version');check('exact-sha',r.status===200&&r.payload.revision===sha);
 r=await hit('/api/ready');check('model-not-faked',r.status===503);
 r=await hit('/api/version',{host:'attacker.invalid'});check('host-blocked',r.status===421);
 r=await hit('/api/bootstrap');check('bootstrap',r.status===200&&r.payload.security.authenticated===true);
 const install=r.payload.install.id;
 const requestId=crypto.randomUUID(),text='chi sei?';
 r=await hit('/api/text/turn',{method:'POST',body:{text,requestId}});
 check('deterministic-authenticated',r.status===200&&r.payload.semantic?.path==='deterministic');
 const original=r.payload.reply;
 await stop();await launch();
 r=await hit('/api/bootstrap');check('sqlite-restart',r.payload.install.id===install);
 r=await hit('/api/text/turn',{method:'POST',body:{text,requestId}});
 check('exact-once-replay',r.status===200&&r.payload.replayed===true&&r.payload.reply===original);
 console.log(JSON.stringify({schema:'teddy.render.local-smoke.v35',status:'PASS',checks,actualHttp:true,actualSQLite:true,realRender:false,realQwen:false}));
}finally{await stop()}

// Exercise the actual standard CLI, not just an imported router. Linux CI only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const home=mkdtempSync(path.join(tmpdir(),'teddy-npm-v36-'));
const port=await new Promise((resolve,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p))})});
const env={...process.env,RENDER:'false',TEDDY_HOME:home,TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_PROVIDER:'openai'};
const root='http://127.0.0.1:'+port;
let child=null,tail='',checks=[];
async function get(url,options){
 const response=await fetch(root+url,{...options,signal:AbortSignal.timeout(2000)});
 return {status:response.status,body:await response.json().catch(()=>({}))};
}
async function launch(){
 tail='';
 child=spawn('npm',['start','--','--no-install','--port='+port],{env,stdio:['ignore','pipe','pipe'],detached:true});
 for(const stream of [child.stdout,child.stderr])stream.on('data',buf=>{tail=(tail+String(buf)).slice(-2400)});
 let ok=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null||child.signalCode!==null)break;
  try{const r=await get('/api/health');if(r.status===200){ok=true;break}}catch{}
  await sleep(100);
 }
 assert.ok(ok,'npm start HTTP startup failed: '+tail.slice(-500));
 checks.push('npm-start-live');
}
async function stop(){
 if(!child)return;
 const p=child;child=null;
 try{process.kill(-p.pid,'SIGTERM')}catch{p.kill('SIGTERM')}
 await Promise.race([new Promise(resolve=>p.once('exit',resolve)),sleep(3500)]);
 if(p.exitCode===null&&p.signalCode===null){try{process.kill(-p.pid,'SIGKILL')}catch{p.kill('SIGKILL')}}
 let stopped=false;
 for(let i=0;i<40;i++){try{await get('/api/health')}catch{stopped=true;break}await sleep(100)}
 assert.ok(stopped,'npm process group left Teddy running');
}
try{
 const help=execFileSync('npm',['start','--','--help'],{env,encoding:'utf8',timeout:12000});
 assert.match(help,/npm start/);checks.push('npm-help');
 const doc=execFileSync('npm',['run','doctor'],{env,encoding:'utf8',timeout:15000});
 assert.match(doc,/OK\s+sqlite quick_check/);checks.push('npm-doctor');
 const shim=execFileSync('bash',['teddy.sh','--doctor'],{env,encoding:'utf8',timeout:15000});
 assert.match(shim,/OK\s+node 24.x/);checks.push('shell-shim');
 await launch();
 const health=await get('/api/health');assert.equal(health.body.liveness,'up');
 const requestId=randomUUID(),question='chi sei?';
 const reply=await get('/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId,text:question})});
 assert.equal(reply.status,200);assert.equal(reply.body.semantic?.path,'deterministic');
 const initial=reply.body.reply;checks.push('npm-http-deterministic');
 const install=await get('/api/bootstrap');assert.equal(install.status,200);
 const installId=install.body.install?.id;assert.ok(installId);
 await stop();checks.push('npm-sigterm');
 await launch();
 const second=await get('/api/bootstrap');assert.equal(second.body.install?.id,installId);
 const replay=await get('/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId,text:question})});
 assert.equal(replay.status,200);assert.equal(replay.body.replayed,true);
 assert.equal(replay.body.reply,initial);checks.push('npm-sqlite-replay');
 console.log('TEDDY_NPM_START_V36_PASS',JSON.stringify({checks,sessions:1,realHttp:true,realSQLite:true,realGGUF:false}));
}finally{
 await stop().catch(()=>{});
 rmSync(home,{recursive:true,force:true});
}

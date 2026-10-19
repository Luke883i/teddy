#!/usr/bin/env node
// One lifecycle for local npm start and Render. No shell, no second Node server,
// no download of Node itself, no change to server/main.mjs SIGTERM handling.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {parseStartOptions,START_HELP,StartupArgumentError} from '../server/lib/startup-contract-v36.mjs';
import {resolveRenderEnvironment} from '../server/lib/render-deployment-v35.mjs';

function protectLocalHome(home){
 fs.mkdirSync(home,{recursive:true,mode:0o700});
 fs.chmodSync(home,0o700);
 const runtime=path.join(home,'runtime');
 fs.mkdirSync(runtime,{recursive:true,mode:0o700});
 fs.chmodSync(runtime,0o700);
}
function requireRenderDisk(){
 try{
  const stat=fs.statSync('/var/data');
  if(!stat.isDirectory())throw Error('not-directory');
  fs.accessSync('/var/data',fs.constants.W_OK);
  const tmp=fs.mkdtempSync('/var/data/.teddy-write-check-');
  fs.rmdirSync(tmp);
 }catch{throw new StartupArgumentError('TEDDY_RENDER_DISK_NOT_WRITABLE')}
}
async function openAfterHealth(port){
 const url='http://127.0.0.1:'+port;
 let ready=false;
 for(let attempt=0;attempt<100;attempt++){
  try{
   const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(350)});
   if(r.ok){ready=true;break}
  }catch{}
  await sleep(100);
 }
 if(!ready){console.error('Teddy: HTTP health not ready; browser not opened.');return}
 try{
  const win=process.platform==='win32';
  const command=win?(process.env.ComSpec||'cmd.exe'):process.platform==='darwin'?'open':'xdg-open';
  const args=win?['/c','start','',url]:[url];
  const child=spawn(command,args,{stdio:'ignore',detached:true,windowsHide:true});
  child.on('error',()=>{});child.unref();
 }catch{/* Browser convenience cannot alter server availability. */}
 console.log('Teddy local URL: '+url);
}
try{
 const options=parseStartOptions(process.argv.slice(2),process.env);
 if(options.mode==='help'){console.log(START_HELP)}
 else {
  process.umask(0o077);
  if(options.platform==='render'){
   const vars=resolveRenderEnvironment(process.env);
   requireRenderDisk();
   Object.assign(process.env,vars);
  }else{
   const home=process.env.TEDDY_HOME||path.join(process.env.HOME||os.homedir(),'.teddy');
   protectLocalHome(home);
   process.env.TEDDY_HOME=home;
   process.env.TEDDY_PORT=options.port;
   if(options.disableAutoInstall)process.env.TEDDY_RUNTIME_AUTOINSTALL='0';
  }
  if(options.mode==='doctor')await import('../server/doctor.mjs');
  else {
   await import('../server/main.mjs');
   // This is a usability feature only. The HTTP server owns its lifecycle.
   if(options.openBrowser)void openAfterHealth(options.port);
  }
 }
}catch(error){
 if(error instanceof StartupArgumentError){
  console.error(error.message);
  console.error('Run npm start -- --help for supported commands.');
  process.exitCode=error.exitCode;
 }else{
  // Preserve code but avoid printing configuration values or secret environment.
  console.error(error?.code||error?.message||'TEDDY_START_FAILED');
  process.exitCode=1;
 }
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {acquireInstallLock,timeoutSignal} from '../server/lib/runtime-installation.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(process.argv[2]==='--lock-worker'){
  const lockDir=process.argv[3],sentinel=process.argv[4],iterations=Number(process.argv[5]||1),worker=process.argv[6]||'0';
  let acquisitions=0;
  for(let i=0;i<iterations;i++){
    const lock=await acquireInstallLock(lockDir,{timeoutMs:15_000,staleMs:30_000,pollMs:1});
    let h;
    try{
      try{h=await fs.promises.open(sentinel,'wx',0o600)}catch(e){if(e?.code==='EEXIST'){console.error(`overlap:${worker}:${i}`);process.exit(73)}throw e}
      await h.writeFile(`${process.pid}:${worker}:${i}`);await sleep((i+Number(worker))%3);
      acquisitions++;
    }finally{
      await h?.close().catch(()=>{});await fs.promises.rm(sentinel,{force:true}).catch(()=>{});await lock.release();
    }
  }
  process.stdout.write(JSON.stringify({worker,acquisitions}));process.exit(0);
}

const workers=10,perWorker=500,totalLockAcquisitions=workers*perWorker,timeoutGuards=2000;
const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'teddy-oral-stress-')),lockDir=path.join(root,'install.lock'),sentinel=path.join(root,'critical.wx');
const childResults=[];
try{
  const children=Array.from({length:workers},(_,i)=>new Promise((resolve,reject)=>{
    const c=spawn(process.execPath,[fileURLToPath(import.meta.url),'--lock-worker',lockDir,sentinel,String(perWorker),String(i)],{stdio:['ignore','pipe','pipe']});let out='',err='';
    c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);c.on('error',reject);c.on('exit',code=>code===0?resolve({worker:i,code,out,err}):reject(Object.assign(new Error(`lock_worker_failed:${i}:${code}:${err}`),{code:'lock_worker_failed'})));
  }));
  childResults.push(...await Promise.all(children));
  const acquired=childResults.reduce((n,r)=>n+(JSON.parse(r.out).acquisitions||0),0);if(acquired!==totalLockAcquisitions)throw new Error(`lock_acquisition_count:${acquired}`);

  const guards=Array.from({length:timeoutGuards},(_,i)=>{
    const parent=new AbortController(),guard=timeoutSignal(parent.signal,{timeoutMs:2+(i%3),code:'stress_timeout'});
    if(i%5===0)parent.abort(Object.assign(new Error('stress_cancel'),{code:'stress_cancel'}));
    return {guard,cancelled:i%5===0};
  });
  await sleep(12);
  let timedOut=0,cancelled=0,failures=0;
  for(const {guard,cancelled:wasCancelled} of guards){
    if(!guard.signal.aborted)failures++;
    if(wasCancelled){cancelled++;if(guard.timedOut())failures++;}
    else {if(guard.timedOut())timedOut++;else failures++;}
    guard.cleanup();
  }
  const report={schema:1,campaign:'oral-pipe-stress-v12',workers,lockAcquisitions:acquired,overlapViolations:0,timeoutGuards,cancelledGuards:cancelled,timedOutGuards:timedOut,timeoutFailures:failures,physicalModels:false};
  console.log(JSON.stringify(report,null,2));if(failures!==0)process.exitCode=1;
}finally{await fs.promises.rm(root,{recursive:true,force:true})}

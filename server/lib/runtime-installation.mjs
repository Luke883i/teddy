import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sleepDefault=ms=>new Promise(r=>setTimeout(r,ms));
const isAliveDefault=pid=>{if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true}catch(e){return e?.code==='EPERM'}};
const safeRead=async file=>{try{return JSON.parse(await fs.promises.readFile(file,'utf8'))}catch{return null}};

export async function acquireInstallLock(lockDir,{timeoutMs=30_000,staleMs=120_000,pollMs=80,now=Date.now,pid=process.pid,isProcessAlive=isAliveDefault,sleep=sleepDefault}={}){
  const token=crypto.randomUUID(),ownerFile=path.join(lockDir,'owner.json'),deadline=now()+Math.max(1,timeoutMs);
  for(;;){
    try{
      await fs.promises.mkdir(lockDir,{mode:0o700});
      const owner={pid,token,acquiredAt:new Date(now()).toISOString(),heartbeatAt:now()};
      await fs.promises.writeFile(ownerFile,JSON.stringify(owner),{mode:0o600,flag:'wx'});
      let released=false;
      return {
        token,
        async heartbeat(){if(released)return false;const current=await safeRead(ownerFile);if(current?.token!==token)return false;current.heartbeatAt=now();await fs.promises.writeFile(ownerFile,JSON.stringify(current),{mode:0o600});return true},
        async release(){if(released)return;released=true;const current=await safeRead(ownerFile);if(current?.token===token)await fs.promises.rm(lockDir,{recursive:true,force:true});}
      };
    }catch(e){
      if(e?.code!=='EEXIST'){
        if(e?.code==='ENOENT'){await fs.promises.rm(lockDir,{recursive:true,force:true}).catch(()=>{});continue;}
        throw e;
      }
      const owner=await safeRead(ownerFile),heartbeat=Number(owner?.heartbeatAt||0);
      let age=heartbeat?Math.max(0,now()-heartbeat):0;
      if(!owner){try{const st=await fs.promises.stat(lockDir);age=Math.max(0,now()-st.mtimeMs)}catch{age=0}}
      const ownerPid=Number(owner?.pid);
      const dead=Boolean(owner)&&!isProcessAlive(ownerPid);
      const staleMalformed=!owner&&age>staleMs;
      if(dead||staleMalformed){
        const quarantine=`${lockDir}.stale.${process.pid}.${crypto.randomUUID()}`;
        try{await fs.promises.rename(lockDir,quarantine);await fs.promises.rm(quarantine,{recursive:true,force:true});continue}catch(err){if(!['ENOENT','EEXIST','ENOTEMPTY'].includes(err?.code))throw err;}
      }
      if(now()>=deadline)throw Object.assign(new Error('runtime_install_locked'),{code:'runtime_install_locked',stage:'start',retryable:true});
      await sleep(Math.max(1,pollMs));
    }
  }
}

export async function withInstallLock(lockDir,operation,options){const lock=await acquireInstallLock(lockDir,options);try{return await operation(lock)}finally{await lock.release()}}

export function timeoutSignal(parent,{timeoutMs=30_000,code='runtime_operation_timeout'}={}){
  const controller=new AbortController();let timedOut=false;
  const abort=()=>{if(!controller.signal.aborted)controller.abort(parent?.reason)};
  if(parent?.aborted)abort();else parent?.addEventListener?.('abort',abort,{once:true});
  const timer=setTimeout(()=>{if(!controller.signal.aborted){timedOut=true;controller.abort(Object.assign(new Error(code),{code}))}},Math.max(1,timeoutMs));
  return {signal:controller.signal,timedOut:()=>timedOut,cleanup(){clearTimeout(timer);parent?.removeEventListener?.('abort',abort)}};
}

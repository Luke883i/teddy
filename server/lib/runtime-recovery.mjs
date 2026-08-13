const defaultSleep=ms=>new Promise(r=>setTimeout(r,ms));
export function recoveryDelay(attempt,{baseMs=250,maxMs=4000}={}){const n=Math.max(1,Math.min(10,Number(attempt)||1));return Math.min(maxMs,baseMs*(2**(n-1)))}
export function recoveryCooldown(cycles,{baseMs=1000,maxMs=30000}={}){const n=Math.max(0,Math.min(10,Number(cycles)||0));return Math.min(maxMs,baseMs*(2**n))}
export function shouldAttemptRuntimeRecovery({provider='local',closing=false,wasReady=false,ready=false,active=false,now=Date.now(),nextAt=0}={}){return provider==='local'&&!closing&&wasReady&&!ready&&!active&&Number(now)>=Number(nextAt||0)}
export async function recoverManagedRuntime({createRuntime,maxAttempts=3,sleep=defaultSleep}={}){
  if(typeof createRuntime!=='function')throw new TypeError('createRuntime required');
  const limit=Math.max(1,Math.min(5,Number(maxAttempts)||3));let lastError=null;
  for(let attempt=1;attempt<=limit;attempt++){
    if(attempt>1)await sleep(recoveryDelay(attempt-1));
    const runtime=createRuntime();
    try{await runtime.start();if(runtime.status()?.ready)return {runtime,attempts:attempt};lastError=Object.assign(new Error('runtime_recovery_not_ready'),{code:'runtime_recovery_not_ready'})}
    catch(e){lastError=e}
    try{runtime.stop?.()}catch{}
  }
  throw Object.assign(lastError||new Error('runtime_recovery_failed'),{code:lastError?.code||'runtime_recovery_failed'});
}

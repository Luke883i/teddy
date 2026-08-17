const DEFAULT_TRANSIENT_STATUS=new Set([408,425,429,500,502,503,504]);

export const ARTIFACT_STAGES=Object.freeze(['catalog','download','verify','extract','layout','start','self_test']);

const finiteStatus=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;

export function artifactProblem({stage='catalog',artifactId=null,provider=null,status=null,cause=null,retryable}={}){
  const httpStatus=finiteStatus(status);
  const transient=retryable??(httpStatus==null||DEFAULT_TRANSIENT_STATUS.has(httpStatus));
  const code=stage==='catalog'?'artifact_catalog_unavailable':stage==='download'?'artifact_download_failed':`runtime_${stage}_failed`;
  return Object.assign(new Error(code),{
    code,
    stage,
    artifactId:artifactId||null,
    provider:provider||null,
    httpStatus,
    retryable:Boolean(transient),
    cause:cause instanceof Error?cause:undefined
  });
}

export function retryDelay(attempt,{baseMs=250,maxMs=4000}={}){
  const n=Math.max(1,Math.min(8,Number(attempt)||1));
  return Math.min(maxMs,baseMs*(2**(n-1)));
}

export async function withRetry(operation,{attempts=4,sleep=ms=>new Promise(r=>setTimeout(r,ms)),shouldRetry=e=>e?.retryable===true}={}){
  if(typeof operation!=='function')throw new TypeError('operation required');
  const limit=Math.max(1,Math.min(8,Number(attempts)||4));
  let last;
  for(let attempt=1;attempt<=limit;attempt++){
    try{return await operation(attempt)}catch(e){last=e;if(attempt>=limit||!shouldRetry(e))throw e;await sleep(retryDelay(attempt));}
  }
  throw last;
}

export function publicFailure(error){
  if(!error)return null;
  return {
    error:error.code||'runtime_install_failed',
    stage:ARTIFACT_STAGES.includes(error.stage)?error.stage:null,
    artifactId:error.artifactId||null,
    provider:error.provider||null,
    httpStatus:finiteStatus(error.httpStatus),
    retryable:error.retryable===true
  };
}

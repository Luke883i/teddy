import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');
const mutants=[
  {id:'trust-legacy-url-bypass',file:'server/lib/runtime-trust.mjs',from:"&&asset?.browser_download_url===releaseDownloadUrl(repo,tag,asset.name)",to:'&&true',critical:true},
  {id:'trust-artifact-profile-bypass',file:'server/lib/runtime-trust.mjs',from:'const profile=LEGACY_RELEASE_TRUST[artifactId];',to:"const profile=LEGACY_RELEASE_TRUST['asr-whisper-tiny'];",critical:true},
  {id:'trust-qwen-mutable-main',file:'server/lib/runtime-trust.mjs',from:'/resolve/${QWEN_PIN.revision}/',to:'/resolve/main/',critical:true},
  {id:'trust-qwen-sha-altered',file:'server/lib/runtime-trust.mjs',from:"sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031'",to:"sha256:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'",critical:true},
  {id:'trust-legacy-zero-size',file:'server/lib/runtime-trust.mjs',from:'&&Number(asset?.size)>0',to:'&&Number(asset?.size)>=0',critical:true},
  {id:'state-selftest-bypass',file:'server/lib/runtime-state.mjs',from:"return currentGeneration?.id==='external'||selfTest?.ok===true",to:'return Boolean(currentGeneration)',critical:true},
  {id:'state-digest-mismatch-bypass',file:'server/lib/runtime-state.mjs',from:"if(a.verified&&a.trust==='sha256'&&a.sha256.toLowerCase()!==observed.toLowerCase())",to:'if(false)',critical:true},
  {id:'state-provenance-bypass',file:'server/lib/runtime-state.mjs',from:"if(a.verified&&(!a.publisher||!a.version||!a.name||!/^https:\\/\\//.test(a.source||'')))",to:'if(false)',critical:true},
  {id:'lock-live-owner-stolen-by-age',file:'server/lib/runtime-installation.mjs',from:'const dead=Boolean(owner)&&!isProcessAlive(ownerPid);',to:'const dead=Boolean(owner)&&(!isProcessAlive(ownerPid)||age>staleMs);',critical:true},
  {id:'lock-initialization-gap-stolen',file:'server/lib/runtime-installation.mjs',from:'const staleMalformed=!owner&&age>staleMs;',to:'const staleMalformed=!owner;',critical:true},
  {id:'lock-release-token-bypass',file:'server/lib/runtime-installation.mjs',from:"async release(){if(released)return;released=true;const current=await safeRead(ownerFile);if(current?.token===token)await fs.promises.rm(lockDir,{recursive:true,force:true});}",to:"async release(){if(released)return;released=true;const current=await safeRead(ownerFile);if(current)await fs.promises.rm(lockDir,{recursive:true,force:true});}",critical:true},
  {id:'timeout-signal-disabled',file:'server/lib/runtime-installation.mjs',from:"const timer=setTimeout(()=>{if(!controller.signal.aborted){timedOut=true;controller.abort(Object.assign(new Error(code),{code}))}},Math.max(1,timeoutMs));",to:"const timer=setTimeout(()=>{},Math.max(1,timeoutMs));",critical:true,timeoutMs:1500},
  {id:'command-timeout-disabled',file:'server/lib/local-engines.mjs',from:"const timer=setTimeout(()=>{timedOut=true;try{child.kill('SIGKILL')}catch{}finish(reject,timeoutError())},Math.max(1,timeoutMs));timer.unref?.();",to:"const timer=setTimeout(()=>{timedOut=true},Math.max(1,timeoutMs));timer.unref?.();",critical:true,timeoutMs:1500},
  {id:'asr-timeout-hardcoded',file:'server/lib/local-engines.mjs',from:'timeoutMs:asrTimeoutMs',to:'timeoutMs:45_000',critical:true},
  {id:'tts-timeout-hardcoded',file:'server/lib/local-engines.mjs',from:'timeoutMs:ttsTimeoutMs',to:'timeoutMs:45_000',critical:true},
  {id:'llm-timeout-hardcoded',file:'server/lib/local-engines.mjs',from:"timeoutMs:llmTimeoutMs,code:'local_llm_timeout'",to:"timeoutMs:45_000,code:'local_llm_timeout'",all:true,critical:true,timeoutMs:1500},
  {id:'tts-invalid-wav-accepted',file:'server/lib/local-engines.mjs',from:"if(b.length<44||b.subarray(0,4).toString()!=='RIFF')",to:'if(false)',critical:true},
  {id:'retry-permanent-errors',file:'server/lib/runtime-resilience.mjs',from:"shouldRetry=e=>e?.retryable===true",to:'shouldRetry=()=>true',critical:true},
  {id:'retry-jitter-disabled',file:'server/lib/runtime-resilience.mjs',from:"const spread=Math.max(0,Math.min(1,Number(jitter)||0));",to:'const spread=0;',critical:false},
  {id:'catalog-host-validation-bypass',file:'server/lib/runtime-catalog.mjs',from:"return u.protocol==='https:'&&spec.hosts.includes(u.hostname)",to:"return u.protocol==='https:'",critical:true},
  {id:'platform-windows-removed',file:'server/lib/runtime-platform.mjs',from:"win32:Object.freeze(['x64'])",to:'win32:Object.freeze([])',critical:true},
  {id:'platform-windows-cuda-selected',file:'server/lib/runtime-platform.mjs',from:"llamaNeedle:'bin-win-cpu-x64'",to:"llamaNeedle:'bin-win-cuda-13.3-x64'",critical:true},
  {id:'platform-windows-exe-suffix-removed',file:'server/lib/runtime-platform.mjs',from:"executableSuffix:'.exe'",to:"executableSuffix:''",critical:true},
  {id:'manager-install-lock-bypass',file:'server/lib/runtime-manager.mjs',from:"async function provision(){return withInstallLock(installLock,()=>provisionUnlocked(),{timeoutMs:lockTimeoutMs,staleMs:lockStaleMs});}",to:"async function provision(){return provisionUnlocked();}",critical:true},
  {id:'manager-canary-after-pointer',file:'server/lib/runtime-manager.mjs',from:"await activate(candidate);await atomicJson(pointer,{id,createdAt:candidate.createdAt});",to:"await atomicJson(pointer,{id,createdAt:candidate.createdAt});await activate(candidate);",critical:true},
  {id:'manager-finalize-before-hash',file:'server/lib/runtime-manager.mjs',from:"a.phase='verifying';await publish();const got=await sha256(part);a.observedSha256=got;",to:"await fs.promises.rename(part,dest);a.phase='verifying';await publish();const got=await sha256(dest);a.observedSha256=got;",critical:true},
  {id:'manager-digest-check-bypass',file:'server/lib/runtime-manager.mjs',from:"if(a.trust==='sha256'&&got.toLowerCase()!==String(a.sha256||'').toLowerCase())",to:'if(false)',critical:true}
];

function mutate(source,m){
  if(!source.includes(m.from))throw new Error(`mutation target missing: ${m.id}`);
  return m.all?source.split(m.from).join(m.to):source.replace(m.from,m.to);
}
function runNode(args,cwd,timeout=5000){return spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout,env:{...process.env,TEDDY_RUNTIME_INITIAL_RETRY_CYCLES:'0'}})}
const baseline=runNode(['--test','tests/oral-pipe-runtime-v11.test.mjs','tests/oral-pipe-runtime-v12.test.mjs'],root,10_000);
if(baseline.status!==0)throw new Error(`baseline failed\n${baseline.stdout}\n${baseline.stderr}`);
const results=[];
for(const m of mutants){
  const tmp=await fs.promises.mkdtemp(path.join(os.tmpdir(),`teddy-mut-${m.id}-`));
  try{
    await fs.promises.mkdir(path.join(tmp,'server'),{recursive:true});await fs.promises.cp(path.join(root,'server','lib'),path.join(tmp,'server','lib'),{recursive:true});
    await fs.promises.mkdir(path.join(tmp,'tests'),{recursive:true});for(const f of ['oral-pipe-runtime-v11.test.mjs','oral-pipe-runtime-v12.test.mjs'])await fs.promises.copyFile(path.join(root,'tests',f),path.join(tmp,'tests',f));
    const target=path.join(tmp,m.file),source=await fs.promises.readFile(target,'utf8');await fs.promises.writeFile(target,mutate(source,m));
    const check=runNode(['--check',m.file],tmp,2000);if(check.status!==0){results.push({id:m.id,critical:m.critical,valid:false,killed:false,reason:'invalid_mutant'});continue}
    const test=runNode(['--test','tests/oral-pipe-runtime-v11.test.mjs','tests/oral-pipe-runtime-v12.test.mjs'],tmp,m.timeoutMs||6000);
    const killed=test.status!==0||test.signal==='SIGTERM'||test.error?.code==='ETIMEDOUT';
    results.push({id:m.id,critical:m.critical,valid:true,killed,reason:killed?(test.error?.code==='ETIMEDOUT'?'timeout':'test_failure'):'survived'});
  }finally{await fs.promises.rm(tmp,{recursive:true,force:true})}
}
const valid=results.filter(r=>r.valid),killed=valid.filter(r=>r.killed),survivors=valid.filter(r=>!r.killed),criticalSurvivors=survivors.filter(r=>r.critical),killRate=valid.length?killed.length/valid.length:0;
const report={schema:1,campaign:'oral-pipe-mutation-v12',mutants:mutants.length,validMutants:valid.length,killed:killed.length,survived:survivors.length,killRate:Number(killRate.toFixed(4)),criticalSurvivors:criticalSurvivors.map(r=>r.id),survivors:survivors.map(r=>r.id),results};
console.log(JSON.stringify(report,null,2));
if(criticalSurvivors.length||killRate<0.95)process.exitCode=1;

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function localOnlyUrl(value){
  const u=new URL(value);
  if(u.protocol!=='http:') throw Object.assign(new Error('local_endpoint_protocol'),{code:'local_endpoint_protocol'});
  if(!['127.0.0.1','localhost','[::1]','::1'].includes(u.hostname)) throw Object.assign(new Error('local_endpoint_not_loopback'),{code:'local_endpoint_not_loopback'});
  if(u.username||u.password) throw Object.assign(new Error('local_endpoint_credentials'),{code:'local_endpoint_credentials'});
  return u;
}
export function artifactSpec(spec={}){
  const out={id:String(spec.id||''),url:String(spec.url||''),sha256:String(spec.sha256||'').toLowerCase(),size:Number(spec.size||0),license:String(spec.license||'')};
  if(!/^[a-z0-9][a-z0-9._-]{2,80}$/.test(out.id)) throw new Error('artifact_id_invalid');
  const u=new URL(out.url);if(u.protocol!=='https:')throw new Error('artifact_url_not_https');
  if(!/^[0-9a-f]{64}$/.test(out.sha256))throw new Error('artifact_digest_invalid');
  if(!Number.isSafeInteger(out.size)||out.size<=0||out.size>5_000_000_000)throw new Error('artifact_size_invalid');
  if(!out.license||out.license.length>80)throw new Error('artifact_license_invalid');
  return out;
}
export async function sha256File(file){
  const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');
}
export async function verifyArtifact(file,spec){
  const s=artifactSpec(spec),st=await fs.promises.stat(file);if(st.size!==s.size)throw Object.assign(new Error('artifact_size_mismatch'),{code:'artifact_size_mismatch'});
  const digest=await sha256File(file);if(digest!==s.sha256)throw Object.assign(new Error('artifact_digest_mismatch'),{code:'artifact_digest_mismatch'});return true;
}
export async function installArtifact({spec,destination,fetchImpl=fetch,offline=false}){
  const s=artifactSpec(spec);destination=path.resolve(destination);await fs.promises.mkdir(path.dirname(destination),{recursive:true,mode:0o700});
  try{await verifyArtifact(destination,s);return {status:'ready',downloaded:false,path:destination};}catch{}
  if(offline)throw Object.assign(new Error('artifact_missing_offline'),{code:'artifact_missing_offline'});
  const partial=`${destination}.${process.pid}.partial`;await fs.promises.rm(partial,{force:true});
  const response=await fetchImpl(s.url,{redirect:'error',signal:AbortSignal.timeout(60_000)});if(!response.ok||!response.body)throw Object.assign(new Error('artifact_download_failed'),{code:'artifact_download_failed'});
  const handle=await fs.promises.open(partial,'wx',0o600);let written=0;const hash=crypto.createHash('sha256');
  try{for await(const chunk of response.body){written+=chunk.length;if(written>s.size)throw Object.assign(new Error('artifact_size_mismatch'),{code:'artifact_size_mismatch'});hash.update(chunk);await handle.write(chunk);}await handle.sync();}finally{await handle.close();}
  if(written!==s.size||hash.digest('hex')!==s.sha256){await fs.promises.rm(partial,{force:true});throw Object.assign(new Error('artifact_integrity_failed'),{code:'artifact_integrity_failed'});}
  await fs.promises.rename(partial,destination);return {status:'ready',downloaded:true,path:destination};
}

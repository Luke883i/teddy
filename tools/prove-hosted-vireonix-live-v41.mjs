// ONE non-mocked production-route dialogue against live Vireonix from CI.
// Network/latency is external and is recorded as evidence, not a CI pass surrogate.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v41-live-'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;await new Promise(r=>server.close(r));
const password='independent-live-bridge-password';
const auth='Basic '+Buffer.from('teddy:'+password).toString('base64');
const host='teddy-bear.onrender.com',origin='https://preview.example.test';
const report={schema:'teddy.language.v41.live',live:true,simulated:false,model:'auto',
  upstream:'Vireonix',realTeddyHTTP:true,realSQLite:true,externalLatencyMeasured:false,
  hostOriginProxyMismatch:true,requestCount:0,pass:false};
let processServer=null,stderr='',started=performance.now();
async function call(route,method='GET',body,token=''){
 const headers={host,origin,authorization:auth,'sec-fetch-site':'same-origin','sec-fetch-mode':'cors',
  'sec-fetch-dest':'empty',...(token?{'x-teddy-csrf':token}:{}),...(body?{'content-type':'application/json'}:{})};
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers},res=>{
   let content='';res.setEncoding('utf8');res.on('data',part=>content+=part);
   res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(content)})}catch(error){reject(error)}});
  });
  req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
}
try{
 processServer=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,
  env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'0.0.0.0',TEDDY_PORT:String(port),
   TEDDY_PUBLIC_ORIGIN:'https://'+host,TEDDY_AUTH_PASSWORD:password,
   TEDDY_SECRET_MASTER_KEY:'a'.repeat(64),TEDDY_PROVIDER:'vireonix',
   TEDDY_LOCAL_ENGINE_MOCK:'0',TEDDY_RUNTIME_AUTOINSTALL:'0',
   TEDDY_TEXT_ONLY:'1',TEDDY_ENABLE_VOICE_ENDPOINTS:'0'},
  stdio:['ignore','ignore','pipe']
 });
 processServer.stderr.on('data',x=>{stderr=(stderr+String(x)).slice(-1000)});
 let boot;
 for(let i=0;i<140;i++){
  if(processServer.exitCode!==null)throw Error('server_terminated');
  try{const r=await call('/api/bootstrap');if(r.status===200){boot=r.body;break}}catch{}
  await wait(40);
 }
 if(!boot?.security?.csrfToken)throw Error('bootstrap_csrf_missing');
 const token=boot.security.csrfToken;
 if(boot.ai.provider!=='vireonix')throw Error('wrong_initial_provider');
 const intro=await call('/api/text/turn','POST',{text:'ciao',requestId:crypto.randomUUID()},token);
 if(intro.status!==200||intro.body.semantic?.path!=='deterministic')throw Error('deterministic_turn_failed:'+intro.status+':'+intro.body.error);
 report.introPass=true;
 const before=performance.now();
 const reply=await call('/api/text/turn','POST',{
  text:'Spiega perché il cielo è blu in una frase comprensibile.',
  conversationId:intro.body.conversationId,requestId:crypto.randomUUID()
 },token);
 report.requestCount=1;report.remoteTurnStatus=reply.status;report.remoteTurnError=reply.body?.error||null;report.remoteUpstreamStatus=reply.body?.upstreamStatus||null;
 report.externalTurnLatencyMs=Math.round(performance.now()-before);
 report.externalLatencyMeasured=true;
 if(reply.status!==200)throw Error('remote_text_turn_'+reply.status+'_'+(reply.body?.error||'unknown'));
 if(reply.body.provider!=='vireonix'||reply.body.semantic?.path!=='model'||!reply.body.reply?.trim())throw Error('remote_semantic_receipt_invalid');
 report.responseLength=reply.body.reply.length;
 report.responseSha256=crypto.createHash('sha256').update(reply.body.reply).digest('hex');
 report.example=reply.body.reply.slice(0,240); // Synthetic prompt; no personal user data.
 const history=await call('/api/history?limit=20');
 if(history.status!==200||history.body.turns.length!==4)throw Error('persistent_history_invalid');
 report.persistentTurns=history.body.turns.length;
 report.pass=true;
}catch(error){report.failure=String(error?.message||error).slice(0,180);report.serverError=stderr.slice(-320)}
finally{
 report.totalMs=Math.round(performance.now()-started);
 const target=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'teddy-v41-hosted-live.json');
 fs.writeFileSync(target,JSON.stringify(report,null,2));
 console.log('TEDDY_V41_HOSTED_LIVE',JSON.stringify(report));
 processServer?.kill('SIGTERM');
 if(processServer?.exitCode===null)await Promise.race([new Promise(r=>processServer.once('exit',r)),wait(1000)]);
 if(processServer?.exitCode===null)processServer.kill('SIGKILL');
 fs.rmSync(home,{recursive:true,force:true});
 if(!report.pass)process.exitCode=1;
}

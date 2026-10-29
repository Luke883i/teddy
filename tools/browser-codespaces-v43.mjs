// v43 browser E2E: genuine Chromium/Teddy/SQLite. A local proxy rewrites
// HTTP request metadata to simulate Codespaces; only the language engines are mocks.
// This is not a genuine public app.github.dev HTTPS session.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
const port=await freePort();let proxyPort=await freePort();while(proxyPort===port)proxyPort=await freePort();
const codespace='fearful-poltergeist-7gxv5959w9g2rx64',origin='https://'+codespace+'-'+port+'.app.github.dev';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v43-browser-'));
const chrome=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
if(!chrome)throw Error('Chromium is required; do not replace it with a DOM mock');
let server=null,proxy=null,browser=null,websocket=null,log='';
const writes=[];
async function connectCDP(url){
 const ws=new WebSocket(url);websocket=ws;let id=0;const waiting=new Map();
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 ws.addEventListener('message',e=>{const v=JSON.parse(e.data);const pending=waiting.get(v.id);if(!pending)return;waiting.delete(v.id);v.error?pending.reject(Error(v.error.message)):pending.resolve(v.result)});
 return(method,params={})=>new Promise((resolve,reject)=>{const next=++id;waiting.set(next,{resolve,reject});ws.send(JSON.stringify({id:next,method,params}))});
}
try{
 server=spawn(process.execPath,['--import',path.join(root,'tests/fixtures/vireonix-fetch-mock.mjs'),path.join(root,'server/main.mjs')],{
  cwd:root,stdio:['ignore','ignore','pipe'],env:{...process.env,TEDDY_HOME:path.join(temp,'home'),TEDDY_HOST:'127.0.0.1',TEDDY_PORT:String(port),CODESPACE_NAME:codespace,TEDDY_PROVIDER:'local',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0',TEDDY_TEXT_ONLY:'1',TEDDY_PUBLIC_ORIGIN:'',TEDDY_AUTH_PASSWORD:''}
 });
 server.stderr.on('data',buf=>{log=(log+buf.toString()).slice(-1400)});
 let ready=false;
 for(let i=0;i<150;i++){if(server.exitCode!==null)throw Error('Teddy terminated: '+log);try{const r=await fetch('http://127.0.0.1:'+port+'/api/health');if(r.ok){ready=true;break}}catch{}await wait(40)}
 if(!ready)throw Error('Teddy HTTP did not start: '+log);
 // Simulate Codespaces TLS termination metadata, preserving genuine browser fetch.
 proxy=http.createServer((req,res)=>{
  const headers={...req.headers,host:'127.0.0.1:'+port};
  const mutation=['POST','PUT','PATCH','DELETE'].includes(req.method);
  const trace=mutation?{method:req.method,path:req.url}:null;
  if(mutation){headers.origin=origin;Object.assign(trace,{origin:headers.origin,site:headers['sec-fetch-site'],mode:headers['sec-fetch-mode'],dest:headers['sec-fetch-dest']});writes.push(trace)}
  const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},response=>{
   if(trace)trace.status=response.statusCode;res.writeHead(response.statusCode,response.headers);response.pipe(res);
  });
  upstream.on('error',e=>{if(!res.headersSent)res.writeHead(502);res.end('proxy_error_'+e.code)});
  req.pipe(upstream);
 });
 await new Promise(resolve=>proxy.listen(proxyPort,'127.0.0.1',resolve));
 let cdpPort=null,chromeError='';
 for(let attempt=0;attempt<3;attempt++){
  const profile=path.join(temp,'chrome-'+attempt);
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',b=>{chromeError=(chromeError+b.toString()).slice(-850)});
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<155&&!fs.existsSync(portFile)&&browser.exitCode===null;i++)await wait(85);
  if(fs.existsSync(portFile)){cdpPort=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);break}
  browser.kill('SIGKILL');await wait(200);
 }
 if(!cdpPort)throw Error('Chromium CDP unavailable: '+chromeError);
 const pages=await(await fetch('http://127.0.0.1:'+cdpPort+'/json/list')).json();
 const page=pages.find(p=>p.type==='page');if(!page)throw Error('Chrome page absent');
 const send=await connectCDP(page.webSocketDebuggerUrl);
 await send('Page.enable');await send('Runtime.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:original.call(this,kind,...args)}"});
 await send('Page.navigate',{url:'http://127.0.0.1:'+proxyPort+'/'});
 const expression=String.raw\`(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<230&&document.querySelector('#chatForm')?.dataset.wired!=='true';i++)await wait(80);
  const form=document.querySelector('#chatForm'),input=document.querySelector('#chatInput'),bubble=document.querySelector('#teddyBubble'),text=document.querySelector('#teddyBubbleText'),feedback=document.querySelector('#chatFeedback'),selector=document.querySelector('#textProviderSelect');
  if(!form||!input||!bubble||!text||!feedback||!selector)throw Error('real UI elements missing');
  if(selector.value!=='local')throw Error('initial provider is not local');
  const turns=[];
  const speak=async(prompt,expected)=>{
   const before=document.querySelectorAll('.chat-message.assistant').length;
   input.value=prompt;form.requestSubmit();
   for(let i=0;i<250;i++){
    if(document.querySelectorAll('.chat-message.assistant').length>before&&!bubble.classList.contains('hidden')&&!bubble.classList.contains('is-thinking'))break;
    await wait(80);
   }
   const answer=text.textContent.trim();
   if(!feedback.classList.contains('hidden')&&feedback.textContent.trim())throw Error('visible failure: '+feedback.textContent);
   if(!answer||bubble.classList.contains('hidden')||bubble.classList.contains('is-thinking'))throw Error('Teddy balloon did not settle');
   if(expected&&!answer.includes(expected))throw Error('unexpected provider language output: '+answer);
   turns.push({provider:selector.value,characters:answer.length});
  };
  const choose=async provider=>{
   selector.value=provider;selector.dispatchEvent(new Event('change',{bubbles:true}));
   for(let i=0;i<200;i++){
    const data=await(await fetch('/api/bootstrap',{cache:'no-store'})).json();
    if(data.ai?.provider===provider&&!selector.disabled)break;
    await wait(60);
   }
   const actual=await(await fetch('/api/bootstrap',{cache:'no-store'})).json();
   if(actual.ai?.provider!==provider||selector.value!==provider)throw Error('provider switch mismatch: '+JSON.stringify({expected:provider,backend:actual.ai?.provider,frontend:selector.value,error:feedback.textContent}));
   if(!feedback.classList.contains('hidden'))throw Error('unexpected selector failure');
  };
  await speak('ciao',null);
  await speak('spiega perché il cielo è blu','Ho sentito');
  await choose('vireonix');
  await speak('spiega perché il cielo è blu','atmosfera');
  await choose('local');
  return {pass:true,turns,selected:selector.value,feedbackHidden:feedback.classList.contains('hidden')};
 })()\`;
 const output=await Promise.race([send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),wait(90000).then(()=>{throw Error('real Chromium timed out')})]);
 if(output.exceptionDetails)throw Error('Chromium UI error: '+(output.exceptionDetails.exception?.description||output.exceptionDetails.text));
 const proof=output.result?.value;
 if(!proof?.pass||proof.turns?.length!==3)throw Error('browser evidence not complete: '+JSON.stringify(proof));
 const history=await(await fetch('http://127.0.0.1:'+port+'/api/history?limit=20')).json();
 if(history.turns?.length!==6)throw Error('SQLite turn count does not match: '+history.turns?.length);
 if(writes.length!==5||writes.some(x=>x.status!==200||x.origin!==origin||x.site!=='same-origin'||x.mode!=='cors'||x.dest!=='empty'))throw Error('proxy security mismatch: '+JSON.stringify(writes));
 console.log('TEDDY_CODESPACES_BROWSER_V43_PASS',JSON.stringify({schema:'teddy.codespaces.browser.v43',chromium:true,teddyHttp:true,sqliteTurns:6,proxyHeadersSimulated:true,modelUpstreams:'MOCK_ONLY',balloons:3,switches:2,receivedStatuses:writes.map(x=>x.status),...proof}));
}finally{
 websocket?.close();browser?.kill('SIGKILL');server?.kill('SIGTERM');
 if(proxy)await new Promise(resolve=>proxy.close(resolve));
 await wait(100);fs.rmSync(temp,{recursive:true,force:true});
}

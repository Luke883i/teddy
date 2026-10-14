// Real Chromium/CDP + real Node HTTP + SQLite with ONLY LLM mocked.
// No DOM scaffold, intercepted chat endpoint or inert UI control is accepted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
const work=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-text-v17-')),home=path.join(work,'home'),chromeHome=path.join(work,'chrome');
const chrome=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>fs.existsSync(x));
if(!chrome)throw Error('Real browser required');
let api=null,proc=null,ws=null,log='';
const sendHttp=(endpoint,options)=>fetch(`http://127.0.0.1:${port}${endpoint}`,options);
async function connectCDP(url){
  ws=new WebSocket(url);const pending=new Map();let seq=0;
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  ws.addEventListener('message',event=>{const v=JSON.parse(event.data);if(!v.id)return;const p=pending.get(v.id);if(!p)return;pending.delete(v.id);if(v.error)p.reject(Error(v.error.message));else p.resolve(v.result)});
  return(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
}
try{
  api=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env:{...process.env,TEDDY_HOME:home,TEDDY_PORT:String(port),TEDDY_PROVIDER:'local',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0'},stdio:['ignore','pipe','pipe']});
  api.stderr.on('data',chunk=>log+=String(chunk).slice(-1000));
  let ready=false;for(let i=0;i<100;i++){try{const r=await sendHttp('/api/health');if(r.ok){ready=true;break}}catch{}await sleep(90)}
  if(!ready)throw Error('real Node control plane did not boot: '+log);
  proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${chromeHome}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  const portFile=path.join(chromeHome,'DevToolsActivePort');
  for(let i=0;i<150&&!fs.existsSync(portFile);i++)await sleep(85);
  if(!fs.existsSync(portFile))throw Error('Chrome CDP not ready');
  const cdpPort=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const pages=await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
  const target=pages.find(x=>x.type==='page');if(!target)throw Error('No browser page');
  const command=await connectCDP(target.webSocketDebuggerUrl);
  await command('Page.enable');await command('Runtime.enable');
  await command('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  const expression=`(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<150&&!document.querySelector('#chatForm')?.onsubmit&&!document.querySelector('#chatInput')?.disabled;i++)await sleep(75);
    const input=document.querySelector('#chatInput'),form=document.querySelector('#chatForm');
    if(!input||!form)throw Error('text composer absent');
    for(let i=0;i<70&&input.disabled;i++)await sleep(70);
    if(input.disabled)throw Error('text input not ready in real mock provider');
    input.value='Come stai Teddy?';form.requestSubmit();
    for(let i=0;i<160&&document.querySelectorAll('.chat-message').length<2;i++)await sleep(80);
    const turns=[...document.querySelectorAll('.chat-message')].map(x=>x.textContent);
    if(turns.length!==2||!turns[0].includes('Come stai Teddy?')||!turns[1].includes('Ho sentito'))throw Error('chat was not actually rendered: '+JSON.stringify(turns));
    const menu=document.querySelector('#settingsBtn'),nav=document.querySelector('#secondaryNav');
    if(!nav.classList.contains('hidden'))throw Error('secondary navigation leaked into primary conversation');
    menu.click();if(nav.classList.contains('hidden'))throw Error('menu cannot open');
    document.querySelector('[data-view="studio"]').click();
    if(document.querySelector('#drawer').classList.contains('hidden'))throw Error('studio missing');
    if(document.querySelector('#replaceKey'))throw Error('fake OpenAI key action leaked into local provider');
    const close=document.querySelector('#closeDrawer');if(!close)throw Error('drawer cannot close');
    close.click();if(!document.querySelector('#drawer').classList.contains('hidden'))throw Error('drawer failed to close');
    menu.click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));if(!nav.classList.contains('hidden'))throw Error('Escape did not close menu');
    return {success:true,turns,menuClosed:true,localCloudFake:false,chatInputVisible:input.getBoundingClientRect().width>120};
  })()`;
  const result=await Promise.race([command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),sleep(25000).then(()=>{throw Error('text browser smoke timeout')})]);
  if(result.exceptionDetails)throw Error('Real browser failure: '+(result.exceptionDetails.exception?.description||result.exceptionDetails.text));
  const data=result.result?.value;
  if(!data?.success||!data?.chatInputVisible)throw Error('Unexpected UI evidence: '+JSON.stringify(data));
  const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const png=Buffer.from(screenshot.data,'base64');
  if(png.subarray(1,4).toString()!=='PNG')throw Error('browser screenshot missing');
  const history=await (await sendHttp('/api/history?limit=10')).json();
  if(!history.turns?.some(t=>t.role==='user'&&t.text==='Come stai Teddy?')||!history.turns?.some(t=>t.role==='assistant'&&t.text.includes('Ho sentito')))throw Error('SQLite did not persist both actual HTTP turns');
  console.log('TEDDY_TEXT_BROWSER_PASS',JSON.stringify({turns:history.turns.length,screenshotSha256:crypto.createHash('sha256').update(png).digest('hex'),imageWidth:png.readUInt32BE(16),imageHeight:png.readUInt32BE(20),...data}));
}finally{
  ws?.close();proc?.kill('SIGKILL');api?.kill('SIGTERM');
  await sleep(150);fs.rmSync(work,{recursive:true,force:true});
}

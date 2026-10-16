// End-to-end browser proof through Chrome DevTools Protocol (no NPM browser dependencies).
// Deliberately uses production CSP and the production external module bootstrap.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {serveStatic} from '../server/lib/http.mjs';
import {SECURITY_HEADERS} from '../server/lib/security.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WEB=path.join(ROOT,'web');
const config=JSON.parse(fs.readFileSync(path.join(ROOT,'config/default.json'),'utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{
  if(req.url==='/api/bootstrap'){
    const body=JSON.stringify({config,ai:{provider:'openai'},secret:{configured:true},
      availability:{ready:true},persistence:{engine:'mock'},realtime:{transport:'webrtc'}});
    res.writeHead(200,{...SECURITY_HEADERS,'content-type':'application/json','content-length':Buffer.byteLength(body)});
    res.end(body);return;
  }
  if(!serveStatic(WEB,req,res)){res.writeHead(404);res.end('not found')}
});
function getJson(port,pathName){
  return new Promise((resolve,reject)=>{
    http.get({hostname:'127.0.0.1',port,path:pathName},res=>{
      let text='';res.on('data',x=>text+=x);
      res.on('end',()=>{try{resolve(JSON.parse(text))}catch(e){reject(e)}});
    }).on('error',reject);
  });
}
async function connectCDP(wsUrl){
  const ws=new WebSocket(wsUrl),pending=new Map();let next=0;
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    if(!msg.id)return;
    const waiter=pending.get(msg.id);if(!waiter)return;
    pending.delete(msg.id);
    if(msg.error)waiter.reject(Error(msg.error.message));else waiter.resolve(msg.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  });
  return {ws,send};
}
const chrome=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>fs.existsSync(x));
if(!chrome)throw Error('No Chromium/Chrome browser found; pixel-level acceptance requires a real browser');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-cdp-'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const sitePort=server.address().port;
let proc=null,cdp=null,log='';
try{
  proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
    `--user-data-dir=${dir}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  proc.stderr.on('data',b=>{log+=String(b).slice(-1500);if(log.length>3500)log=log.slice(-3500)});
  const portFile=path.join(dir,'DevToolsActivePort');
  for(let i=0;i<400&&!fs.existsSync(portFile);i++){
    if(proc.exitCode!==null)throw Error('Chrome exited before CDP: '+proc.exitCode+' '+log);
    await sleep(80);
  }
  if(!fs.existsSync(portFile))throw Error('Chrome CDP unavailable: '+log);
  const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const targets=await getJson(port,'/json/list');
  const tab=targets.find(t=>t.type==='page');if(!tab?.webSocketDebuggerUrl)throw Error('No Chrome page target');
  cdp=await connectCDP(tab.webSocketDebuggerUrl);
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');
  // Force a real Canvas2D fallback without injecting app logic or bypassing the page CSP.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const old=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type==='webgl2')return null;
      return old.call(this,type,...args);
    };
  `});
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__teddyBootErrors=[];
    window.addEventListener('error',event=>window.__teddyBootErrors.push(String(event.message||event.error||'script error')));
    window.addEventListener('unhandledrejection',event=>window.__teddyBootErrors.push(String(event.reason||'promise rejected')));
  `});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${sitePort}/`});
  const probeUI=process.argv.includes('--probe-ui');
  const probeGreet=process.argv.includes('--probe-greet');
  const expression=`(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<550;i++){
      if(document.querySelector('button[data-view="movimento"]')?.onclick)break;
      await sleep(70);
    }
    const nav=document.querySelector('button[data-view="movimento"]');
    if(!nav?.onclick)throw Error('app did not attach UI listener: '+JSON.stringify({ready:document.readyState,body:document.body?.getAttribute('data-motion-error')||'',text:document.querySelector('#stateText')?.textContent,buttons:document.querySelectorAll('nav button').length,errors:window.__teddyBootErrors||[],scripts:[...document.scripts].map(s=>s.src).slice(-4)}));
    if(${probeUI})return {success:true,nav:true,faceFrames:!!window.__faceFrames};
    nav.click();
    const button=document.querySelector('button[data-routine="greet"]');
    if(!button)throw Error('UI movement button missing');
    const canvas=document.querySelector('#scene');
    const before=canvas.toDataURL('image/png');
    const amounts=[],states=[];
    window.addEventListener('teddy:motion-frame',e=>{
      const a=e.detail?.action;if(a?.name==='waveRight'&&a.amount>.1)amounts.push(a.amount);
      states.push({routine:e.detail?.routine?.name||null,world:e.detail?.world,action:a?.name||null});
    });
    button.click();
    // Demand the same >3 real motion frames, but allow headless CI CPU jitter.
    const greetDeadline=Date.now()+6500;
    while(Date.now()<greetDeadline&&amounts.length<=3)await sleep(100);
    await sleep(150);
    const after=canvas.toDataURL('image/png');
    if(${probeGreet})return {success:before!==after&&amounts.length>3,pixelChanged:before!==after,frames:amounts.length};
    const complex=document.querySelector('.motion-tabs button:nth-child(2)');
    if(!complex)throw Error('Complex motion tab missing');
    complex.click();document.querySelector('button[data-routine="dance"]')?.click();
    await sleep(260);
    const hadDance=states.some(x=>x.routine==='dance');
    const reset=document.querySelector('.motion-reset');if(!reset)throw Error('Reset button missing');
    reset.click();await sleep(200);
    const last=states.at(-1);const resetWorld=last?.world||{};
    const resetOk=!last?.routine&&!last?.action&&Math.abs(resetWorld.x||0)<1e-6&&Math.abs(resetWorld.yaw||0)<1e-6&&Math.abs(resetWorld.z||0)<1e-6;
    return {pixelChanged:before!==after,frames:amounts.length,hadDance,resetOk,
      feedback:document.querySelector('#motionFeedback')?.textContent||'',
      panelOpen:!document.querySelector('#drawer')?.classList.contains('hidden'),
      success:before!==after&&amounts.length>3&&hadDance&&resetOk};
  })()`;
  const result=await Promise.race([
    cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),
    sleep(75000).then(()=>{throw Error('CDP app evaluation timed out after 75 seconds')})
  ]);
  if(result.exceptionDetails)throw Error('Browser JavaScript exception: '+result.exceptionDetails.text);
  const value=result.result?.value;
  if(!value?.success)throw Error('Teddy did not visibly move: '+JSON.stringify(value));
  console.log('TEDDY_BROWSER_MOTION_PASS',JSON.stringify(value));
}finally{
  cdp?.ws?.close();
  proc?.kill('SIGKILL');
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
}

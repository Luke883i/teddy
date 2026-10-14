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
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-face-v17-'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const sitePort=server.address().port;
let proc=null,cdp=null,log='';
try{
  proc=spawn(chrome,['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage',
    '--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
    `--user-data-dir=${dir}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  proc.stderr.on('data',b=>{log+=String(b).slice(-1500);if(log.length>3500)log=log.slice(-3500)});
  const portFile=path.join(dir,'DevToolsActivePort');
  for(let i=0;i<140&&!fs.existsSync(portFile);i++){
    if(proc.exitCode!==null)throw Error('Chrome exited before CDP: '+proc.exitCode+' '+log);
    await sleep(80);
  }
  if(!fs.existsSync(portFile))throw Error('Chrome CDP unavailable: '+log);
  const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const targets=await getJson(port,'/json/list');
  const tab=targets.find(t=>t.type==='page');if(!tab?.webSocketDebuggerUrl)throw Error('No Chrome page target');
  cdp=await connectCDP(tab.webSocketDebuggerUrl);
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__teddySkinV16=null;
    window.__faceFrames=[];
    window.addEventListener('teddy:face-frame',e=>{window.__faceFrames.push(e.detail);if(window.__faceFrames.length>160)window.__faceFrames.shift()});
    window.addEventListener('teddy:implicit-skin-ready',e=>{window.__teddySkinV16=e.detail});
    window.addEventListener('teddy:implicit-skin-error',e=>{window.__teddySkinV16={active:false,error:e.detail.message}});
  `});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${sitePort}/`});
  const expression=`(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<180&&!window.__teddySkinV16;i++)await sleep(70);
    const skin=window.__teddySkinV16;
    if(!skin?.active||!skin.closed||(skin.mode==='anatomical-islands'?(skin.components!==3||!skin.noCrossArmTriangles):(skin.components!==1)))throw Error('Fused WebGL body inactive '+JSON.stringify(skin));
    for(let i=0;i<100&&!window.__faceFrames?.length;i++)await sleep(70);
    const baseline=window.__faceFrames.at(-1);
    if(!baseline||!Number.isFinite(baseline.lipOpen))throw Error('No live facial animation telemetry');
    const r=document.querySelector('#scene').getBoundingClientRect();
    return {success:true,baseline,skin,clip:{x:Math.round(r.left+r.width*.26),
      y:Math.round(r.top+r.height*.10),width:Math.round(r.width*.48),
      height:Math.round(r.height*.54),scale:1}};
  })()`;
  const result=await Promise.race([
    cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),
    sleep(26000).then(()=>{throw Error('Facial Chrome init timeout')})
  ]);
  if(result.exceptionDetails)throw Error('Browser facial readiness exception: '+result.exceptionDetails.text);
  const baseline=result.result?.value;
  if(!baseline?.success)throw Error('Face not live: '+JSON.stringify(baseline));
  const before=await cdp.send('Page.captureScreenshot',{format:'png',clip:baseline.clip,captureBeyondViewport:false});
  const action=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
    const count=window.__faceFrames.length;
    window.dispatchEvent(new CustomEvent('teddy:voice',{detail:{
      level:1,raw:1,low:.3,mid:.7,high:.8,brightness:.8,
      attack:.9,plosive:.3,active:true,at:performance.now()/1000
    }}));
    await new Promise(r=>setTimeout(r,720));
    const newest=window.__faceFrames.at(-1);
    return {frames:window.__faceFrames.length-count,
      lipIncrease:newest?.lipOpen-window.__faceFrames[Math.max(0,count-1)]?.lipOpen,
      cheekIncrease:newest?.cheekL-window.__faceFrames[Math.max(0,count-1)]?.cheekL,
      activeMode:newest?.mode,blinkFinite:Number.isFinite(newest?.lidClose)};
  })()`,awaitPromise:true,returnByValue:true});
  if(action.exceptionDetails)throw Error('Voice→Face runtime exception: '+action.exceptionDetails.text);
  const after=await cdp.send('Page.captureScreenshot',{format:'png',clip:baseline.clip,captureBeyondViewport:false});
  const state=action.result?.value||{},pixelsChanged=before.data!==after.data;
  if(!pixelsChanged||state.frames<6||state.lipIncrease<.25||state.cheekIncrease<.025||!state.blinkFinite)
    throw Error('Facial E2E failure '+JSON.stringify({pixelsChanged,...state}));
  console.log('TEDDY_V17_REAL_BROWSER_FACE_PASS',JSON.stringify({
    backend:'webgl2',pixelsChanged,watertight:baseline.skin.closed,
    frames:state.frames,lipIncrease:state.lipIncrease,cheekIncrease:state.cheekIncrease
  }));

}finally{
  cdp?.ws?.close();
  proc?.kill('SIGKILL');
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
}

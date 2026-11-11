// V45: real browser screenshot/wiring evidence for all 32 intention-labeled gestures.
// Deliberately uses production CSP and the production external module bootstrap.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {MOTION_LABELS} from '../web/teddy/motion-panel-v12.js';
import {serveStatic} from '../server/lib/http.mjs';
import {SECURITY_HEADERS} from '../server/lib/security.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WEB=path.join(ROOT,'web');
const evidenceDir=path.join(ROOT,'artifacts','motion-intent-v45');
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
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-webgl-skin-'));
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
    window.__teddyVisualQuality=null;
    window.addEventListener('teddy:visual-quality',e=>{window.__teddyVisualQuality=e.detail||null});
    window.__teddySkinV16=null;
    window.addEventListener('teddy:implicit-skin-ready',e=>{window.__teddySkinV16=e.detail});
    window.addEventListener('teddy:implicit-skin-error',e=>{window.__teddySkinV16={active:false,error:e.detail.message}});
  `});
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${sitePort}/`});
  const ready=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
    for(let i=0;i<250;i++){
      if(window.__teddySkinV16?.active&&document.querySelector('button[data-view="movimento"]')?.onclick)
        return {ok:true,skin:window.__teddySkinV16,backend:document.querySelector('#visualBackend')?.textContent};
      await new Promise(r=>setTimeout(r,80));
    }
    return {ok:false,skin:window.__teddySkinV16,nav:!!document.querySelector('button[data-view="movimento"]')?.onclick};
  })()`,awaitPromise:true,returnByValue:true});
  const setup=ready.result?.value;
  if(!setup?.ok||setup.skin?.mode!=='anatomical-pelt-v21'||setup.skin?.components!==6||
    setup.skin?.zeroCrossRegionTriangles!==true)
    throw Error('V45 REAL_BROWSER_WEBGL2_SIX_PELT_NOT_READY: '+JSON.stringify(setup));
  fs.mkdirSync(evidenceDir,{recursive:true});
  const names=process.argv.includes('--greet-only')?['greet']:Object.keys(MOTION_LABELS);
  const rows=[];
  for(const name of names){
    const safe=JSON.stringify(name);
    const result=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
      const nav=document.querySelector('button[data-view="movimento"]');if(!nav)throw Error('no movement nav');nav.click();
      const complex=${JSON.stringify(['dance','lightningBolt'].includes(name))};
      document.querySelector(complex?'.motion-tabs button:nth-child(2)':'.motion-tabs button:nth-child(1)')?.click();
      const b=[...document.querySelectorAll('button[data-routine]')].find(el=>el.dataset.routine===${safe});
      if(!b)throw Error('missing labeled movement button: '+${safe});
      const seen=[],listener=e=>{if(e.detail?.routine?.name===${safe})seen.push(e.detail?.routine?.phase??0)};
      window.addEventListener('teddy:motion-frame',listener);
      b.click();
      await new Promise(r=>setTimeout(r,720));
      window.removeEventListener('teddy:motion-frame',listener);
      const q=window.__teddyVisualQuality;
      return {ok:seen.length>=4,name:${safe},frames:seen.length,firstPhase:seen[0]??null,lastPhase:seen.at(-1)??null,
        realWebGL2:!!document.createElement('canvas').getContext('webgl2'),
        visualQuality:q?{pass:q.pass,stretch:q.maxEdgeStretch,zeroCrossRegionTriangles:q.zeroCrossRegionTriangles}:null,
        feedback:document.querySelector('#motionFeedback')?.textContent||''};
    })()`,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error('V45 '+name+' JS: '+(result.exceptionDetails.exception?.description||result.exceptionDetails.text));
    const value=result.result?.value;
    if(!value?.ok||!value.realWebGL2||!value.feedback.includes(MOTION_LABELS[name]))
      throw Error('V45 actual button/gesture mismatch: '+JSON.stringify(value));
    const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const bytes=Buffer.from(screenshot.data,'base64');
    if(bytes.length<8000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('V45 real PNG missing '+name);
    fs.writeFileSync(path.join(evidenceDir,name+'.png'),bytes);
    rows.push({...value,label:MOTION_LABELS[name],screenshot:name+'.png',screenshotSha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
    console.log('TEDDY_V45_REAL_BROWSER_GESTURE',name,JSON.stringify({frames:value.frames,bytes:bytes.length}));
  }
  const manifest={schema:'teddy.motion-browser-v45/1',source:'CHROMIUM_PRODUCTION_CSP_REAL_WEBGL2',observed:names.length,
    required:names.length,skinMode:setup.skin.mode,verifiedPixelAesthetic:'NOT_HUMAN_REVIEWED',rows};
  fs.writeFileSync(path.join(evidenceDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('TEDDY_V45_REAL_BROWSER_CAPTURE_PASS',JSON.stringify({gestures:names.length,skinMode:setup.skin.mode}));
}finally{
  cdp?.ws?.close();
  if(proc){
    const exited=new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode!==null)resolve();else proc.once('exit',resolve)});
    proc.kill('SIGKILL');
    await Promise.race([exited,sleep(1800)]);
  }
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:120});
}

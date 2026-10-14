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
const evidenceDir=path.join(ROOT,'artifacts','visual-v18');
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
    window.__teddyVisualProof=true;
    window.__teddyPaintFrames=[];
    window.addEventListener('teddy:plush-frame',e=>{
      window.__teddyPaintFrames.push(e.detail);
      if(window.__teddyPaintFrames.length>600)window.__teddyPaintFrames.shift();
    });
    window.__teddySeamQuality=null;
    window.addEventListener('teddy:visual-quality',e=>{window.__teddySeamQuality=e.detail?.seam||null});
    window.__teddySkinV16=null;
    window.addEventListener('teddy:implicit-skin-ready',e=>{window.__teddySkinV16=e.detail});
    window.addEventListener('teddy:implicit-skin-error',e=>{window.__teddySkinV16={active:false,error:e.detail.message}});
  `});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${sitePort}/`});
  const until=(process.argv.find(x=>x.startsWith('--until='))||'--until=victory').split('=')[1];
  if(!['ready','greet','bolt','victory'].includes(until))throw Error('Invalid browser stage: '+until);
  const capabilityProbe=process.argv.includes('--probe-capability');
  const activationProbe=process.argv.includes('--probe-activation');
  const expression=capabilityProbe?`(async()=>{
    let context=null;
    for(let i=0;i<50&&!context;i++){
      context=document.createElement('canvas').getContext('webgl2');
      if(!context)await new Promise(r=>setTimeout(r,100));
    }
    return {success:!!context,backend:context?'webgl2':'unavailable',capabilityProbe:true};
  })()`:activationProbe?`(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<200&&!window.__teddySkinV16;i++)await sleep(70);
    const skin=window.__teddySkinV16;
    return {success:!!skin?.active&&skin?.openEdges===0&&(skin.mode==='anatomical-islands'?(skin.components===3&&skin.noCrossArmTriangles):skin.components===1),
      active:!!skin?.active,skin,hasNav:!!document.querySelector('button[data-view="movimento"]')?.onclick,
      webgl2:!!document.createElement('canvas').getContext('webgl2')};
  })()`:`(async()=>{
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    for(let i=0;i<220;i++){
      if(window.__teddySkinV16||document.querySelector('button[data-view="movimento"]')?.onclick)break;
      await sleep(80);
    }
    const nav=document.querySelector('button[data-view="movimento"]');
    if(!nav?.onclick)throw Error('Teddy app never mounted under CSP');
    for(let i=0;i<140&&!window.__teddySkinV16;i++)await sleep(70);
    const skin=window.__teddySkinV16;
    if(!skin?.active)throw Error('WebGL2 implicit skin did not activate: '+JSON.stringify(skin));
    if(skin.mode!=='anatomical-islands'&&(!skin.underarms?.pass||skin.underarms.cutters!==2||
      skin.underarms.samples.some(s=>s.gap<=.012||s.torso>=0||s.arm>=0)))
      throw Error('WebGL2 still has underarm skin webbing: '+JSON.stringify(skin.underarms));
    if(skin.mode!=='anatomical-islands'&&(!skin.seamEdges||skin.seamEdges<80||!skin.seamWeights||skin.seamWeights.affected<100))
      throw Error('No V20 connected collar bound in actual GPU path: '+JSON.stringify(skin));
    for(let i=0;i<50&&!window.__teddySeamQuality;i++)await sleep(80);
    const quality=window.__teddySeamQuality;
    if(skin.mode!=='anatomical-islands'&&(!quality?.finite||quality.after>quality.before))
      throw Error('Pose-space seam strain still unguarded in Chrome: '+JSON.stringify(quality));
    if((skin.mode==='anatomical-islands'?(skin.components!==3||!skin.noCrossArmTriangles||skin.globalWatertight!==false):skin.components!==1)||skin.openEdges!==0||skin.nonmanifoldEdges!==0||!skin.closed)
      throw Error('Non-watertight browser mesh: '+JSON.stringify(skin));
    const badge=document.querySelector('#visualBackend');
    const status=document.querySelector('#statusPanel').getBoundingClientRect();
    if(!badge?.textContent.includes(skin.mode==='anatomical-islands'?'pelliccia anatomica':'mesh fusa')||badge.dataset.degraded!=='false')
      throw Error('Fused rendering not represented in UI');
    if(status.left>innerWidth*.31)throw Error('Operational status overlaps portrait');
    nav.click();
    await sleep(180);
    const rect=document.querySelector('#scene').getBoundingClientRect();
    const clip={x:Math.round(rect.left+rect.width*.08),y:Math.round(rect.top+rect.height*.02),
      width:Math.round(rect.width*.84),height:Math.round(rect.height*.94),scale:1};
    return {success:true,backend:'webgl2',skin,clip,seamQuality:quality};
  })()`;
  const result=await Promise.race([
    cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),
    sleep(28000).then(()=>{throw Error('CDP WebGL skin evaluation timed out')})
  ]);
  if(result.exceptionDetails)throw Error('Browser JavaScript exception: '+result.exceptionDetails.text);
  const value=result.result?.value;
  if(!value?.success)throw Error('Teddy WebGL2 fused skin not ready: '+JSON.stringify(value));
  if(!capabilityProbe&&!activationProbe&&until!=='ready'){
    fs.mkdirSync(evidenceDir,{recursive:true});
    const before=await cdp.send('Page.captureScreenshot',{format:'png',clip:value.clip,captureBeyondViewport:false});
    fs.writeFileSync(path.join(evidenceDir,'neutral.png'),Buffer.from(before.data,'base64'));
    const action=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
      const samples=[];
      window.addEventListener('teddy:motion-frame',e=>{if(e.detail?.routine?.name==='greet')samples.push(e.detail.routine.phase)});
      const button=document.querySelector('button[data-routine="greet"]');
      if(!button)throw Error('missing real greet button');
      button.click();
      await new Promise(r=>setTimeout(r,980));
      return {frames:samples.length,feedback:document.querySelector('#motionFeedback')?.textContent||''};
    })()`,awaitPromise:true,returnByValue:true});
    if(action.exceptionDetails)throw Error('Motion click failed: '+action.exceptionDetails.text);
    const after=await cdp.send('Page.captureScreenshot',{format:'png',clip:value.clip,captureBeyondViewport:false});
    fs.writeFileSync(path.join(evidenceDir,'greet.png'),Buffer.from(after.data,'base64'));
    const pixelsChanged=before.data!==after.data,frames=action.result?.value?.frames||0;
    if(!pixelsChanged||frames<5)throw Error('WebGL2 body motion invisible: '+JSON.stringify({pixelsChanged,frames,skin:value.skin}));
    value.pixelsChanged=pixelsChanged;value.motionFrames=frames;
    if(until!=='greet'){
    const bolt=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
      document.querySelector('.motion-tabs button:nth-child(2)')?.click();
      const key=document.querySelector('button[data-routine="lightningBolt"]');
      if(!key)throw Error('Lightning Bolt UI control absent');
      key.click();
      await new Promise(r=>setTimeout(r,780));
      return {active:true};
    })()`,awaitPromise:true,returnByValue:true});
    if(bolt.exceptionDetails)throw Error('Lightning Bolt click rejected: '+bolt.exceptionDetails.text);
    const third=await cdp.send('Page.captureScreenshot',{format:'png',clip:value.clip,captureBeyondViewport:false});
    fs.writeFileSync(path.join(evidenceDir,'lightningBolt.png'),Buffer.from(third.data,'base64'));
    if(after.data===third.data)throw Error('Lightning Bolt produced no new compositor image');
    value.thirdPoseChanged=true;
    if(until!=='bolt'){
    // V20 regression pose: both arms elevated, reproducing the user-reported
    // accordion geometry more directly than the asymmetrical Lightning Bolt.
    const raised=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
      const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      const before=window.__teddyPaintFrames.length;
      const motion=[];
      window.addEventListener('teddy:motion-frame',e=>{
        if(e.detail?.routine?.name==='victory')motion.push(e.detail.routine.phase);
      });
      const tab=document.querySelector('.motion-tabs button:nth-child(1)');
      if(!tab)throw Error('Base motion tab missing during Victory regression');
      tab.click();
      const key=document.querySelector('button[data-routine="victory"]');
      if(!key)throw Error('Victory raised-arms UI control missing after Base tab selection');
      key.click();
      const feedback=document.querySelector('#motionFeedback')?.textContent||'';
      if(!feedback.includes('Vittoria'))throw Error('Victory click was rejected by product UI: '+feedback);
      let painted=[];
      for(let i=0;i<115;i++){
        painted=window.__teddyPaintFrames.slice(before).filter(f=>
          f.draws===3&&f.routine?.name==='victory'&&
          f.routine.phase>.12&&f.routine.phase<.90&&
          Number.isFinite(f.drawMs)&&f.quality?.finite);
        if(painted.length>=5)break;
        await sleep(85);
      }
      const quality=window.__teddySeamQuality;
      return {clicked:true,frames:motion.length,paintedFrames:painted.length,
        paintedPhases:painted.slice(-8).map(f=>f.routine.phase),
        drawMs:painted.slice(-8).map(f=>f.drawMs),
        feedback,skinStatus:document.querySelector('#visualBackend')?.textContent||'',
        seam:quality};
    })()`,awaitPromise:true,returnByValue:true});
    if(raised.exceptionDetails)throw Error('Raised-arms browser exception: '+JSON.stringify(raised.exceptionDetails));
    const raisedState=raised.result?.value;
    if(!raisedState?.clicked||raisedState.frames<5||raisedState.paintedFrames<5||
      (skin.mode!=='anatomical-islands'&&(!raisedState.seam?.finite||raisedState.seam.after>raisedState.seam.before)))
      throw Error('Raised-arms GPU-composited movement not proven: '+JSON.stringify(raisedState));
    // Capture the *composited* frame after observing actual named Victory frames;
    // a fixed 790ms wall-clock delay can pass before SwiftShader draws the pose.
    let raisedFrame=await cdp.send('Page.captureScreenshot',{format:'png',clip:value.clip,captureBeyondViewport:false});
    for(let i=0;i<12&&raisedFrame.data===third.data;i++){
      await sleep(140);
      raisedFrame=await cdp.send('Page.captureScreenshot',{format:'png',clip:value.clip,captureBeyondViewport:false});
    }
    fs.writeFileSync(path.join(evidenceDir,'victory-raised-arms.png'),Buffer.from(raisedFrame.data,'base64'));
    if(raisedFrame.data===third.data)
      throw Error('Victory had '+raisedState.frames+' motion frames and '+raisedState.paintedFrames+' V21 GPU frames but no new compositor image: '+JSON.stringify(raisedState));
    value.raisedArms={pixelsChanged:true,paintedFrames:raisedState.paintedFrames,
      motionFrames:raisedState.frames,drawMs:raisedState.drawMs,seam:raisedState.seam};
    }
    }
  }
  console.log(capabilityProbe?'TEDDY_WEBGL2_CAPABILITY_PASS':activationProbe?'TEDDY_WEBGL2_SKIN_ACTIVATION_PASS':'TEDDY_V18_BROWSER_UI_AND_VISUAL_PASS',JSON.stringify(value));
}finally{
  cdp?.ws?.close();
  proc?.kill('SIGKILL');
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
}

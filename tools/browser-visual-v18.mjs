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
    window.__teddyVisualQuality=null;
    window.addEventListener('teddy:visual-quality',e=>{window.__teddyVisualQuality=e.detail||null});
    window.__teddySkinV16=null;
    window.addEventListener('teddy:implicit-skin-ready',e=>{window.__teddySkinV16=e.detail});
    window.addEventListener('teddy:implicit-skin-error',e=>{window.__teddySkinV16={active:false,error:e.detail.message}});
  `});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${sitePort}/`});
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
    return {success:!!skin?.active&&(skin?.mode==='anatomical-pelt-v21'?skin?.components===6&&skin?.zeroCrossRegionTriangles===true&&skin?.crossRegionWeights===0:skin?.components===1)&&skin?.openEdges===0,
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
    if(skin.mode==='anatomical-pelt-v21'){
      if(skin.components!==6||!skin.zeroCrossRegionTriangles||skin.crossRegionWeights!==0||
        skin.openEdges!==0||skin.nonmanifoldEdges!==0||!skin.closed)
        throw Error('Anatomical pelt not closed or arm/torso topology still bridged '+JSON.stringify(skin));
    }else{
      if(!skin.underarms?.pass||skin.underarms.cutters!==2||
        skin.underarms.samples.some(s=>s.gap<=.012||s.torso>=0||s.arm>=0))
        throw Error('Legacy V19 underarm gap missing '+JSON.stringify(skin));
      if(!skin.seamEdges||skin.seamEdges<80||!skin.seamWeights||skin.seamWeights.affected<100)
        throw Error('Legacy V20 shoulder seam missing '+JSON.stringify(skin));
    }
    for(let i=0;i<50&&!window.__teddyVisualQuality;i++)await sleep(80);
    const quality=window.__teddyVisualQuality;
    if(skin.mode==='anatomical-pelt-v21'){
      if(!quality?.pass||!quality.zeroCrossRegionTriangles)throw Error('V21 real pose deformation unsafe: '+JSON.stringify(quality));
    }else if(!quality?.seam?.finite||quality.seam.after>quality.seam.before)
      throw Error('Legacy V20 strain unsafe '+JSON.stringify(quality));
    const badge=document.querySelector('#visualBackend');
    const status=document.querySelector('#statusPanel').getBoundingClientRect();
    if(!(badge?.textContent.includes('mesh fusa')||badge?.textContent.includes('anatomia articolata'))||badge.dataset.degraded!=='false')
      throw Error('Fused rendering not represented in UI');
    if(status.left>innerWidth*.31)throw Error('Operational status overlaps portrait');
    nav.click();
    await sleep(180);
    const rect=document.querySelector('#scene').getBoundingClientRect();
    const clip={x:Math.round(rect.left+rect.width*.08),y:Math.round(rect.top+rect.height*.02),
      width:Math.round(rect.width*.84),height:Math.round(rect.height*.94),scale:1};
    return {success:true,backend:'webgl2',skin,clip,poseQuality:quality};
  })()`;
  const result=await Promise.race([
    cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),
    sleep(28000).then(()=>{throw Error('CDP WebGL skin evaluation timed out')})
  ]);
  if(result.exceptionDetails)throw Error('Browser JavaScript exception: '+result.exceptionDetails.text);
  const value=result.result?.value;
  if(!value?.success)throw Error('Teddy WebGL2 fused skin not ready: '+JSON.stringify(value));
  if(!capabilityProbe&&!activationProbe){
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
    // V20 regression pose: both arms elevated, reproducing the user-reported
    // accordion geometry more directly than the asymmetrical Lightning Bolt.
    const raised=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
      document.querySelector('.motion-tabs button:nth-child(1)')?.click();
      const key=document.querySelector('button[data-routine="victory"]');
      if(!key)throw Error('Victory raised-arms UI control missing');
      key.click();
      await new Promise(r=>setTimeout(r,790));
      const q=window.__teddySeamQuality;
      return {clicked:true,seam:q};
    })()`,awaitPromise:true,returnByValue:true});
    if(raised.exceptionDetails)throw Error('Raised-arms browser exception: '+raised.exceptionDetails.text);
    const raisedState=raised.result?.value;
    if(!raisedState?.clicked||!raisedState.seam?.finite||
      raisedState.seam.after>raisedState.seam.before)
      throw Error('Raised-arms seam regression: '+JSON.stringify(raisedState));
    const raisedFrame=await cdp.send('Page.captureScreenshot',{format:'png',clip:value.clip,captureBeyondViewport:false});
    fs.writeFileSync(path.join(evidenceDir,'victory-raised-arms.png'),Buffer.from(raisedFrame.data,'base64'));
    if(raisedFrame.data===third.data)throw Error('Raised-arms gesture rendered no visible change');
    value.raisedArms={pixelsChanged:true,seam:raisedState.seam};
  }
  console.log(capabilityProbe?'TEDDY_WEBGL2_CAPABILITY_PASS':activationProbe?'TEDDY_WEBGL2_SKIN_ACTIVATION_PASS':'TEDDY_V18_BROWSER_UI_AND_VISUAL_PASS',JSON.stringify(value));
}finally{
  cdp?.ws?.close();
  proc?.kill('SIGKILL');
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
}

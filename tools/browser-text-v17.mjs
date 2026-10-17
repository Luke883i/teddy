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
async function completeProbe(){ws?.close();proc?.kill('SIGKILL');api?.kill('SIGTERM');await sleep(150);fs.rmSync(work,{recursive:true,force:true});process.exit(0)}
try{
  api=spawn(process.execPath,[path.join(root,'server/main.mjs')],{cwd:root,env:{...process.env,TEDDY_HOME:home,TEDDY_PORT:String(port),TEDDY_PROVIDER:'local',TEDDY_LOCAL_ENGINE_MOCK:'1',TEDDY_RUNTIME_AUTOINSTALL:'0'},stdio:['ignore','pipe','pipe']});
  api.stderr.on('data',chunk=>log+=String(chunk).slice(-1000));
  let ready=false;for(let i=0;i<100;i++){try{const r=await sendHttp('/api/health');if(r.ok){ready=true;break}}catch{}await sleep(90)}
  if(!ready)throw Error('real Node control plane did not boot: '+log);
  if(process.argv.includes('--probe-server')){console.log('TEDDY_SERVER_BOOT_PASS',port);await completeProbe();}
  // A cold CI runner sometimes fails to publish DevToolsActivePort on the first
  // launch. Reopen the *real* browser with a fresh profile; never fake the UI.
  let portFile=null,chromeBootError='';
  for(let attempt=0;attempt<3;attempt++){
    const profile=attempt===0?chromeHome:path.join(work,'chrome-retry-'+attempt);
    proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
    proc.stderr?.on('data',chunk=>{chromeBootError=(chromeBootError+String(chunk)).slice(-1100)});
    const file=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<155&&!fs.existsSync(file)&&proc.exitCode===null;i++)await sleep(85);
    if(fs.existsSync(file)){portFile=file;break}
    console.error('TEDDY_CHROME_BOOT_RETRY',JSON.stringify({attempt:attempt+1,exitCode:proc.exitCode,stderr:chromeBootError.slice(-300)}));
    proc.kill('SIGKILL');
    await sleep(250);
  }
  if(!portFile)throw Error('Chrome CDP not ready after 3 real starts: '+chromeBootError.slice(-500));
  if(process.argv.includes('--probe-chrome')){console.log('TEDDY_CHROME_CDP_PASS');await completeProbe();}
  const cdpPort=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const pages=await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
  const target=pages.find(x=>x.type==='page');if(!target)throw Error('No browser page');
  const command=await connectCDP(target.webSocketDebuggerUrl);
  await command('Page.enable');await command('Runtime.enable');
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    // Browser proof: microphone permission must never be requested in text-only mode.
    globalThis.__teddyMicAttempts=0;
    globalThis.__teddyVoiceFetchAttempts=0;
    globalThis.__teddyAudioContextAttempts=0;
    globalThis.__teddyMediaPlayAttempts=0;
    const OriginalAudioContext=globalThis.AudioContext;
    if(typeof OriginalAudioContext==='function')globalThis.AudioContext=new Proxy(OriginalAudioContext,{construct(target,args,newTarget){globalThis.__teddyAudioContextAttempts++;return Reflect.construct(target,args,newTarget)}});
    const originalPlay=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){globalThis.__teddyMediaPlayAttempts++;return originalPlay.apply(this,args)};
    const nativeFetch=globalThis.fetch;
    globalThis.fetch=(input,init)=>{const uri=String(input?.url||input);if(uri.includes('/api/local/turn')||uri.includes('/api/realtime/session'))globalThis.__teddyVoiceFetchAttempts++;return nativeFetch(input,init)};
    if(navigator.mediaDevices&&typeof navigator.mediaDevices.getUserMedia==='function'){
      navigator.mediaDevices.getUserMedia=()=>{globalThis.__teddyMicAttempts++;throw Error('microphone_must_not_start_in_text_mode')};
    }
    // Language E2E: isolate actual UI/network/runtime from software 3D GPU cost.
    const previous=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...rest){
      if(kind==='webgl2')return null;
      return previous.call(this,kind,...rest);
    };
  `});
  if(process.argv.includes('--desktop')||process.argv.includes('--mobile'))await command('Emulation.setDeviceMetricsOverride',{width:process.argv.includes('--mobile')?390:1180,height:process.argv.includes('--mobile')?844:760,deviceScaleFactor:1,mobile:process.argv.includes('--mobile')});
  await command('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  if(process.argv.includes('--probe-dom')){const r=await command('Runtime.evaluate',{expression:'JSON.stringify({readyState:document.readyState,html:!!document.querySelector(\'#chatForm\'),hint:document.querySelector(\'#chatHint\')?.textContent||\'\'})',returnByValue:true});console.log('TEDDY_CHROME_DOM_PASS',r.result?.value);await completeProbe();}
  const probeBootstrap=process.argv.includes('--probe-bootstrap'),probeChat=process.argv.includes('--probe-chat');
  const probeBalloon=process.argv.includes('--probe-balloon'),probeGeometry=process.argv.includes('--probe-geometry'),probeControls=process.argv.includes('--probe-controls');
  const probeHistory=process.argv.includes('--probe-history');
  const expression=`(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<250&&document.querySelector('#chatForm')?.dataset.wired!=='true';i++)await sleep(75);
    const input=document.querySelector('#chatInput'),form=document.querySelector('#chatForm');
    if(!input||!form)throw Error('text composer absent');
    if(form.dataset.wired!=='true')throw Error('composer HTML present without live submit handler');
    if(document.querySelector('#talkBtn')||document.querySelector('#remoteAudio')||document.querySelector('#meter'))throw Error('voice controls leaked into text-only UI');
    if(typeof globalThis.__teddyMicAttempts!=='number'||typeof globalThis.__teddyVoiceFetchAttempts!=='number'||typeof globalThis.__teddyAudioContextAttempts!=='number'||typeof globalThis.__teddyMediaPlayAttempts!=='number')throw Error('voice probe was not injected');
    if(globalThis.__teddyMicAttempts!==0||globalThis.__teddyVoiceFetchAttempts!==0||globalThis.__teddyAudioContextAttempts!==0||globalThis.__teddyMediaPlayAttempts!==0)throw Error('voice started during text-only bootstrap: '+JSON.stringify({microphone:globalThis.__teddyMicAttempts,voiceHttp:globalThis.__teddyVoiceFetchAttempts,audioContext:globalThis.__teddyAudioContextAttempts,play:globalThis.__teddyMediaPlayAttempts}));
    for(let i=0;i<150&&input.disabled;i++)await sleep(70);
    if(input.disabled)throw Error('text input not ready in real mock provider');
    if(${probeBootstrap})return {success:true,chatInputVisible:input.getBoundingClientRect().width>120};
    input.value='Come stai Teddy?';form.requestSubmit();
    const pending=document.querySelector('#teddyBubble');
    if(!pending.classList.contains('is-thinking')||pending.getAttribute('aria-busy')!=='true')throw Error('thinking state absent at actual submit');
    if(document.querySelector('#teddyBubbleText').textContent.trim())throw Error('fake pre-completion text leaked into balloon');
    for(let i=0;i<160&&document.querySelectorAll('.chat-message').length<2;i++)await sleep(80);
    const turns=[...document.querySelectorAll('.chat-message')].map(x=>x.textContent);
    if(turns.length!==2||!turns[0].includes('Come stai Teddy?')||!turns[1].includes('Ho sentito'))throw Error('chat was not actually rendered: '+JSON.stringify(turns));
    if(${probeChat})return {success:true,chatInputVisible:input.getBoundingClientRect().width>120,turns};
    if(document.querySelector('#chatPanel #chatLog'))throw Error('transcript still inside composer');
    const history=document.querySelector('#chatHistoryPanel'),bubble=document.querySelector('#teddyBubble');
    if(!history||!bubble||bubble.classList.contains('hidden'))throw Error('history dock or real-reply balloon absent');
    if(!document.querySelector('#teddyBubbleText').textContent.includes('Ho sentito'))throw Error('balloon is not wired to real reply');
    if(bubble.classList.contains('is-thinking')||bubble.getAttribute('aria-busy')!=='false')throw Error('thinking state persisted after valid real response');
    if(innerWidth>=900){
      const rect=bubble.getBoundingClientRect();
      if(rect.left<innerWidth/2+75||rect.left>innerWidth*.75)throw Error('comic not anchored near Teddy: '+rect.left);
    }
    if(globalThis.__teddyMicAttempts!==0||globalThis.__teddyVoiceFetchAttempts!==0||globalThis.__teddyAudioContextAttempts!==0||globalThis.__teddyMediaPlayAttempts!==0)throw Error('voice side-effect during actual chat turn');
    if(${probeBalloon})return {success:true,chatInputVisible:true,stage:'balloon'};
    const compact=innerWidth<900;
    if(compact===(!history.classList.contains('hidden')))throw Error('history default visibility mismatch: '+JSON.stringify({width:innerWidth,compact,historyHidden:history.classList.contains('hidden'),expanded:document.querySelector('#historyToggle')?.getAttribute('aria-expanded')}));
    if(${probeHistory})return {success:true,chatInputVisible:true,stage:'history'};
    const balloonRect=bubble.getBoundingClientRect(),composerRect=document.querySelector('#chatPanel').getBoundingClientRect();
    if(balloonRect.right>innerWidth+1||balloonRect.left<0||composerRect.right>innerWidth+1||composerRect.left<0)throw Error('reflow outside viewport: '+JSON.stringify({width:innerWidth,device:screen.width,visual:visualViewport?.width,balloon:{left:balloonRect.left,right:balloonRect.right,width:balloonRect.width},composer:{left:composerRect.left,right:composerRect.right,width:composerRect.width},styles:{bubble:getComputedStyle(bubble).width,composer:getComputedStyle(document.querySelector('#chatPanel')).width}}));
    if(!compact&&history.getBoundingClientRect().right>=balloonRect.left)throw Error('Teddy center corridor obscured');
    if(${probeGeometry})return {success:true,chatInputVisible:true,stage:'geometry'};
    if(composerRect.height>Math.max(125,innerHeight*.3))throw Error('composer became a giant transcript');
    document.querySelector('#bubbleClose').click();
    if(!bubble.classList.contains('hidden'))throw Error('balloon cannot close');
    history.querySelector('.chat-message.assistant').click();
    if(bubble.classList.contains('hidden'))throw Error('history answer cannot reopen balloon');
    if(history.classList.contains('hidden'))document.querySelector('#historyToggle').click();
    if(history.classList.contains('hidden'))throw Error('history cannot open');
    document.querySelector('#historyClose').click();
    if(!history.classList.contains('hidden'))throw Error('history cannot close');
    const modelButton=document.querySelector('#modelDetailsBtn');
    if(modelButton.classList.contains('hidden'))throw Error('model details unrecoverable');
    modelButton.click();
    if(document.querySelector('#installPanel').classList.contains('hidden'))throw Error('model details do not open');
    document.querySelector('#installClose').click();
    if(!document.querySelector('#installPanel').classList.contains('hidden'))throw Error('model details do not close');
    if(${probeControls})return {success:true,chatInputVisible:true,stage:'controls'};
    const newChat=document.querySelector('#newChat');
    if(!newChat||newChat.disabled)throw Error('new chat cannot start');
    newChat.click();
    if(!bubble.classList.contains('hidden'))throw Error('old answer remains visible after new conversation');
    if(input.disabled)throw Error('new conversation disabled the composer');
    history.querySelector('.chat-message.assistant').click();
    if(bubble.classList.contains('hidden'))throw Error('saved conversation cannot be resumed');

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
  const result=await Promise.race([command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}),sleep(45000).then(()=>{throw Error('text browser smoke timeout')})]);
  if(result.exceptionDetails)throw Error('Real browser failure: '+(result.exceptionDetails.exception?.description||result.exceptionDetails.text));
  const data=result.result?.value;
  if(!data?.success||!data?.chatInputVisible)throw Error('Unexpected UI evidence: '+JSON.stringify(data));
  const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const png=Buffer.from(screenshot.data,'base64');
  if(process.env.RUNNER_TEMP)fs.writeFileSync(path.join(process.env.RUNNER_TEMP,process.argv.includes('--mobile')?'teddy-v21-mobile.png':'teddy-v21-desktop.png'),png);
  if(png.subarray(1,4).toString()!=='PNG')throw Error('browser screenshot missing');
  const history=await (await sendHttp('/api/history?limit=10')).json();
  if(!probeBootstrap&&!history.turns?.some(t=>t.role==='user'&&t.text==='Come stai Teddy?')||!probeBootstrap&&!history.turns?.some(t=>t.role==='assistant'&&t.text.includes('Ho sentito')))throw Error('SQLite did not persist both actual HTTP turns');
  console.log('TEDDY_TEXT_BROWSER_PASS',JSON.stringify({turns:history.turns.length,screenshotSha256:crypto.createHash('sha256').update(png).digest('hex'),imageWidth:png.readUInt32BE(16),imageHeight:png.readUInt32BE(20),...data}));
}finally{
  ws?.close();proc?.kill('SIGKILL');api?.kill('SIGTERM');
  await sleep(150);fs.rmSync(work,{recursive:true,force:true});
}

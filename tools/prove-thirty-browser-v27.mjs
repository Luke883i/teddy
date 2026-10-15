// Genuine UI/LLM E2E: thirty distinct browser-driven conversations against real Qwen,
// no mocked HTTP, no synthetic balloon content. An evidence video samples real frames.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const prompts=[
 'Spiega in una frase che cos’è la gravità.','Perché il cielo appare blu?','Che differenza c’è tra fatto e opinione?',
 'Che cos’è un contratto?','Come si forma un arcobaleno?','Che significa probabilità?',
 'Perché bisogna verificare le fonti?','Che cosa vuol dire causalità?','Come funziona una bussola?',
 'Che cos’è un algoritmo?','Perché la luna cambia aspetto?','Che significa compromesso?',
 'Come si forma una nuvola?','Che cos’è la privacy?','Perché serve un backup?',
 'Che cosa sono gli interessi composti?','Cos’è una metafora?','Che differenza c’è tra errore e rischio?',
 'Come si misura una distanza?','Che cos’è la democrazia?','Perché il ghiaccio galleggia?',
 'Che cosa vuol dire evidenza?','Come funziona una batteria?','Che cos’è una rete informatica?',
 'Perché la memoria può sbagliare?','Che cosa vuol dire contraddizione?','Come nasce il vento?',
 'Che cos’è un investimento?','Perché un dato non è una conclusione?','Che cos’è un’ipotesi verificabile?'
];
export async function proveThirtyBrowser({appPort,home,root=process.cwd()}){
 const out=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'teddy-v27-real-30');
 fs.mkdirSync(out,{recursive:true});
 const chrome=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>fs.existsSync(x));
 if(!chrome)throw Error('v27_real_chromium_required');
 const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-v27-chrome-'));
 const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+userDir,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let chromeError='';proc.stderr.on('data',b=>chromeError=(chromeError+String(b)).slice(-1200));
 let ws,command,db;
 const report={schema:'teddy.v27.browser.30',realModel:true,realBrowser:true,syntheticUserPrompts:true,modelMock:false,sessions:[],startedAt:new Date().toISOString()};
 try{
   const pf=path.join(userDir,'DevToolsActivePort');
   for(let i=0;i<180&&!fs.existsSync(pf);i++)await pause(100);
   if(!fs.existsSync(pf))throw Error('Chrome CDP not ready '+chromeError);
   const debugPort=Number(fs.readFileSync(pf,'utf8').split('\n')[0]);
   const pages=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();
   const target=pages.find(p=>p.type==='page');if(!target)throw Error('no chromium target');
   ws=new WebSocket(target.webSocketDebuggerUrl);
   await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
   let seq=0;const pending=new Map();
   ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(!msg.id)return;const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)});
   command=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
   await command('Page.enable');await command('Runtime.enable');
   const resize=async mobile=>command('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:mobile?844:800,deviceScaleFactor:1,mobile});
   await resize(false);
   await command('Page.navigate',{url:'http://127.0.0.1:'+appPort+'/'});
   async function evaluate(expr,deadline=65000){
     const result=await Promise.race([command('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}),pause(deadline).then(()=>{throw Error('browser_evaluation_timeout')})]);
     if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
     return result.result?.value;
   }
   const boot=await evaluate(`(async()=>{for(let i=0;i<150;i++){if(document.querySelector('#chatForm')?.dataset.wired==='true')return true;await new Promise(r=>setTimeout(r,100))}return false})()`);
   if(!boot)throw Error('chat did not become wired');
   db=new DatabaseSync(path.join(home,'data','teddy.sqlite'));
   for(let i=0;i<30;i++){
     const mobile=i%2===1;await resize(mobile);await pause(130);
     const name='Persona'+String(i+1).padStart(2,'0');
     const seed=await evaluate(`(()=>{const b=document.querySelector('#newChat');if(b.disabled)throw Error('new chat disabled');b.click();return {active:document.querySelector('#chatInput').disabled,balloonHidden:document.querySelector('#teddyBubble').classList.contains('hidden')}})()`);
     if(seed.active||!seed.balloonHidden)throw Error('new chat not reset at '+i);
     const start=performance.now();
     const cases=['chi sei?','Mi chiamo '+name,prompts[i]];
     const replies=[];
     for(let j=0;j<cases.length;j++){
       const text=cases[j],reply=await evaluate(`(async()=>{const input=document.querySelector('#chatInput'),form=document.querySelector('#chatForm');input.value=${JSON.stringify(text)};form.requestSubmit();for(let i=0;i<450;i++){await new Promise(r=>setTimeout(r,100));const output=document.querySelector('#teddyBubbleText').textContent,send=document.querySelector('#sendText');if(output&&send.textContent==='Invia'&&output!==${JSON.stringify(replies.at(-1)?.text||'')})return {text:output,button:send.textContent}}throw Error('no browser reply for real user turn')})()`,55000);
       if(!reply?.text||reply.text.length<9)throw Error('too short or missing actual reply in browser');
       replies.push(reply);
     }
     const transcript=db.prepare('SELECT c.id conversation_id,t.role,t.text FROM turns t JOIN conversations c ON c.id=t.conversation_id ORDER BY t.id DESC LIMIT 6').all().reverse();
     const ids=new Set(transcript.map(x=>x.conversation_id));if(ids.size!==1)throw Error('session leakage at '+i);
     const id=[...ids][0],stored=transcript.at(-1)?.text,rendered=replies.at(-1).text;
     if(stored!==rendered)throw Error('balloon text not identical to committed SQLite response at '+i);
     const receipts=db.prepare('SELECT receipt_json FROM semantic_receipts WHERE conversation_id=? ORDER BY id').all(id).map(x=>JSON.parse(x.receipt_json));
     if(receipts.length!==3||receipts[0].path!=='deterministic'||receipts[1].path!=='deterministic'||receipts[2].path!=='model')throw Error('route proof missing '+i);
     const metrics=await evaluate(`(()=>{const p=document.querySelector('#teddyBubbleText'),b=document.querySelector('#teddyBubble'),read=document.querySelector('#bubbleReadAll'),composer=document.querySelector('#chatPanel');const ps=getComputedStyle(p),pr=p.getBoundingClientRect(),br=b.getBoundingClientRect(),cr=composer.getBoundingClientRect();const overflow=p.scrollHeight>p.clientHeight+2;return {fontPx:parseFloat(ps.fontSize),lineHeightPx:parseFloat(ps.lineHeight),bodyChars:p.textContent.length,visibleHeight:p.clientHeight,fullHeight:p.scrollHeight,overflow,readAllVisible:!read.classList.contains('hidden'),balloon:{left:br.left,right:br.right,top:br.top,bottom:br.bottom},composer:{left:cr.left,right:cr.right},viewport:{width:innerWidth,height:innerHeight},textMatches:!!p.textContent,historyDockHidden:document.querySelector('#chatHistoryPanel').classList.contains('hidden')}})()`);
     if(metrics.fontPx<15||metrics.lineHeightPx<20)throw Error('unreadable font metrics '+JSON.stringify({i,metrics}));
     if(metrics.balloon.left<0||metrics.balloon.right>metrics.viewport.width+1||metrics.composer.left<0||metrics.composer.right>metrics.viewport.width+1)throw Error('viewport clipping '+i);
     if(metrics.overflow&&!metrics.readAllVisible)throw Error('truncated long response without full-read affordance '+i);
     if(mobile&&!metrics.historyDockHidden)throw Error('history obscures mobile Teddy '+i);
     const frame=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
     const filename=path.join(out,String(i+1).padStart(2,'0')+'.png');fs.writeFileSync(filename,Buffer.from(frame.data,'base64'));
     if(metrics.overflow){
       const full=await evaluate(`(()=>{document.querySelector('#bubbleReadAll').click();const history=document.querySelector('#chatHistoryPanel'),rows=[...history.querySelectorAll('.chat-message.assistant p')];return {open:!history.classList.contains('hidden'),found:rows.some(x=>x.textContent===document.querySelector('#teddyBubbleText').textContent)}})()`);
       if(!full.open||!full.found)throw Error('full-text disclosure broken '+i);
     }
     report.sessions.push({n:i+1,conversationDigest:sha(id).slice(0,16),mobile,turns:3,modelTurns:1,ruleTurns:2,elapsedMs:Math.round(performance.now()-start),replyCharacters:rendered.length,replyDigest:sha(rendered),metrics,frame:path.basename(filename)});
     console.log('TEDDY_REAL_BROWSER_SESSION_PASS',JSON.stringify({session:i+1,mobile,latencyMs:report.sessions.at(-1).elapsedMs,chars:rendered.length,font:metrics.fontPx,overflow:metrics.overflow}));
   }
   if(new Set(report.sessions.map(s=>s.conversationDigest)).size!==30)throw Error('30 sessions not distinct');
   report.finishedAt=new Date().toISOString();report.complete=30;
   const lat=report.sessions.map(s=>s.elapsedMs).sort((a,b)=>a-b);
   report.latency={p50:lat[15],p95:lat[28],max:lat[29]};
   report.overflowSessions=report.sessions.filter(s=>s.metrics.overflow).length;
   report.minFontPx=Math.min(...report.sessions.map(s=>s.metrics.fontPx));
   report.visualEvidence='30 actual browser screenshots; mp4 is a sampled-frame storyboard, NOT continuous screen recording';
   const json=path.join(out,'teddy-v27-30-session-proof.json');
   fs.writeFileSync(json,JSON.stringify(report,null,2));
   const movie=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate','1','-pattern_type','glob','-i',path.join(out,'*.png'),'-vf','scale=960:-2:flags=lanczos','-pix_fmt','yuv420p',path.join(out,'teddy-v27-sampled-ui.mp4')],{timeout:120000});
   report.videoCreated=movie.status===0;report.videoError=movie.status===0?null:String(movie.stderr||'').slice(0,450);
   fs.writeFileSync(json,JSON.stringify(report,null,2));
   console.log('TEDDY_REAL_30_SESSION_PASS',JSON.stringify({sessions:report.complete,latency:report.latency,minFontPx:report.minFontPx,overflows:report.overflowSessions,video:report.videoCreated}));
   if(!report.videoCreated)throw Error('real_video_evidence_unavailable:'+report.videoError);
   return report;
 }catch(e){
   report.failure=String(e?.stack||e).slice(0,1600);
   fs.writeFileSync(path.join(out,'teddy-v27-30-session-proof.json'),JSON.stringify(report,null,2));
   throw e;
 }finally{
   try{db?.close()}catch{}
   try{ws?.close()}catch{}
   proc.kill('SIGKILL');await pause(300);
   fs.rmSync(userDir,{recursive:true,force:true});
 }
}

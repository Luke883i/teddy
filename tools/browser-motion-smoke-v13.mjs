// Browser-level proof: real buttons, actual RAF, real Canvas2D pixels.
// No remote AI or native voice dependency; uses the production HTML/modules.
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
const probe=`
window.__frames=[];
window.addEventListener('error',e=>{document.body?.setAttribute('data-motion-error',String(e.message).slice(0,150))});
const nativeGetContext=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(kind,...args){
  if(kind==='webgl2')return null;
  return nativeGetContext.call(this,kind,...args);
};
window.addEventListener('teddy:motion-frame',e=>{
  const a=e.detail?.action;
  if(a?.name==='waveRight'&&a.amount>.1)window.__frames.push(a.amount);
});
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    try {
      document.querySelector('button[data-view="movimento"]').click();
      const canvas=document.querySelector('#scene');
      const before=canvas.toDataURL();
      const control=document.querySelector('button[data-routine="greet"]');
      if(!control)throw Error('missing real movement control');
      control.click();
      setTimeout(()=>{
        const after=canvas.toDataURL();
        const frameCount=window.__frames.length;
        const pixelChanged=before!==after;
        const success=pixelChanged&&frameCount>3;
        const result={success,pixelChanged,frameCount,feedback:document.querySelector('#motionFeedback')?.textContent||''};
        const pre=document.createElement('pre');pre.id='teddy-motion-browser-proof';pre.textContent=JSON.stringify(result);document.body.append(pre);
      },1250);
    }catch(e){const pre=document.createElement('pre');pre.id='teddy-motion-browser-proof';pre.textContent=JSON.stringify({success:false,error:String(e)});document.body.append(pre)}
  },600);
});
`;
const server=http.createServer((req,res)=>{
  if(req.url?.startsWith('/api/bootstrap')){
    const data=JSON.stringify({config,ai:{provider:'openai'},secret:{configured:true},availability:{ready:true},persistence:{engine:'test'},realtime:{transport:'webrtc'}});
    res.writeHead(200,{'content-type':'application/json','content-length':Buffer.byteLength(data)});res.end(data);return;
  }
  if(req.url==='/__motion_probe.js'){
    res.writeHead(200,{...SECURITY_HEADERS,'content-type':'text/javascript; charset=utf-8'});res.end(probe);return;
  }
  if(req.url==='/'||req.url?.startsWith('/?')){
    const html=fs.readFileSync(path.join(WEB,'index.html'),'utf8').replace('</head>','<script src="/__motion_probe.js"></script></head>');
    res.writeHead(200,{...SECURITY_HEADERS,'content-type':'text/html; charset=utf-8'});res.end(html);return;
  }
  if(!serveStatic(WEB,req,res)){res.statusCode=404;res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>fs.existsSync(x));
if(!chrome){server.close();throw Error('headless Chrome/Chromium required for real browser motion proof');}
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-motion-browser-'));
try{
  const output=await new Promise((resolve,reject)=>{
    const child=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
      '--disable-background-timer-throttling','--disable-renderer-backgrounding',
      '--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,
      '--virtual-time-budget=4100','--dump-dom',`http://127.0.0.1:${port}/`],{stdio:['ignore','pipe','pipe']});
    let text='',errors='';
    child.stdout.on('data',b=>{text+=b.toString()});
    child.stderr.on('data',b=>{errors+=b.toString().slice(0,1000)});
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium motion proof timed out: '+errors.slice(-500)))},25000);
    child.once('error',e=>{clearTimeout(timer);reject(e)});
    child.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(Error('Chrome exit '+code+': '+errors.slice(-700)));else resolve(text)});
  });
  const match=output.match(/<pre id="teddy-motion-browser-proof">([^<]+)<\/pre>/);
  if(!match)throw Error('Real browser did not produce movement proof. DOM tail: '+output.slice(-1000));
  const result=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
  if(!result.success)throw Error('No visible moving Teddy: '+JSON.stringify(result));
  console.log('TEDDY_BROWSER_MOTION_PASS',JSON.stringify(result));
}finally{
  await new Promise(r=>server.close(r));
  fs.rmSync(profile,{recursive:true,force:true});
}

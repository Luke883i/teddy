import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('launcher is versioned executable and --help needs no model or permissions workarounds',()=>{
 const stat=fs.statSync(path.join(root,'teddy.sh'));
 if(process.platform!=='win32')assert.ok(stat.mode&0o111,'Git must commit 100755, not 100644');
 const help=execFileSync(path.join(root,'teddy.sh'),['--help'],{encoding:'utf8',timeout:4000});
 assert.match(help,/Usage: \.\/teddy\.sh/);
});
test('actual comic can reveal its full committed response and meets legibility contract',()=>{
 const html=read('web/index.html'),ui=read('web/text-chat-v17.js'),css=read('web/styles.css');
 assert.match(html,/id="teddyBubbleText"/);assert.match(html,/id="bubbleReadAll"/);
 assert.match(html,/aria-controls="chatHistoryPanel"/);
 assert.match(ui,/bubbleText\.textContent=text/);
 assert.match(ui,/bubbleText\.scrollHeight>bubbleText\.clientHeight\+2/);
 assert.match(ui,/bubbleReadAll\.addEventListener\('click'/);
 assert.match(ui,/setHistory\(true,\{focus:true\}\)/);
 assert.match(ui,/find\(el=>el\.querySelector\('p'\)\?\.textContent===bubbleText\.textContent\)/);
 assert.match(css,/font-size:clamp\(15px,1\.6vw,18px\)/);
 assert.match(css,/\.bubble-read-all:focus-visible/);
});
test('only real model / HTTP / SQLite sources are permitted in 30-session proof',()=>{
 const p=read('tools/prove-thirty-browser-v27.mjs');
 const main=read('tools/prove-real-text-v20.mjs');
 assert.match(main,/proveThirtyBrowser\(\{appPort,home,root\}\)/);
 assert.match(p,/sessions\.length/);assert.match(p,/!==30/);
 assert.match(p,/const db=new DatabaseSync|db=new DatabaseSync/);
 assert.match(p,/stored!==rendered/);
 assert.match(p,/receipts\.length!==3/);
 assert.match(p,/await command\('Page\.captureScreenshot'/);
 assert.match(p,/fontPx<15/);
 assert.match(p,/overflow&&!metrics\.readAllVisible/);
 assert.doesNotMatch(p,/TEDDY_LOCAL_ENGINE_MOCK:'1'|route\.fulfill|page\.route/);
});

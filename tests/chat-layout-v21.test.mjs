import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chatLayout} from '../web/chat-layout-v21.js';
test('real layout contract reserves center, bounds panels and preserves mobile entrypoint',()=>{
  for(const [w,h] of [[320,568],[390,844],[560,320],[800,600],[949,410],[1280,720],[1920,1080]]){
    const p=chatLayout(w,h);
    assert.ok(p.composerWidth<=w-24);
    assert.ok(p.historyWidth<=w-24);
    assert.ok(p.bubbleWidth<=w*0.5);
    if(w>=900)assert.ok(p.centralGap>=w*0.30,'center must stay clear');
    if(w<900)assert.equal(p.initialHistoryOpen,false);
    if(w>=900)assert.equal(p.initialHistoryOpen,true);
  }
});
test('chat elements are distinct and model details are operable on demand',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 const chat=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
 assert.match(html,/<aside id="chatHistoryPanel"/);
 assert.match(html,/<section id="teddyBubble"/);
 assert.match(html,/id="teddyBubbleText"/);
 assert.match(html,/id="historyToggle"/);
 assert.match(html,/id="historyClose"/);
 assert.match(html,/id="bubbleClose"/);
 assert.match(html,/id="modelDetailsBtn"/);
 const composer=html.slice(html.indexOf('<section id="chatPanel"'),html.indexOf('<audio id="remoteAudio"'));
 assert.doesNotMatch(composer,/id="chatLog"/);
 assert.match(app,/function openModelDetails/);
 assert.match(app,/function closeModelDetails/);
 assert.match(app,/aria-expanded/);
 assert.match(chat,/showBubble\(body\.reply\)/);
 assert.match(chat,/fetch\(path,\{cache:'no-store'\}\)/);
 assert.match(chat,/role==='assistant'\?'button':'article'/);
 assert.doesNotMatch(chat,/innerHTML\s*=\s*.*body\.reply/);
});

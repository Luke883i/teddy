import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('chat-only shell exposes no voice initiation or autoplay surfaces',()=>{
 const html=read('web/index.html'),app=read('web/app.js');
 for(const forbidden of ['id="talkBtn"','id="remoteAudio"','id="meter"','autoplay','Parla con Teddy'])assert.ok(!html.includes(forbidden),'visible voice control '+forbidden);
 for(const forbidden of ['TeddyRealtime','AudioPresence','captureWav','streamLocalTurn','startTalk(','startCloud(','startLocalTurn(','getUserMedia(','#talkBtn'])assert.ok(!app.includes(forbidden),'voice boot dependency '+forbidden);
 assert.match(html,/id="chatInput"/);assert.match(html,/id="teddyBubbleText"/);
 assert.match(app,/textChat=installTextChat/);
 assert.match(html,/data-view="talk" class="active">Chat<\/button>/);
});
test('default text-only runtime rejects voice routes before any audio parsing',()=>{
 const server=read('server/main.mjs');
 assert.match(server,/const VOICE_ENDPOINTS_ENABLED=process\.env\.TEDDY_ENABLE_VOICE_ENDPOINTS==='1'/);
 assert.match(server,/if\(!VOICE_ENDPOINTS_ENABLED\)return json\(res,404,\{error:'voice_not_enabled'\}\)/);
 assert.match(server,/interaction:\{mode:'text',voiceUi:false,voiceEndpoints:VOICE_ENDPOINTS_ENABLED\}/);
 assert.equal((server.match(/if\(!VOICE_ENDPOINTS_ENABLED\)return json\(res,404/g)||[]).length,2);
});

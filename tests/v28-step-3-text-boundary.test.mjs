import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLocalService} from '../server/lib/local-service.mjs';
test('step 3 / PR39: the test-only local provider never advertises a live microphone or voice',()=>{
 const s=createLocalService({env:{TEDDY_LOCAL_ENGINE_MOCK:'1'}}).status();
 assert.equal(s.mock,true);assert.equal(s.textReady,true);
 assert.deepEqual(s.engines,{asr:false,llm:true,tts:false});
});
test('default browser text mode never mounts a voice initiator',()=>{
 const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const main=fs.readFileSync(new URL('../server/main.mjs',import.meta.url),'utf8');
 for(const s of ['AudioPresence','TeddyRealtime','getUserMedia(','captureWav(','startTalk('])assert.ok(!app.includes(s),s);
 for(const s of ['id="talkBtn"','id="remoteAudio"','autoplay'])assert.ok(!html.includes(s),s);
 assert.match(main,/TEDDY_ENABLE_VOICE_ENDPOINTS==='1'/);
});

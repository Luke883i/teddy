import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
for(const f of ['web/index.html','web/app.js','web/realtime.js','web/audio.js','web/teddy/render.js','teddy.sh','Dockerfile'])test(`${f} exists`,()=>assert.ok(fs.statSync(f).size>40));
test('browser never embeds API key',()=>{for(const f of ['web/index.html','web/app.js','web/realtime.js'])assert.equal(fs.readFileSync(f,'utf8').includes('OPENAI_API_KEY'),false)});
test('realtime uses WebRTC and unified server endpoint',()=>{const s=fs.readFileSync('web/realtime.js','utf8');assert.match(s,/RTCPeerConnection/);assert.match(s,/application\/sdp/);assert.match(s,/\/api\/realtime\/session/)});

test('bootstrap verifies pinned Node checksum',()=>{const sh=fs.readFileSync('teddy.sh','utf8');assert.match(sh,/SHASUMS256/);assert.match(sh,/checksum mismatch/i)});

test('browser does not persist standard secret in web storage',()=>{const web=fs.readFileSync('web/app.js','utf8');assert.doesNotMatch(web,/localStorage|sessionStorage/)});

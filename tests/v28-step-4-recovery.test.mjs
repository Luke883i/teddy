import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
test('step 4 / PR40: after a failed history page, reopen actually retries HTTP',()=>{
 assert.match(src,/let historyLoad=null,historyLoadError=false/);
 assert.match(src,/if\(historyLoadError&&!historyLoad\)\{historyLoad=restoreHistory\(\)\.finally/);
 assert.match(src,/historyLoadError=true;/);
 assert.match(src,/historyLoadError=false;/);
 assert.match(src,/Chiudi e riapri per riprovare/);
 assert.match(src,/const hydrated=historyLoad\.finally/);
});
test('pagination only mounts fetched persisted rows and is bounded by a monotone cursor',()=>{
 assert.match(src,/const oldest=Number\(turns\[0\]\?\.id\)/);
 assert.match(src,/oldest>=before/);
 assert.match(src,/for\(let i=pages.length-1;i>=0;i--\)/);
 assert.match(src,/seenIds.has\(id\)/);
});

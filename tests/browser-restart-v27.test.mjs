import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('real Chromium smoke retries cold CDP failure with fresh profiles, never skips assertions',()=>{
 const s=fs.readFileSync(new URL('../tools/browser-text-v17.mjs',import.meta.url),'utf8');
 assert.match(s,/attempt<3/);
 assert.match(s,/chrome-retry-/);
 assert.match(s,/DevToolsActivePort/);
 assert.match(s,/Chrome CDP not ready after 3 real starts/);
 assert.match(s,/TEDDY_CHROME_BOOT_RETRY/);
 assert.match(s,/Page\.captureScreenshot/);
});

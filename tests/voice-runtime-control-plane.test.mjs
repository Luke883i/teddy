import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');

test('runtime retry is exposed as an asynchronous local control-plane action',()=>{
  const main=source('../server/main.mjs');
  assert.match(main,/POST'&&u\.pathname==='\/api\/runtime\/retry'/);
  assert.match(main,/runtime\.retry\(\)\.catch/);
  assert.match(main,/retryRequested:true/);
  assert.match(main,/runtimeRecovery/);
});

test('failed local availability exposes a retry affordance wired to the runtime endpoint',()=>{
  const app=source('../web/app.js');
  assert.match(app,/id="runtimeRetry"/);
  assert.match(app,/async function retryLocalRuntime/);
  assert.match(app,/fetch\('\/api\/runtime\/retry',\{method:'POST'\}\)/);
  assert.match(app,/runtimeEls\.retry\.onclick=retryLocalRuntime/);
  assert.match(app,/const ready=availability\?\.textReady===true\|\|boot\.ai\.mock===true/);
  assert.match(app,/canRetry=!ready&&!installing/);
});

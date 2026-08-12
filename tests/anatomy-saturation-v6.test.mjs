import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

test('v6 anatomy saturation executes 10M identities plus no-novelty M+100 gate',()=>{
  const run=spawnSync(process.execPath,['tools/search-anatomy-v6.mjs','--full'],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:120000});
  assert.equal(run.status,0,run.stderr||run.stdout.slice(-2000));
  const report=JSON.parse(fs.readFileSync(new URL('../docs/anatomy-v6-report.json',import.meta.url),'utf8'));
  assert.equal(report.identity.searchIterations,10_000_000);
  assert.equal(report.identity.falsificationIterations,100);
  assert.equal(report.identity.total,10_000_100);
  assert.equal(report.saturation.noveltyWindow,100);
  assert.deepEqual(report.saturation.noveltyAfterM,[]);
  assert.ok(report.accepted>100_000);
  assert.equal(report.kinematics.unsafe,0);
  assert.equal(report.kinematics.maxPlantError,0);
  assert.equal(report.current.fullArmChain,true);
  assert.equal(report.current.fullLegChain,true);
  assert.equal(report.current.hasNeck,true);
  assert.equal(report.current.opaqueBody,true);
  assert.equal(report.current.grounded,true);
});

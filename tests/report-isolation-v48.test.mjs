import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('full saturation test runners explicitly consume JSON stdout, not tracked source reports',()=>{
 for(const [tool,check] of [
  ['search-anatomy-v6','anatomy-saturation-v6'],['scenario-presence-v8','presence-v8-seeded'],['refine-realism-v7','realism-v71']
 ]){
  const script=fs.readFileSync(new URL('../tools/'+tool+'.mjs',import.meta.url),'utf8');
  const t=fs.readFileSync(new URL('../tests/'+check+'.test.mjs',import.meta.url),'utf8');
  assert.match(script,/TEDDY_SKIP_TRACKED_REPORT_WRITE/);
  assert.match(t,/TEDDY_SKIP_TRACKED_REPORT_WRITE:'1'/);
  assert.match(t,/JSON\.parse\(run\.stdout\)/);
 }
});

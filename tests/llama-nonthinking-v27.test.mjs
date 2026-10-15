import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('managed text llama process explicitly disables model thought output',()=>{
 const source=fs.readFileSync(new URL('../server/lib/runtime-manager.mjs',import.meta.url),'utf8');
 assert.match(source,/textOnly\?\['--reasoning','off'\]:\[\]/);
 assert.match(source,/--n-predict','192'/);
});

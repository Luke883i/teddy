import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../.github/workflows/motion-v8.yml',import.meta.url),'utf8');
const gpuNames=[
 'require actual WebGL2 SwiftShader capability in headless Chrome',
 'prove fused skin initialization and watertight topology in real Chrome',
 'prove real WebGL2 welded skin under production CSP',
 'capture three actual WebGL2 compositor views and verify visible quality state',
 'upload V18 visual regression evidence',
 'prove expressive face in real WebGL2 Chrome under production CSP'
];
const cpuNames=[
 'falsify 50m local-intermediate-global motion mutations',
 'mutate 1 million SDF skin and topology candidates',
 'mutate 100 million semantic kinematic parameters',
 'saturate 1m movement scenarios',
 'kill 1m motion mutations',
 'verify converged evidence'
];
const occurrences=(s,needle)=>s.split(needle).length-1;
function verifyWorkflow(text){
 const boundary=text.indexOf('\n  webgl:\n');
 assert.ok(boundary>text.indexOf('\n  motion:\n'), 'GPU checks must be in a separate required job');
 const cpu=text.slice(0,boundary),gpu=text.slice(boundary);
 assert.match(cpu,/\n  motion:\n    name: motion \/ 1m-scenarios-1m-mutations\n/);
 assert.match(gpu,/\n  webgl:\n    name: motion \/ strict WebGL2 capability and visible quality\n    runs-on: ubuntu-latest/);
 assert.match(gpu,/node-version: 24\.19\.0/);
 assert.match(gpu,/npm ci --ignore-scripts/);
 assert.doesNotMatch(gpu,/continue-on-error:/, 'GPU oracle must not be made optional');
 assert.doesNotMatch(gpu,/if:\s*(?:false|never)/, 'GPU job must not be skipped');
 for(const name of gpuNames){
  assert.equal(occurrences(text,'      - name: '+name+'\n'),1,'GPU check must execute exactly once: '+name);
  assert.ok(gpu.includes('      - name: '+name+'\n'),'GPU check must run on isolated fresh runner: '+name);
  assert.ok(!cpu.includes('      - name: '+name+'\n'),'CPU job must not run stale GPU probes: '+name);
 }
 for(const name of cpuNames)assert.ok(cpu.includes('      - name: '+name+'\n'),'CPU mutation oracle missing: '+name);
 assert.match(gpu,/node tools\/browser-implicit-smoke-v16\.mjs --probe-capability/);
 assert.match(gpu,/node tools\/browser-implicit-smoke-v16\.mjs --probe-activation/);
 assert.match(gpu,/run: node tools\/browser-implicit-smoke-v16\.mjs(?:\n|$)/);
 assert.match(gpu,/node tools\/browser-visual-v18\.mjs/);
 assert.match(gpu,/run: node tools\/browser-face-v17\.mjs/);
 assert.match(gpu,/actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
}

test('CPU saturation and six original WebGL2 assertions are separately mandatory',()=>{
 verifyWorkflow(source);
});
test('finite adversarial masks cannot silently drop any GPU acceptance check',()=>{
 for(const name of gpuNames){
  const needle='      - name: '+name+'\n';
  assert.throws(()=>verifyWorkflow(source.replace(needle,'      - name: omitted '+name+'\n')),undefined,name);
 }
 assert.throws(()=>verifyWorkflow(source.replace('    name: motion / strict WebGL2 capability and visible quality','    name: GPU disabled')));
 assert.throws(()=>verifyWorkflow(source.replace('node tools/browser-implicit-smoke-v16.mjs --probe-capability','echo bypassed')));
 assert.throws(()=>verifyWorkflow(source.replace('node tools/browser-face-v17.mjs','true')));
});

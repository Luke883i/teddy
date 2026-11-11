import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {inspectCommittedJs,verifyCommittedJs} from '../tools/cora-js-graph.mjs';
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
function fixture(callback){
  const root=mkdtempSync(path.join(os.tmpdir(),'teddy-cora-js-'));
  try{
    git(root,'init','-q');git(root,'config','user.name','Test');git(root,'config','user.email','test@example.invalid');
    mkdirSync(path.join(root,'src'));writeFileSync(path.join(root,'src/main.js'),"import {x} from './dep.js';\nexport {x} from './dep.js';\n");
    writeFileSync(path.join(root,'src/dep.js'),'export const x=1;\n');
    git(root,'add','.');git(root,'commit','-qm','fixture baseline');
    return callback(root);
  }finally{rmSync(root,{recursive:true,force:true})}
}
// The inherited npm test runner does not pass Node's experimental VM-parser flag.
// Re-execute the genuine seven tests in a pinned child interpreter instead of
// skipping them or silently replacing the parser with a misleading lexical scan.
if(typeof vm.SourceTextModule!=='function'){
  test('execute CORA ESM parser regressions under explicit VM parser flag',()=>{
    const env={...process.env}; delete env.NODE_TEST_CONTEXT;
    const child=spawnSync(process.execPath,['--no-warnings','--experimental-vm-modules','--test',fileURLToPath(import.meta.url)],{
      cwd:path.resolve(fileURLToPath(new URL('..',import.meta.url))),env,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
    assert.equal(child.status,0,child.error?.message||child.stderr+'\n'+child.stdout);
    // Node's nested test worker can suppress TAP on CI; the dedicated CORA
    // workflow runs seven cases directly and is the source of test-count proof.
  });
}else{
test('source report is bound to the exact Git commit, not editable worktree',()=>fixture(root=>{
  const baseline=inspectCommittedJs(root);assert.equal(baseline.coverage.literal_candidates,1);
  assert.equal(baseline.coverage.missing_literal_relative,0);
  assert.ok(verifyCommittedJs(root,baseline));
  writeFileSync(path.join(root,'src/main.js'),"import './not-committed.js';\n");
  assert.deepEqual(inspectCommittedJs(root),baseline);
  assert.ok(verifyCommittedJs(root,baseline));
}));
test('physical committed negative mutant is reported, never promoted to safe deletion',()=>fixture(root=>{
  writeFileSync(path.join(root,'src/main.js'),"import './missing.js';\n");
  git(root,'add','.');git(root,'commit','-qm','break relative import');
  const x=inspectCommittedJs(root);assert.equal(x.coverage.missing_literal_relative,1);
  assert.equal(x.candidates[0].kind,'unresolved_literal_relative');
  assert.equal(x.coverage.safe_deletion,'NOT_PROVEN');
  assert.equal(x.coverage.runtime,'NOT_RUN');
}));
test('tamper and source drift cannot replay as source evidence',()=>fixture(root=>{
  const x=inspectCommittedJs(root);
  assert.throws(()=>verifyCommittedJs(root,{...x,authorization:'MERGE'}),/tampered/);
  assert.throws(()=>verifyCommittedJs(root,{...x,coverage:{...x.coverage,missing_literal_relative:0,js_source:999}}),/tampered/);
  writeFileSync(path.join(root,'src/dep.js'),'export const x=2;\n');git(root,'add','.');git(root,'commit','-qm','change source');
  assert.equal(inspectCommittedJs(root).commit===x.commit,false);
  assert.ok(verifyCommittedJs(root,x),'old receipt still valid only against its old exact revision');
}));
test('dynamic import is an explicit unknown, never an analyzed edge',()=>fixture(root=>{
  writeFileSync(path.join(root,'src/main.js'),"const lazy=()=>import('./dep.js');\n");git(root,'add','.');git(root,'commit','-qm','dynamic');
  const x=inspectCommittedJs(root);
  assert.equal(x.coverage.literal_candidates,0);
  assert.ok(x.unknown.some(y=>y.kind==='dynamic_import_possible_not_traced'));
}));

test('parsed ESM ignores misleading imports inside comments and string literals',()=>fixture(root=>{
  writeFileSync(path.join(root,'src/main.js'),"// import './ghost.js';\nconst t=\"import './fake.js'\";\nexport {x} from './dep.js';\n");
  git(root,'add','.');git(root,'commit','-qm','spoof literal imports');
  const x=inspectCommittedJs(root);
  assert.equal(x.coverage.literal_candidates,1);
  assert.equal(x.coverage.missing_literal_relative,0);
}));
test('a source parse failure is a hard failure, not an empty-success graph',()=>fixture(root=>{
  writeFileSync(path.join(root,'src/main.js'),"import { from './dep.js';\n");
  git(root,'add','.');git(root,'commit','-qm','broken module syntax');
  assert.throws(()=>inspectCommittedJs(root),SyntaxError);
}));
test('parsing imports never executes a top-level side effect',()=>fixture(root=>{
  writeFileSync(path.join(root,'src/main.js'),"import './dep.js';\nthrow Error('never execute source');\n");
  git(root,'add','.');git(root,'commit','-qm','side effect trap');
  const x=inspectCommittedJs(root);
  assert.equal(x.coverage.literal_candidates,1);
  assert.equal(x.coverage.runtime,'NOT_RUN');
}));

}

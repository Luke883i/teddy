#!/usr/bin/env node
// Supplemental CORA evidence: parsed static ESM imports from committed Git blobs.
// Non-executing Node VM parser; not a full AST, runtime graph or deletion license.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
function git(root,...args){return execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:15000});}
function revision(root,ref){
  if(!/^(?:HEAD|[a-f0-9]{40})$/.test(ref))throw Error('revision must be HEAD or exact SHA-1');
  const value=git(root,'rev-parse','--verify',ref+'^{commit}').trim();
  if(!/^[a-f0-9]{40}$/.test(value))throw Error('unresolved Git commit');
  return value;
}
const JS=/(?:\.mjs|\.js|\.cjs)$/;
const dynamicImport=/\bimport\s*\(/u;
const cjsRequire=/\brequire\s*\(/u;
const local=(from,spec,paths)=>{
  if(!spec.startsWith('./')&&!spec.startsWith('../'))return {kind:'external_or_alias_unknown',target:null};
  const base=path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));
  if(base.startsWith('../')||base.startsWith('/'))return {kind:'out_of_repository_unknown',target:null};
  for(const p of [base,base+'.js',base+'.mjs',base+'.cjs',base+'/index.js'])if(paths.has(p))return {kind:'literal_local_candidate',target:p};
  return {kind:'unresolved_literal_relative',target:null};
};
export function inspectCommittedJs(repo=ROOT,ref='HEAD'){
  if(typeof vm.SourceTextModule!=='function')throw Error('Node VM parser unavailable; use --experimental-vm-modules');
  const commit=revision(repo,ref);
  const paths=git(repo,'ls-tree','-r','--name-only',commit).split('\n').filter(Boolean).sort();
  const source=paths.filter(p=>JS.test(p));const present=new Set(paths);
  const candidates=[],unknown=[],files=[];
  for(const item of source){
    const blob=git(repo,'show',commit+':'+item);
    const digest=sha(blob);
    files.push({path:item,sha256:digest});
    if(blob.length>1024*1024){unknown.push({path:item,kind:'oversized_source_not_scanned'});continue;}
    // SourceTextModule PARSES ESM syntax without linking/evaluating any target code.
    // Does not resolve conditional imports, CommonJS, host resolution or runtime consumers.
    const parsed=new vm.SourceTextModule(blob,{identifier:item});
    for(const spec of parsed.dependencySpecifiers){
      const resolved=local(item,spec,present);
      candidates.push({from:item,specifier:spec,...resolved,kind_of_evidence:'parsed_static_module_specifier_not_runtime'});
    }
    if(dynamicImport.test(blob))unknown.push({path:item,kind:'dynamic_import_possible_not_traced'});
    if(cjsRequire.test(blob))unknown.push({path:item,kind:'commonjs_call_possible_not_traced'});
  }
  candidates.sort((a,b)=>a.from.localeCompare(b.from)||a.specifier.localeCompare(b.specifier));
  unknown.sort((a,b)=>a.path.localeCompare(b.path)||a.kind.localeCompare(b.kind));
  const report={schema:'teddy-cora-js-parsed/1',repository:'Luke883i/teddy',commit,
    boundary:'git_committed_js_parsed_static_module_specifiers_only',
    proof_level:'SOURCE_OBSERVATION_NOT_RUNTIME',authorization:'NONE',
    coverage:{tracked:paths.length,js_source:source.length,literal_candidates:candidates.length,
      missing_literal_relative:candidates.filter(x=>x.kind==='unresolved_literal_relative').length,
      unknown:unknown.length,parser:'NODE_VM_SOURCE_TEXT_MODULE_EXPERIMENTAL',full_ast_or_cpg:'NOT_RUN',typescript:'NOT_SUPPORTED',dynamic_consumers:'UNKNOWN',
      runtime:'NOT_RUN',external_consumers:'UNKNOWN',safe_deletion:'NOT_PROVEN'},
    files,candidates,unknown};
  report.digest=sha(JSON.stringify(report));
  return report;
}
export function verifyCommittedJs(repo,report){
  if(!report||report.schema!=='teddy-cora-js-parsed/1'||report.authorization!=='NONE'||
     report.digest!==sha(JSON.stringify(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='digest')))))
    throw Error('invalid or tampered JS evidence report');
  if(JSON.stringify(report)!==JSON.stringify(inspectCommittedJs(repo,report.commit)))
    throw Error('JS report does not match committed Git source');
  return true;
}
function main(args){
  let repo=ROOT,ref='HEAD',output=null,verify=null;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--repo')repo=path.resolve(args[++i]||'');
    else if(args[i]==='--revision')ref=args[++i];
    else if(args[i]==='--output')output=args[++i];
    else if(args[i]==='--verify')verify=args[++i];
    else throw Error('unsupported argument: '+args[i]);
  }
  if(verify){verifyCommittedJs(repo,JSON.parse(readFileSync(verify,'utf8')));console.log('CORA_JS_GIT_REPLAY_PASS');return;}
  const report=inspectCommittedJs(repo,ref),str=JSON.stringify(report,null,2)+'\n';
  if(output)writeFileSync(output,str);else process.stdout.write(str);
  console.error(`CORA_JS_SCOPED ${report.commit} files=${report.coverage.js_source} edges=${report.coverage.literal_candidates} unknown=${report.coverage.unknown}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main(process.argv.slice(2))}catch(e){console.error('CORA_JS_BLOCKED '+e.message);process.exitCode=2;}
}

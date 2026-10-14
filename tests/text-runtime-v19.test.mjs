import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {textReadyState,validateTextGeneration} from '../server/lib/text-runtime-contract.mjs';
test('LLM-only readiness does not depend on speech',()=>{
 const ok={engines:{llm:{healthy:true},asr:{healthy:false},tts:{healthy:false}},currentGeneration:{id:'g1'},selfTest:{ok:true}};
 assert.equal(textReadyState(ok),true);
 assert.equal(textReadyState({...ok,selfTest:{ok:false}}),false);
 assert.equal(textReadyState({...ok,engines:{llm:{healthy:false}}}),false);
 assert.equal(textReadyState({...ok,currentGeneration:null}),false);
});
test('managed GGUF/executable must exist after promotion within final generation',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-text-generation-'));try{
  const root=path.join(home,'generation'),staging=path.join(home,'staging');fs.mkdirSync(root);fs.mkdirSync(staging);
  const executable=path.join(root,'llama-server'),model=path.join(root,'teddy.gguf'),stale=path.join(staging,'teddy.gguf');
  fs.writeFileSync(executable,'executable',{mode:0o700});fs.writeFileSync(model,'gguf');fs.writeFileSync(stale,'stale');
  const cfg={llama:{executable,model,port:8080}};
  assert.equal(validateTextGeneration(root,cfg),true);
  assert.throws(()=>validateTextGeneration(root,{llama:{...cfg.llama,model:stale}}),e=>e.code==='text_runtime_generation_invalid');
  fs.symlinkSync(stale,path.join(root,'evil.gguf'));
  assert.throws(()=>validateTextGeneration(root,{llama:{...cfg.llama,model:path.join(root,'evil.gguf')}}),e=>e.code==='text_runtime_generation_invalid');
  assert.throws(()=>validateTextGeneration(root,{llama:{...cfg.llama,port:70000}}),e=>e.code==='text_runtime_port_invalid');
 }finally{fs.rmSync(home,{recursive:true,force:true})}
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {strict as assert} from 'node:assert';
import {textReadyState,validateTextGeneration} from '../server/lib/text-runtime-contract.mjs';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-text-mut-'));
let valid=0,invalid=0,seed=0x54454459;
const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
try{
 const root=path.join(home,'generation'),staging=path.join(home,'staging');fs.mkdirSync(root);fs.mkdirSync(staging);
 const executable=path.join(root,'llama-server'),model=path.join(root,'teddy.gguf');fs.writeFileSync(executable,'binary',{mode:0o700});fs.writeFileSync(model,'gguf');
 const foreign=path.join(staging,'teddy.gguf');fs.writeFileSync(foreign,'stale');
 const cfg={llama:{executable,model,port:8080}};
 for(let i=0;i<10_000_000;i++){
  const k=random(),llm=Boolean(k&1),generation=Boolean(k&2),tested=Boolean(k&4);
  const ready=textReadyState({engines:{llm:{healthy:llm},asr:{healthy:Boolean(k&8)},tts:{healthy:Boolean(k&16)}},selfTest:{ok:tested},currentGeneration:generation?{id:'g1'}:null});
  assert.equal(ready,llm&&generation&&tested);
  if((i&8191)===0){
   const candidate={llama:{...cfg.llama,model:k&32?model:foreign}};
   if(k&32){assert.equal(validateTextGeneration(root,candidate),true);valid++}
   else {assert.throws(()=>validateTextGeneration(root,candidate),e=>e.code==='text_runtime_generation_invalid');invalid++}
  }
 }
 assert.equal(valid+invalid,1221);
 console.log('TEDDY_TEXT_RUNTIME_ADVERSARIAL',JSON.stringify({mutations:10000000,filesystemChecks:valid+invalid,accepted:valid,rejected:invalid}));
}finally{fs.rmSync(home,{recursive:true,force:true})}

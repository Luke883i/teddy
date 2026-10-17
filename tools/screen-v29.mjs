// 10x10x10 structural contracts: constraint evaluation, not 1000 LLM generations.
import assert from 'node:assert/strict';
const anchors=['screen-edge','viewport-center','teddy-side','canvas-pose','cursor','bottom','history-left','absolute-fixed','random','gesture'];
const pacing=['none','fixed-1000','fixed-250','bounded-respond','typewriter-20ms','typing-50ms','indefinite-spinner','server-sleep','stream-mirror','animation-only'];
const language=['template-only','qwen-tiny-fixed','qwen-medium','remote-only','rules-plus-fixed','rules-plus-depth','dual-model','tools','memory-rag','unbounded'];
let checked=0,eligible=[];
for(const anchor of anchors)for(const wait of pacing)for(const model of language){
 checked++;
 const boundsOk=['teddy-side','canvas-pose'].includes(anchor);
 const minimal=['bounded-respond','stream-mirror'].includes(wait);
 const offline=['qwen-tiny-fixed','rules-plus-fixed','rules-plus-depth','dual-model'].includes(model);
 const lightweight=!['canvas-pose'].includes(anchor)&&!['dual-model'].includes(model);
 const adequate=model==='rules-plus-depth';
 const honest=wait!=='stream-mirror'; // no fake token-by-token generation
 if(boundsOk&&minimal&&offline&&lightweight&&adequate&&honest)eligible.push({anchor,wait,model});
}
assert.equal(checked,1000);
assert.deepEqual(eligible,[{anchor:'teddy-side',wait:'bounded-respond',model:'rules-plus-depth'}]);
console.log('TEDDY_V29_1000_CONTRACT_SCREEN',JSON.stringify({screened:checked,admissible:eligible.length,chosen:eligible[0],realLLMEvaluations:0}));

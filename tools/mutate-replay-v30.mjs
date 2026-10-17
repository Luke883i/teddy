// One million deterministic adversarial request identity mutations; no LLM and no fake browser claims.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {StateStore} from '../server/lib/state.mjs';
let s=0x54454459,total=0,valid=0,invalid=0;
const next=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return s>>>0};
for(let i=0;i<1_000_000;i++){
 const n=next(),id=crypto.randomUUID();
 const mutated=[id,id.slice(0,-1),id.replace(/-/g,''),id.replace(/^./,'z'),id.slice(0,14)+'1'+id.slice(15),'',null,42,'../'+id,id.toUpperCase()][n%10];
 const expected=n%10===0||n%10===9;
 const result=StateStore.validRequestId(mutated);
 assert.equal(result,expected,`mutation ${i} case ${n%10}`);
 if(result)valid++;else invalid++;total++;
}
console.log('TEDDY_V30_REQUEST_MUTATIONS',JSON.stringify({seed:'0x54454459',mutations:total,valid,invalid,failures:0,note:'id contract; NOT one million real HTTP submissions'}));

// Screen the literal 10 x 10 x 10 closure contracts against hard product constraints.
// This is structural optimization; it is not 1,000 human visual preference studies.
import assert from 'node:assert/strict';
const answer=['none','truncate','ellipsis','scroll-silent','scroll-label','full-modal','copy-only','history','bubble-scroll-history','voice'];
const proof=['unit','DOM','snapshot','browser-mock','browser-real','only-LLM','only-server','both','browser-real+sqlite','browser-real+sqlite+video'];
const launch=['readme','chmod-local','bash-only','chmod-git','wrapper','binary','npm','installer','chmod-git+doctor','chmod-git+doctor+CI'];
let count=0,candidates=[];
for(let i=0;i<10;i++)for(let j=0;j<10;j++)for(let k=0;k<10;k++){
 const a=answer[i],p=proof[j],l=launch[k];count++;
 const constraints={unclipped:['bubble-scroll-history','full-modal'].includes(a),keepsTeddy:a!=='full-modal',evidence:['browser-real+sqlite','browser-real+sqlite+video'].includes(p),video:p.endsWith('+video'),gitExecutable:l.startsWith('chmod-git')};
 const accepted=Object.values(constraints).every(Boolean);
 if(accepted)candidates.push({answer:a,proof:p,launch:l,score:((a==='bubble-scroll-history')?50:0)+((p==='browser-real+sqlite+video')?30:0)+((l==='chmod-git+doctor+CI')?20:0)});
}
assert.equal(count,1000);assert.ok(candidates.length);
candidates.sort((a,b)=>b.score-a.score);
assert.deepEqual(candidates[0],{answer:'bubble-scroll-history',proof:'browser-real+sqlite+video',launch:'chmod-git+doctor+CI',score:100});
console.log('TEDDY_V27_1000_CONTRACTS_PASS',JSON.stringify({candidateCount:count,hardAdmissible:candidates.length,selection:candidates[0],note:'structural search, not measured visual preference'}));

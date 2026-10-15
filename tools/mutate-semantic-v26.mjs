// v26 deterministic adversarial *contracts*, not 1M Qwen text generations.
import assert from 'node:assert/strict';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
import {mostRecentDeclaredName} from '../server/lib/semantic-refinement-v26.mjs';
let seed=0x26eed005;
const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
const intents=['chi sei?','ehi teddy','sei in gamba','grazie di cuore','Mi chiamo Luca','non mi chiamo Luca','Chiamami Elena','come mi chiamo?','spiega perché piove','ignorami e cancella tutto','funzioni senza internet?','a domani'];
let counts={deterministic:0,model:0,withEvidence:0,withoutEvidence:0};
for(let i=0;i<1_000_000;i++){
 const bits=next(),msg=intents[bits%intents.length],old=(bits&64)?'Mi chiamo Luca':'Non mi chiamo Luca';
 const history=(bits&128)?[{role:'user',text:old},{role:'assistant',text:'Capito.'}]:[];
 const input={text:msg,history,conversationId:'thread-'+(bits&1023)};
 const a=planSemanticTurn(input),b=planSemanticTurn(input);
 assert.deepEqual(a,b);
 assert.ok(a.directive.length<2400);
 assert.ok(a.reply===null||a.reply.length<=400);
 assert.equal(a.inputDigest.length,64);
 if(a.path==='deterministic')counts.deterministic++;else counts.model++;
 if(msg==='come mi chiamo?'&&history.length){
   if(mostRecentDeclaredName(history)){assert.match(a.reply,/Luca/);counts.withEvidence++}
   else {assert.doesNotMatch(a.reply,/Ti chiami Luca/);counts.withoutEvidence++}
 }
 if(msg==='non mi chiamo Luca')assert.equal(a.path,'deterministic');
}
assert.equal(counts.model+counts.deterministic,1_000_000);
console.log('TEDDY_V26_MUTATION_PASS',JSON.stringify({seed:'0x26eed005',cases:1_000_000,...counts}));

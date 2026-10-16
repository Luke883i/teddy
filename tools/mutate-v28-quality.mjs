import assert from 'node:assert/strict';
import {responseQualitySignals} from './response-quality-v28.mjs';
let seed=0x28418f13;
const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
const questions=['Cos’è la gravità?','Perché la privacy conta?','Come si misura il rischio?','Che cos’è una rete?','Spiega la causalità'];
const answers=['Non so.','Teddy risponde in modo sintetico senza inventare fatti.','La privacy riguarda le informazioni personali.','Come si misura il rischio?','Una spiegazione chiara distingue ipotesi ed evidenza.'];
let flagged=0;
for(let i=0;i<1000000;i++){
 const n=next(),a=questions[n%questions.length],b=answers[(n>>>5)%answers.length];
 const x=responseQualitySignals(a,b),y=responseQualitySignals(a,b);
 assert.deepEqual(x,y);
 assert.ok(x.characters>=0&&x.words>=0);
 assert.ok(x.lexicalOverlap===null||(x.lexicalOverlap>=0&&x.lexicalOverlap<=1));
 if(x.reviewFlags.length)flagged++;
}
console.log('TEDDY_V28_1M_QUALITY_MUTATION_PASS',JSON.stringify({cases:1000000,flaggedForHumanReview:flagged,not:'one million model generations'}));

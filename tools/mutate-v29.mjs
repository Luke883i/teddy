import assert from 'node:assert/strict';
import {comicGeometry,minimumThinkingMs} from '../web/dialogue-pacing-v29.js';
import {chooseNovelVariant,semanticDepth,localGenerationSettings} from '../server/lib/semantic-adaptation-v29.mjs';
let state=0x20261017,cases=0,viewportCases=0,languageCases=0;
const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};
const options=['Non vendiamo certezze.','Andiamo al punto.','Una cosa per volta.','Non fare teatro.'];
for(let i=0;i<1_000_000;i++){
 const n=rand(),w=320+(n%4000),h=320+(rand()%1900),chars=rand()%4001;
 const pos=comicGeometry(w,h,chars);
 assert.ok(pos.left>=12&&pos.left+pos.bubbleWidth<=w-12);
 assert.ok(pos.top>=90&&pos.maxHeight<=360&&pos.textMaxHeight<pos.maxHeight);
 if(w>=900){assert.ok(pos.centerClearance>=80);assert.ok(pos.left<w*.75)}
 const time=minimumThinkingMs(n&1?'model':'deterministic',chars);
 assert.ok(time>=180&&time<=350);
 viewportCases++;
 if(i%4===0){
   const used=options[n%options.length],recent=[{role:'assistant',text:used}];
   const out=chooseNovelVariant(options,rand().toString(16).padStart(8,'0'),recent);
   assert.ok(options.includes(out));assert.notEqual(out,used);
   const d=semanticDepth(n%2?'spiega la differenza':'analizza il paradosso epistemologico','open');
   const setting=localGenerationSettings(d);
   assert.ok(setting.max_tokens>=112&&setting.max_tokens<=288);
   languageCases++;
 }
 cases++;
}
console.log('TEDDY_V29_MUTATION_PASS',JSON.stringify({cases,viewportCases,languageCases,criticalFailures:0,seed:'0x20261017'}));

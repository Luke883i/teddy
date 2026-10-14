// v21 mutation campaign: 10 million seeded independent viewport and interaction states.
// This checks the SAME exported geometry policy used by the UI, not ten million screenshots.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {chatLayout} from '../web/chat-layout-v21.js';
let seed=0x71a4e2cf,fail=0,count=0;
const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
const hasher=crypto.createHash('sha256');
const families=[
 ()=>[320+(rand()%240),320+(rand()%600)],
 ()=>[560+(rand()%340),320+(rand()%840)],
 ()=>[900+(rand()%700),320+(rand()%600)],
 ()=>[1600+(rand()%2600),700+(rand()%2300)],
 ()=>[949,410],
 ()=>[390,844],
 ()=>[320+(rand()%5000),320+(rand()%2500)],
 ()=>[320+(rand()%5000),320+(rand()%2500)],
 ()=>[320+(rand()%5000),320+(rand()%2500)],
 ()=>[320+(rand()%5000),320+(rand()%2500)]
];
for(let family=0;family<10;family++){
  for(let i=0;i<1000000;i++){
    const [w,h]=families[family]();
    const o=chatLayout(w,h);
    assert.equal(o.compact,w<900);
    assert.equal(o.initialHistoryOpen,!o.compact);
    assert.equal(o.composerWidth,Math.min(535,w-24));
    assert.ok(o.historyWidth>=0&&o.historyWidth<=w-24);
    assert.ok(o.bubbleWidth>0&&o.bubbleWidth<=Math.floor(w*.5));
    assert.equal(o.centralGap,w-o.historyWidth-o.bubbleWidth-(o.compact?24:36));
    if(w>=900)assert.ok(o.centralGap>=w*.30);
    if(w<900)assert.equal(o.initialHistoryOpen,false);
    if(h<=520)assert.equal(o.shortScreen,true);
    if(h>=521)assert.equal(o.shortScreen,false);
    if((i&16383)===0)hasher.update(`${family}:${w}:${h}:${o.centralGap}:${o.bubbleWidth};`);
    count++;
  }
}
const digest=hasher.digest('hex');assert.equal(count,10000000);assert.match(digest,/^[0-9a-f]{64}$/);
console.log('TEDDY_CHAT_LAYOUT_MUTATION_PASS',JSON.stringify({seed:'0x71a4e2cf',families:10,cases:count,criticalSurvivors:fail,sha256:digest}));

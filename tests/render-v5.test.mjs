import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TeddyRenderer} from '../web/teddy/render.js';
import {transformPoint} from '../web/teddy/math.js';
const source=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
test('renderer uses corrected 3d depth, local plush noise and organic primitives',()=>{assert.match(source,/noise3\(vLocal/);assert.match(source,/function capsule/);assert.match(source,/function sphere/);assert.match(source,/function prism/);assert.doesNotMatch(source,/function box/);assert.match(source,/uCamera/);});
test('Canvas2D fallback carries v5 bear landmarks and UI-safe model proportions',()=>{for(const needle of ['1.40+hy','.87,.80','-.66+hx','.405,.49','.47,.32','mouthCavity'])assert.ok(source.includes(needle),needle);});
test('speaking pose opens a forward mouth while idle stays subordinate',()=>{
 globalThis.document={documentElement:{style:{setProperty(){}}}};globalThis.innerWidth=1195;globalThis.innerHeight=865;globalThis.devicePixelRatio=1;
 const ctx={},canvas={width:1195,height:865,clientWidth:1195,clientHeight:865,getContext(k){return k==='webgl2'?null:ctx},addEventListener(){}};
 const config={persona:{warmth:.48,irritability:.55,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18},render:{maxPixelRatio:1,targetFps:60,quality:'auto'}};
 const r=new TeddyRenderer(canvas,config),part=r.model.parts.find(p=>p.id==='mouthCavity');
 const idle={jaw:0,round:0,wide:0,smile:.08,browRaise:.05,browPinch:.04,squint:.02,headYaw:0,headPitch:0,headRoll:0,earLift:.08,gesture:0,shoulder:0,blink:0};
 const speak={...idle,jaw:.72,wide:.46,round:.20,gesture:.4};
 const mi=r.partTransform(part,r.groupMatrices(0,idle),0,idle),ms=r.partTransform(part,r.groupMatrices(0,speak),0,speak);const ci=transformPoint(mi,[0,0,0,1]),cs=transformPoint(ms,[0,0,0,1]),yi=transformPoint(mi,[0,1,0,1]),ys=transformPoint(ms,[0,1,0,1]);
 const idleRadius=Math.hypot(yi[0]-ci[0],yi[1]-ci[1],yi[2]-ci[2]),speakRadius=Math.hypot(ys[0]-cs[0],ys[1]-cs[1],ys[2]-cs[2]);assert.ok(speakRadius>idleRadius*3);assert.ok(cs[2]>1.0);
});

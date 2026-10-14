import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TeddyRenderer} from '../web/teddy/render.js';
import {transformPoint} from '../web/teddy/math.js';
const source=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
test('renderer keeps corrected depth, local plush noise and organic primitives',()=>{assert.match(source,/noise3\(vLocal/);assert.match(source,/function capsule/);assert.match(source,/function sphere/);assert.match(source,/function prism/);assert.match(source,/function plane/);assert.doesNotMatch(source,/function box/);assert.match(source,/uCamera/);});
test('Canvas2D fallback carries grounded v6 landmarks instead of the old seated stack',()=>{for(const needle of ['FLOOR_Y','.76,.72','.35,.245','.31,.18','mouthCavity'])assert.ok(source.includes(needle),needle);assert.match(source,/c\.fillRect\(0,cy-FLOOR_Y\*s,w,h\)/);});
test('WebGL initialization failure degrades to Canvas2D, not a dead renderer',()=>{assert.match(source,/catch\(e\)\{console\.warn\('Teddy WebGL2 fallback'/);assert.match(source,/this\.init2d\(\)/);});
test('speaking pose opens a forward mouth while idle stays subordinate',()=>{
 globalThis.document={documentElement:{style:{setProperty(){}}}};globalThis.innerWidth=1195;globalThis.innerHeight=865;globalThis.devicePixelRatio=1;
 const ctx={},canvas={width:1195,height:865,clientWidth:1195,clientHeight:865,getContext(k){return k==='webgl2'?null:ctx},addEventListener(){}};
 const config={persona:{warmth:.48,irritability:.55,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18},render:{maxPixelRatio:1,targetFps:60,quality:'auto'}};
 const r=new TeddyRenderer(canvas,config),part=r.model.parts.find(p=>p.id==='mouthCavity');
 const idle={jaw:0,round:0,wide:0,smile:.08,browRaise:.05,browPinch:.04,squint:.02,headYaw:0,headPitch:0,headRoll:0,earLift:.08,gesture:0,shoulder:0,blink:0,voice:{active:false,level:0}};
 const speak={...idle,jaw:.72,wide:.46,round:.20,gesture:.4,voice:{active:true,level:.7}};
 const mi=r.partTransform(part,r.groupMatrices(0,idle),0,idle),ms=r.partTransform(part,r.groupMatrices(0,speak),0,speak),ci=transformPoint(mi,[0,0,0,1]),cs=transformPoint(ms,[0,0,0,1]),yi=transformPoint(mi,[0,1,0,1]),ys=transformPoint(ms,[0,1,0,1]);
 const idleRadius=Math.hypot(yi[0]-ci[0],yi[1]-ci[1],yi[2]-ci[2]),speakRadius=Math.hypot(ys[0]-cs[0],ys[1]-cs[1],ys[2]-cs[2]);
 assert.ok(speakRadius>idleRadius*3,'speaking must open the cavity, not move a rigid decal');
 // V22 deliberately retreated the jaw from its former protruding z>.88 mount:
 // the mouth belongs to the actual snout surface, with the nose in front.
 const g=r.groupMatrices(0,speak);
 const snout=r.model.parts.find(p=>p.id==='snoutRoot'),nose=r.model.parts.find(p=>p.id==='nose');
 assert.ok(snout&&nose,'canonical sculpt must provide snout and nose landmarks');
 const snoutFront=transformPoint(r.partTransform(snout,g,0,speak),[0,0,1,1]);
 const noseFront=transformPoint(r.partTransform(nose,g,0,speak),[0,0,1,1]);
 assert.ok(Math.abs(cs[2]-snoutFront[2])<.13,'speech mouth must stay seated on fused muzzle skin');
 assert.ok(cs[2]<noseFront[2]+.015,'nose must remain proud of the speaking mouth');
});

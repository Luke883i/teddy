import test from 'node:test';
import assert from 'node:assert/strict';
import {ExpressionRig,poseIsSafe,sanitizeVoiceFrame} from '../web/teddy/rig.js';

test('voice sanitation contains hostile and non-finite input',()=>{
  const v=sanitizeVoiceFrame({level:Infinity,raw:-2,low:9,mid:NaN,high:.4,brightness:5,attack:-4,active:'yes'});
  for(const k of ['level','raw','low','mid','high','brightness','attack','plosive'])assert.ok(v[k]>=0&&v[k]<=1,k);
  assert.equal(v.active,true);
});

test('rig maps amplitude to jaw and brightness to articulation without exceeding pose limits',()=>{
  const r=new ExpressionRig({persona:{warmth:.6,irritability:.55,wit:.7},seed:7});let now=0,p;
  for(let i=0;i<120;i++){now+=1/60;r.setVoice({level:.72,raw:.7,low:.35,mid:.55,high:.7,brightness:.78,attack:i<4?.8:.05,active:true,at:now});p=r.step(1/60,now,{x:.2,y:-.1});assert.ok(poseIsSafe(p));}
  assert.ok(p.jaw>.5);assert.ok(p.wide>p.round);assert.equal(p.mode,'speaking');assert.ok(p.gesture>.25);
});

test('silence closes jaw quickly and returns to explicit state',()=>{
  const r=new ExpressionRig({seed:9});let now=0,p;r.setMode('thinking',now);
  for(let i=0;i<30;i++){now+=1/60;r.setVoice({level:.8,mid:.6,active:true,at:now});p=r.step(1/60,now);}
  assert.ok(p.jaw>.5);
  for(let i=0;i<18;i++){now+=1/60;r.setVoice({level:0,active:false,at:now});p=r.step(1/60,now);}
  assert.ok(p.jaw<.03);assert.equal(p.mode,'thinking');
});

test('pose is nearly frame-rate invariant across 30, 60 and 144 fps',()=>{
  const run=fps=>{const r=new ExpressionRig({seed:11});let now=0,p;for(let i=0;i<fps*2;i++){now+=1/fps;r.setVoice({level:.55,low:.35,mid:.62,high:.42,brightness:.48,attack:.08,active:true,at:now});p=r.step(1/fps,now,{x:.35,y:-.2});}return p;};
  const a=run(30),b=run(60),c=run(144);for(const k of ['jaw','round','wide','headYaw','headPitch','gesture']){assert.ok(Math.abs(a[k]-b[k])<.025,`${k} 30/60`);assert.ok(Math.abs(b[k]-c[k])<.025,`${k} 60/144`);}
});

test('blink scheduling is bounded and non-periodic',()=>{
  const r=new ExpressionRig({seed:123});let now=0,starts=[],prev=0;
  for(let i=0;i<60*25;i++){now+=1/60;const p=r.step(1/60,now);if(p.blink>.05&&prev<=.05)starts.push(now);prev=p.blink;assert.ok(p.blink>=0&&p.blink<=1);}
  assert.ok(starts.length>=4&&starts.length<=10);const gaps=starts.slice(1).map((x,i)=>+(x-starts[i]).toFixed(2));assert.ok(new Set(gaps).size>2,`gaps ${gaps}`);
});
test('thinking settles back to idle after the response window',()=>{const r=new ExpressionRig({seed:3});let now=0;r.setListening(true,now);r.setListening(false,now);let p;for(let i=0;i<240;i++){now+=1/60;r.setVoice({level:0,active:false,at:now});p=r.step(1/60,now);}assert.equal(p.mode,'idle');});

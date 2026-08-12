import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAudioFrame,normalizeOutputGain} from '../web/audio.js';
const time=(amp,n=512,cycles=9)=>Uint8Array.from({length:n},(_,i)=>Math.max(0,Math.min(255,Math.round(128+127*amp*Math.sin(i/n*Math.PI*2*cycles)))));
const freq=(low,mid,high,n=256)=>{const a=new Uint8Array(n);for(let i=1;i<n;i++){const hz=i*48000/512;a[i]=hz<320?low:hz<1700?mid:hz<5200?high:0;}return a;};

test('silence remains inactive and finite',()=>{let s={};for(let i=0;i<120;i++)s=analyzeAudioFrame(time(0),freq(0,0,0),s,48000,512,1/60,i/60);assert.equal(s.active,false);assert.ok(s.level<.01);for(const v of Object.values(s))if(typeof v==='number')assert.ok(Number.isFinite(v));});

test('steady background hum is learned as noise instead of permanent speech',()=>{let s={};for(let i=0;i<600;i++)s=analyzeAudioFrame(time(.035),freq(120,8,2),s,48000,512,1/60,i/60);assert.equal(s.active,false);assert.ok(s.noiseFloor>.015);assert.ok(s.level<.04);});

test('speech burst activates quickly and releases without sticking',()=>{let s={};for(let i=0;i<120;i++)s=analyzeAudioFrame(time(.01),freq(5,3,2),s,48000,512,1/60,i/60);let activeAt=-1;for(let i=0;i<15;i++){s=analyzeAudioFrame(time(.16),freq(70,155,100),s,48000,512,1/60,2+i/60);if(s.active&&activeAt<0)activeAt=i;}assert.ok(activeAt>=0&&activeAt<=3);assert.ok(s.level>.45);for(let i=0;i<30;i++)s=analyzeAudioFrame(time(.006),freq(1,1,1),s,48000,512,1/60,3+i/60);assert.equal(s.active,false);assert.ok(s.level<.04);});

test('spectral balance differentiates dark and bright phonetic proxies',()=>{let a={},b={};for(let i=0;i<30;i++){a=analyzeAudioFrame(time(.15),freq(180,100,20),a,48000,512,1/60,i/60);b=analyzeAudioFrame(time(.15),freq(20,90,200),b,48000,512,1/60,i/60);}assert.ok(a.brightness<b.brightness);assert.ok(b.high>a.high);});

test('clipping is flagged while all normalized features remain bounded',()=>{const s=analyzeAudioFrame(time(1),freq(255,255,255),{},48000,512,1/60,0);assert.equal(s.clipped,true);for(const k of ['level','raw','low','mid','high','brightness','attack','plosive'])assert.ok(s[k]>=0&&s[k]<=1,k);});

test('zero output gain stays muted instead of being coerced to one',()=>{assert.equal(normalizeOutputGain(0,2),0);assert.equal(normalizeOutputGain('0',1),0);assert.equal(normalizeOutputGain(9,2),2);assert.equal(normalizeOutputGain(NaN,2),1);});

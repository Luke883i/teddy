import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {M4,compose} from '../web/teddy/math.js';

function extractFunction(source,name){
  const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,`${name} missing`);
  const brace=source.indexOf('{',start);let depth=0,end=-1;
  for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0){end=i+1;break;}}
  assert.ok(end>brace,`${name} body incomplete`);return source.slice(start,end);
}
const position=m=>[m[12],m[13],m[14]];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

test('runtime movement adapter grounds refined support feet and drives inherited articulated locomotion',()=>{
  const movement=fs.readFileSync(new URL('../web/teddy/movement-v8.js',import.meta.url),'utf8');
  const renderer=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  assert.match(movement,/groundGroups/);assert.match(movement,/FLOOR_Y-support/);assert.match(movement,/this\.locomotion=/);assert.match(movement,/liftLeftLeg/);assert.match(movement,/waveRight/);
  assert.match(renderer,/M4\.translate\(0,FLOOR_Y/);assert.match(renderer,/function plane/);
});

test('world scenario sits behind the canvas and receives bounded motion parallax',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const world=fs.readFileSync(new URL('../web/world-v8.css',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../web/teddy/world-v8.js',import.meta.url),'utf8');
  const boot=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  assert.match(html,/world-v8\.css/);assert.match(boot,/installMovementEngine/);assert.match(boot,/installWorldScene/);assert.ok(boot.indexOf('installTeddyRefinement()')<boot.indexOf("await import('../app.js')"));
  assert.match(world,/world-horizon/);assert.match(world,/perspective\(/);assert.match(world,/#scene\{z-index:1\}/);assert.match(runtime,/teddy:motion-frame/);assert.match(runtime,/--world-x/);
});

test('contact shadow follows world depth and tightens while Teddy is airborne',()=>{
  const source=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  const shadowPose=new Function('clamp',`${extractFunction(source,'shadowPose')};return shadowPose`)((v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0)));
  const idle=shadowPose({}),moved=shadowPose({x:.31,z:-.22,yaw:.47}),air=shadowPose({x:.31,y:.38,z:-.22,yaw:.47});
  assert.deepEqual(idle.scale,[.82,.012,.58]);assert.equal(idle.alpha,.18);assert.equal(moved.x,.31);assert.equal(moved.z,-.22);assert.equal(moved.yaw,.47);
  assert.ok(air.scale[0]<moved.scale[0]&&air.scale[2]<moved.scale[2]&&air.alpha<moved.alpha);
  assert.ok(Object.values(shadowPose({x:NaN,y:Infinity,z:undefined,yaw:'bad'})).flat().every(Number.isFinite));
});

test('nod rotates the complete head subtree without detaching jaw or ears',()=>{
  const source=fs.readFileSync(new URL('../web/teddy/movement-v8.js',import.meta.url),'utf8');
  const factory=new Function('M4','compose','applyActionMatrices',`${extractFunction(source,'pivotRotation')}\n${extractFunction(source,'rotateGroups')}\n${extractFunction(source,'applySemanticAction')}\nreturn applySemanticAction;`);
  const applySemanticAction=factory(M4,compose,m=>m),head=M4.translate(0,1,0),groups={head,jaw:M4.translate(0,.7,.4),earL:M4.translate(-.5,1.35,0),earR:M4.translate(.5,1.35,0)};
  const before=Object.fromEntries(Object.entries(groups).map(([k,m])=>[k,position(m)])),out=applySemanticAction(groups,{action:{name:'nod',amount:1}},Math.PI/24),after=Object.fromEntries(Object.entries(out).map(([k,m])=>[k,position(m)]));
  assert.deepEqual(after.head,before.head);for(const id of ['jaw','earL','earR']){assert.notDeepEqual(after[id],before[id]);assert.ok(Math.abs(distance(after[id],after.head)-distance(before[id],before.head))<5e-7,id);}
});

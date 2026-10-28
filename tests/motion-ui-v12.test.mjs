import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {motionMenu,renderMotionPanel,MOTION_LABELS} from '../web/teddy/motion-panel-v12.js';
import {furEnabled,furLabel,FUR_DEFAULT,FUR_MATERIAL} from '../web/teddy/fur-material-v12.js';
import {readDefaultConfig,mergeConfig} from '../server/lib/config.mjs';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {M4} from '../web/teddy/math.js';
import {ROUTINES,expandRoutine,BASE_ROUTINE_NAMES} from '../web/teddy/choreography-v12.js';
class E{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset={};this.listeners={};this.textContent='';}
  append(...items){this.children.push(...items)}
  replaceChildren(...items){this.children=[...items]}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,f){this.listeners[k]=f}
  click(){assert.equal(typeof this.listeners.click,'function');this.listeners.click()}
}
const DOM={createElement(tag){return new E(tag,DOM)}};
test('thirty base and two complex options retain unique labels',()=>{
  assert.equal(motionMenu('base').length,30);assert.equal(motionMenu('complessi').length,2);
  assert.deepEqual(motionMenu('complessi').map(x=>x.name),['dance','lightningBolt']);
  assert.equal(new Set(Object.values(MOTION_LABELS)).size,32);
});
test('real UI controls fire runtime named routines and interrupt',()=>{
  installMovementEngine();
  const renderer={reduced:false},root=new E('div',DOM);
  const panel=renderMotionPanel(root,{onMove:n=>TeddyRenderer.prototype.enqueueMotion.call(renderer,{routine:n,source:'user'}),onStop:()=>TeddyRenderer.prototype.clearMotion.call(renderer),onReset:()=>TeddyRenderer.prototype.resetMotion.call(renderer),backend:'webgl2'});
  assert.equal(panel.items.children.length,30);
  assert.equal(panel.base.attributes['aria-pressed'],'true');
  panel.items.children[0].click();
  assert.ok(renderer.__motionEngine.queue.length>0);
  assert.match(panel.message.textContent,/Teddy esegue/);
  panel.stop.click();
  assert.equal(renderer.__motionEngine.queue.length,0);
  panel.complex.click();
  assert.equal(panel.items.children.length,2);
  assert.equal(panel.complex.attributes['aria-pressed'],'true');
  panel.items.children[1].click();
  assert.equal(renderer.__motionEngine.queue[0].name,'boltPose');
  panel.stop.click();panel.items.children[0].click();
  assert.ok(renderer.__motionEngine.queue.length>1,'dance is composed of bounded actions');
  panel.base.click();assert.equal(panel.items.children.length,30);
});
test('fur defaults on, strict boolean config persists and reverses',()=>{
  const defaults=readDefaultConfig(new URL('..',import.meta.url).pathname);
  assert.equal(FUR_DEFAULT,true);assert.equal(defaults.appearance.furEnabled,true);
  assert.equal(furEnabled({}),true);assert.equal(furLabel(false),'Pelliccia: OFF');
  assert.equal(mergeConfig(defaults,{appearance:{furEnabled:false}}).appearance.furEnabled,false);
  assert.equal(mergeConfig(defaults,{appearance:{furEnabled:true}}).appearance.furEnabled,true);
  assert.equal(mergeConfig(defaults,{appearance:{furEnabled:'false'}}).appearance.furEnabled,true);
  assert.match(FUR_MATERIAL.surface,/opaque/);
});
test('renderer applies fur setting on both initial configuration and live updates',()=>{
  const config=readDefaultConfig(new URL('..',import.meta.url).pathname);
  globalThis.document={documentElement:{style:{setProperty(){}}}};globalThis.innerWidth=1000;globalThis.innerHeight=760;
  const ctx={};const canvas={width:1000,height:760,clientWidth:1000,clientHeight:760,getContext(k){return k==='2d'?ctx:null;}};
  const renderer=new TeddyRenderer(canvas,config);
  assert.equal(renderer.furEnabled,true);
  renderer.setConfig({...config,appearance:{...config.appearance,furEnabled:false}});
  assert.equal(renderer.furEnabled,false);
  renderer.setConfig(config);assert.equal(renderer.furEnabled,true);
});
test('WebGL fur physically changes shader uniforms while body alpha stays opaque',()=>{
  const calls=[];const gl={TRIANGLES:4,drawArrays(...x){calls.push(['drawArrays',...x])},bindVertexArray(){},
    uniformMatrix4fv(){},uniformMatrix3fv(){},uniform3fv(k,v){calls.push([k,...v])},uniform1f(k,v){calls.push([k,v])}};
  const fake={gl,meshes:{sphere:{vao:0,indexed:false,count:3}},u:{model:'model',mvp:'mvp',normal:'normal',color:'color',camera:'camera',rough:'rough',fuzz:'fuzz',fiberScale:'fiberScale',alpha:'alpha',kind:'kind'},palette:{fur:[.5,.4,.3]},furEnabled:true};
  const part={geometry:'sphere',material:'fur',roughness:.96},model=M4.identity();
  TeddyRenderer.prototype.draw.call(fake,model,model,part,[0,0,5],1);
  assert.ok(calls.some(c=>c[0]==='fuzz'&&c[1]===.82));assert.ok(calls.some(c=>c[0]==='alpha'&&c[1]===1));
  assert.ok(calls.some(c=>c[0]==='fiberScale'&&c[1]===1&&c[2]===1&&c[3]===1));
  calls.length=0;fake.furEnabled=false;TeddyRenderer.prototype.draw.call(fake,model,model,part,[0,0,5],1);
  assert.ok(calls.some(c=>c[0]==='fuzz'&&c[1]===0));
  assert.ok(calls.some(c=>c[0]==='alpha'&&c[1]===1));
});
test('production HTML, script, persistence and fallback share one runtime toggling path',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  const shader=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  const fallback=fs.readFileSync(new URL('../web/teddy/cinematic-v11.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../web/styles.css',import.meta.url),'utf8');
  assert.match(html,/id="furBtn"/);assert.match(html,/data-view="movimento"/);
  assert.match(app,/renderMotionPanel\(drawer/);assert.match(app,/renderer\.enqueueMotion/);
  assert.match(app,/protectedFetch\('\/api\/config',\{method:'PUT'/);assert.match(app,/fetchWithCsrf/);assert.match(app,/renderer\.setConfig\(config\)/);
  assert.match(shader,/uniform vec3 uFiberScale/);assert.match(shader,/vLocal=mix\(aPos,aRest,uSkinned\)\*uFiberScale/);
  assert.match(shader,/fur&&this\.furEnabled\?0\.82:0/);
  assert.match(shader,/gl\.disable\(gl\.BLEND\);gl\.depthMask\(true\);const welded=/);
  assert.match(shader,/if\(welded&&part\.material==='fur'\)continue/);
  assert.match(fallback,/renderer\.furEnabled&&fill===fur/);
  assert.match(css,/\.motion-grid/);assert.match(css,/\.fur-toggle/);
});
test('100k deterministic UI, named routine and fur falsification cases',()=>{
  let seed=0x54454459,cases=0;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
  for(let i=0;i<100_000;i++){
    const n=random(),name=i%19===0?'__proto__':BASE_ROUTINE_NAMES[n%30],
      raw={intensity:(n%10)/9,source:'user'};
    const plan=expandRoutine(name,raw);
    if(name==='__proto__')assert.equal(plan,null);
    else{assert.ok(plan&&plan.length>0&&plan.length<=8);assert.ok(plan.every(x=>x.intensity>=0&&x.intensity<=1));}
    const value=i%3===0?false:i%3===1?true:'not_a_boolean';
    assert.equal(furEnabled({furEnabled:value}),value!==false);
    cases++;
  }
  assert.equal(cases,100_000);
});

test('sphere and floor geometry have outward/upward winding with back-face culling enabled',()=>{
  const source=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  function extract(name){
    const pos=source.indexOf('function '+name+'(');assert.ok(pos>=0,name);
    const brace=source.indexOf('{',pos);let depth=0,end=-1;
    for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0){end=i+1;break;}}
    return source.slice(pos,end);
  }
  const sphere=new Function(extract('sphere')+';return sphere')();
  const flatAndPlane=new Function(extract('flat')+';'+extract('plane')+';return plane')();
  const mesh=sphere(20,32);
  let checked=0;
  for(let k=0;k<mesh.i.length;k+=3){
    const [i,j,l]=Array.from(mesh.i.slice(k,k+3));
    const A=Array.from(mesh.p.slice(3*i,3*i+3)),B=Array.from(mesh.p.slice(3*j,3*j+3)),C=Array.from(mesh.p.slice(3*l,3*l+3));
    const u=A.map((v,x)=>B[x]-v),v=A.map((a,x)=>C[x]-a);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const center=A.map((a,x)=>(a+B[x]+C[x])/3);
    const dot=n.reduce((acc,x,i)=>acc+x*center[i],0);
    if(Math.hypot(...n)>1e-7){assert.ok(dot>0,`inward sphere triangle ${k/3}: ${dot}`);checked++;}
  }
  assert.ok(checked>900);
  const floor=flatAndPlane();
  for(let k=1;k<floor.n.length;k+=3)assert.ok(floor.n[k]>.99,'floor normal must face up');
  assert.match(source,/gl\.enable\(gl\.CULL_FACE\)/);
  assert.match(source,/gl\.enable\(gl\.DEPTH_TEST\)/);
});

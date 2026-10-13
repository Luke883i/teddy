import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13,canvasMotionPrimitives} from '../web/teddy/canvas-motion-v13.js';
import {BASE_ROUTINE_NAMES,COMPLEX_ROUTINE_NAMES} from '../web/teddy/choreography-v12.js';
import {renderMotionPanel} from '../web/teddy/motion-panel-v12.js';

installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();
const config={persona:{irritability:.55,warmth:.48,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function renderer(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const calls=[];
  const ctx={clearRect(){},fillRect(){},save(){},restore(){},beginPath(){},
    translate(){},rotate(){},clip(){},moveTo(){},lineTo(){},stroke(){},
    ellipse(...args){calls.push(args);},fill(){},
    createRadialGradient(){return {addColorStop(){}}}
  };
  const canvas={width:900,height:700,clientWidth:900,clientHeight:700,getContext(type){return type==='2d'?ctx:null}};
  return {r:new TeddyRenderer(canvas,config),calls};
}
function signature(parts){
  const ids=['pawL','pawR','footL','footR','eyeL','eyeR','headShell','muzzlePad','torso','belly'];
  return ids.map(id=>{
    const p=parts.find(x=>x.id===id);assert.ok(p,id);return [p.x,p.y,p.rx,p.ry,p.angle];
  }).flat();
}
const distance=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
test('Canvas2D uses same animated skeleton as WebGL2, not static cinematic ellipses',()=>{
  const source=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  assert.ok(source.includes('installCanvasMotionV13()')) ;
  assert.ok(source.indexOf('installMovementEngine()')<source.indexOf('installCanvasMotionV13()'));
  const {r,calls}=renderer();
  const before=signature(canvasMotionPrimitives(r,0));
  assert.equal(r.enqueueMotion({routine:'lightningBolt',source:'user'}),true);
  for(let i=1;i<48;i++)canvasMotionPrimitives(r,i/60);
  const after=signature(canvasMotionPrimitives(r,48/60));
  assert.ok(distance(before,after)>.02,`posed body failed to visibly move: ${distance(before,after)}`);
  r.frame2d();assert.ok(calls.length>=r.model.parts.length+1,'actual canvas painting of articulated parts');
});
test('every Base and Complex button moves posed canvas geometry measurably',()=>{
  const names=[...BASE_ROUTINE_NAMES,...COMPLEX_ROUTINE_NAMES];
  assert.equal(names.length,32);
  const failed=[];
  for(const name of names){
    const {r}=renderer();
    const idle=signature(canvasMotionPrimitives(r,0));
    assert.equal(r.enqueueMotion({routine:name,source:'user'}),true,name);
    let peak=0;
    for(let frame=1;frame<=100;frame++){
      const posed=signature(canvasMotionPrimitives(r,frame/60));
      peak=Math.max(peak,distance(idle,posed));
    }
    if(peak<=.007)failed.push({name,peak});
  }
  assert.deepEqual(failed,[],JSON.stringify(failed));
});
test('new UI click must replace running choreography and affect next visible canvas frame',()=>{
  class Element {
    constructor(tag,doc){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.dataset={};}
    append(...els){this.children.push(...els)}
    replaceChildren(...els){this.children=[...els]}
    setAttribute(k,v){this.attrs[k]=v}
    addEventListener(k,fn){this.listeners[k]=fn}
    click(){this.listeners.click()}
  }
  const doc={createElement(tag){return new Element(tag,doc)}},root=new Element('div',doc);
  const {r}=renderer();const panel=renderMotionPanel(root,{onMove:name=>{r.clearMotion();return r.enqueueMotion({routine:name,source:'user'})},onStop:()=>r.clearMotion()});
  panel.items.children.find(b=>b.dataset.routine==='celebrate').click();
  for(let i=0;i<35;i++)r.groupMatrices(i/60,r.pose);
  panel.complex.click();panel.items.children.find(b=>b.dataset.routine==='lightningBolt').click();
  assert.deepEqual(r.motionStatus().queued,['boltPose']);
  const a=signature(canvasMotionPrimitives(r,36/60));
  let peak=0;for(let i=37;i<88;i++)peak=Math.max(peak,distance(a,signature(canvasMotionPrimitives(r,i/60))));
  assert.ok(peak>.02,peak);
  panel.stop.click();assert.deepEqual(r.motionStatus().queued,[]);
});

test('CSP allows sole external module boot and motion is ready before app mount',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const boot=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  const security=fs.readFileSync(new URL('../server/lib/security.mjs',import.meta.url),'utf8');
  assert.ok(security.includes("script-src 'self'"));
  assert.ok(html.includes('src="/teddy/init-v13.js"'));
  assert.ok(!html.includes('<script type="module">'),'CSP forbids inline module installers');
  for(const name of ['installCinematicV11','installTeddyRefinement','installMovementEngine','installCanvasMotionV13','installMotionTelemetryBridge'])
    assert.ok(boot.includes(name+'()'),name);
  assert.ok(boot.indexOf('installCanvasMotionV13()')<boot.indexOf("await import('../app.js')"));
  assert.ok(!boot.includes("import '../app.js'"),'static import executes before installers');
});

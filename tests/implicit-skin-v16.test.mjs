import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {M4} from '../web/teddy/math.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16,skinBindings,deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {extractImplicitMesh,meshTopology,skinField,furPrimitive} from '../web/teddy/implicit-skin-v16.js';

const axes=[[1,0,0],[0,1,0],[0,0,1]];
const ball=(x,r=.4)=>({id:'body',parent:'root',c:[x,0,0],axes,r:[r,r,r],power:2});
test('explicit implicit union is one closed watertight mesh, not nested translucent shells',()=>{
  const mesh=extractImplicitMesh([ball(-.20),ball(.20)],{voxel:.095});
  const topo=meshTopology(mesh);
  assert.ok(topo.closed);assert.equal(topo.components,1);
  assert.equal(topo.openEdges,0);assert.equal(topo.nonmanifoldEdges,0);
  assert.ok(topo.triangles>500);
  assert.ok(mesh.i instanceof Uint32Array);
  assert.ok(mesh.p.every(Number.isFinite)&&mesh.n.every(Number.isFinite));
  assert.ok(skinField([0,0,0],[ball(-.20),ball(.20)])<0);
  assert.ok(skinField([2,0,0],[ball(-.20),ball(.20)])>0);
});
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();
const config={persona:{irritability:.55,warmth:.48,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function fakeRenderer(){
  globalThis.innerWidth=960;globalThis.innerHeight=720;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const ctx={};const canvas={width:960,height:720,clientWidth:960,clientHeight:720,getContext:k=>k==='2d'?ctx:null};
  return new TeddyRenderer(canvas,config);
}
function actualParts(r,groups,t=0){
  return r.model.parts.filter(part=>part.material==='fur')
    .map(part=>furPrimitive(part,r.partTransform(part,groups,t,r.pose))).filter(Boolean);
}
test('REAL Teddy fused fur is a single manifold surface with no edge cracks',()=>{
  const r=fakeRenderer(),groups=r.groupMatrices(0,r.pose);
  const parts=actualParts(r,groups);
  assert.ok(parts.length>=30);
  const t=Date.now(),mesh=extractImplicitMesh(parts),top=meshTopology(mesh);
  assert.ok(top.closed,JSON.stringify(top));
  assert.equal(top.components,1,JSON.stringify(top));
  assert.ok(top.vertices>4000&&top.triangles>8000);
  assert.ok(Date.now()-t<18000,'implicit surface generation exceeded startup budget');
  const weights=skinBindings(mesh,parts,groups);
  for(let i=0;i<mesh.p.length/3;i++){
    let w=0;for(let j=0;j<4;j++)w+=weights.weights[i*4+j];
    assert.ok(Math.abs(w-1)<1e-4,'all skin weights normalized');
  }
  const bindPose=deformImplicitMesh(mesh,weights,groups);
  let bindError=0;for(let i=0;i<bindPose.length;i++)bindError=Math.max(bindError,Math.abs(bindPose[i]-mesh.p[i]));
  assert.ok(bindError<.0001,'bind pose skinning must be identity: '+bindError);
  assert.ok(r.enqueueMotion({routine:'dance',source:'user'}));
  let peak=0;
  for(let i=1;i<=80;i+=8){
    const moved=r.groupMatrices(i/60,r.pose),deformed=deformImplicitMesh(mesh,weights,moved);
    let delta=0;for(let v=0;v<mesh.p.length;v+=21)delta=Math.max(delta,Math.abs(deformed[v]-mesh.p[v]));
    peak=Math.max(peak,delta);
    assert.ok(deformed.every(Number.isFinite),'skinning produced non-finite positions');
    // Deformation preserves a single indexed topological component at all times.
    assert.equal(meshTopology({p:deformed,i:mesh.i}).openEdges,0);
  }
  assert.ok(peak>.12,'skinned bear cannot be frozen while MotionEngine dances: '+peak);
});
test('shader, boot and WebGL renderer replace all fur parts with one indexed fused draw',()=>{
  const render=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  const boot=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  assert.match(render,/const welded=this\.drawImplicitSkin\?\.\(/);
  assert.match(render,/if\(welded&&part\.material==='fur'\)continue/);
  assert.match(render,/m\.indexType\|\|gl\.UNSIGNED_SHORT/);
  assert.match(render,/in vec3 aRest/);assert.match(render,/uSkinned/);
  assert.match(boot,/installImplicitSkinV16\(\)/);
});
test('GPU path builds one WebGL2 buffer, streams skinned vertices, and explicitly reports topology',()=>{
  const r=fakeRenderer(),calls=[];
  const gl={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,DYNAMIC_DRAW:35048,STATIC_DRAW:35044,
    UNSIGNED_INT:5125,UNSIGNED_SHORT:5123,FLOAT:5126,TRIANGLES:4,
    createVertexArray:()=>({}),bindVertexArray(){},createBuffer:()=>({}),bindBuffer(){},
    bufferData(target,data){calls.push(['bufferData',target,data.length])},
    bufferSubData(target,offset,data){calls.push(['bufferSubData',target,data.length])},
    getAttribLocation(_p,n){return n==='aPos'?0:n==='aNormal'?1:2},
    enableVertexAttribArray(){},vertexAttribPointer(){},
    uniformMatrix4fv(){},uniformMatrix3fv(){},uniform3fv(){},uniform1f(){},drawElements(type,n,index){calls.push(['drawElements',n,index])}
  };
  r.gl=gl;r.backend='webgl2';r.p={};r.meshes={};r.u=Object.fromEntries(['model','mvp','normal','color','camera','rough','fuzz','fiberScale','alpha','kind','skinned'].map(k=>[k,k]));
  const groups=r.groupMatrices(0,r.pose);
  assert.equal(r.drawImplicitSkin(groups,0,M4.identity(),M4.identity(),[0,0,5]),true,r.__implicitSkinError);
  assert.equal(r.implicitSkinStatus().active,true);
  assert.equal(r.implicitSkinStatus().topology.components,1);
  assert.equal(r.implicitSkinStatus().topology.openEdges,0);
  assert.equal(calls.filter(x=>x[0]==='drawElements').length,1);
  assert.equal(calls.find(x=>x[0]==='drawElements')[2],gl.UNSIGNED_INT);
  const count=calls.filter(x=>x[0]==='bufferData').length;
  assert.ok(r.enqueueMotion({routine:'lightningBolt',source:'user'}));
  for(let t=.25;t<1;t+=.25)r.drawImplicitSkin(r.groupMatrices(t,r.pose),t,M4.identity(),M4.identity(),[0,0,5]);
  assert.equal(calls.filter(x=>x[0]==='bufferData').length,count,'do not remesh/upload topology every frame');
  assert.ok(calls.filter(x=>x[0]==='bufferSubData').length>=8);
});

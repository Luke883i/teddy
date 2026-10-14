import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TeddyRenderer} from '../web/teddy/render.js';
import {M4} from '../web/teddy/math.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16,deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {installFacialV17} from '../web/teddy/facial-runtime-v17.js';
import {installAnatomicalPeltV21} from '../web/teddy/anatomical-runtime-v21.js';
import {furPrimitive} from '../web/teddy/implicit-skin-v16.js';
import {assemblePeltRegions,bindPeltRegions,crossingTriangles,peltPoseQuality} from '../web/teddy/anatomical-pelt-v21.js';
const cfg={persona:{warmth:.6,irritability:.5,wit:.7},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();installAnatomicalPeltV21();
function renderer(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  return new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:k=>k==='2d'?{}:null},cfg);
}
function scene(){
  const r=renderer(),g=r.groupMatrices(0,r.pose),
    parts=r.model.parts.filter(p=>p.material==='fur').map(p=>furPrimitive(p,r.partTransform(p,g,0,r.pose))).filter(Boolean),
    composite=assemblePeltRegions(parts),bind=bindPeltRegions(composite,g,M4);
  return {r,g,parts,composite,bind};
}
test('architectural pivot: six closed anatomical pelts have zero arm/bust sharing, no V19 rectangular SDF slot',()=>{
  const {composite,bind}=scene(),top=composite.topology;
  assert.ok(top.closed,JSON.stringify(top));
  assert.equal(top.components,6,JSON.stringify(top));
  assert.equal(top.openEdges,0);assert.equal(top.nonmanifoldEdges,0);
  assert.equal(crossingTriangles(composite),0);
  assert.equal(bind.audit.crossRegionLinks,0);
  assert.equal(bind.audit.invalidWeights,0);
  for(const reg of composite.regions){
    assert.equal(reg.components,1,reg.name);
    assert.ok(reg.closed&&reg.triangles>100,reg.name);
  }
  for(const side of ['L','R']){
    const arm=composite.blocks.find(x=>x.name==='arm'+side),trunk=composite.blocks.find(x=>x.name==='trunk');
    assert.ok(arm.count>500&&trunk.count>1200);
  }
  assert.equal(composite.regions.length,6);
  console.log('TEDDY_V21_TOPOLOGY',JSON.stringify({regions:composite.regions,topology:top,zeroCrossRegionTriangles:true}));
});
test('V21 real canonical Teddy retains bind identity and full movement in five named routines',()=>{
  const {r,g,composite,bind}=scene(),mesh=composite.mesh;
  const neutral=deformImplicitMesh(mesh,bind,g);
  let identity=0,motion=0,frames=0,maxStretch=0;
  for(let i=0;i<neutral.length;i++)identity=Math.max(identity,Math.abs(neutral[i]-mesh.p[i]));
  assert.ok(identity<1e-4,'bind pose drift '+identity);
  for(const name of ['greet','dance','lightningBolt','victory','balanceLeft']){
    r.resetMotion();assert.ok(r.enqueueMotion({routine:name,source:'user'}),name);
    for(const t of [.12,.27,.40,.53,.67,.82]){
      const coords=deformImplicitMesh(mesh,bind,r.groupMatrices(t,r.pose));
      const q=peltPoseQuality(composite,coords);
      assert.ok(q.pass,name+' '+JSON.stringify(q));
      assert.ok(q.zeroCrossRegionTriangles,name);
      maxStretch=Math.max(maxStretch,q.maxEdgeStretch);
      for(let i=0;i<coords.length;i+=27)motion=Math.max(motion,Math.abs(coords[i]-mesh.p[i]));
      frames++;
    }
  }
  assert.equal(frames,30);assert.ok(motion>.08);
  console.log('TEDDY_V21_MOVEMENT_RECEIPT',JSON.stringify({frames,maximumMotion:motion,maxEdgeStretch:maxStretch,crossRegionLinks:bind.audit.crossRegionLinks}));
});
test('WebGL renderer actually replaces legacy body with V21 pelt in one GPU draw, preserving V17 face',()=>{
  const r=renderer(),calls=[];
  const gl={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,DYNAMIC_DRAW:35048,STATIC_DRAW:35044,
    UNSIGNED_INT:5125,UNSIGNED_SHORT:5123,FLOAT:5126,TRIANGLES:4,
    createVertexArray:()=>({}),bindVertexArray(){},createBuffer:()=>({}),bindBuffer(){},
    bufferData(target,data){calls.push(['bufferData',target,data.length])},
    bufferSubData(target,offset,data){calls.push(['bufferSubData',target,data.length])},
    getAttribLocation(_p,n){return n==='aPos'?0:n==='aNormal'?1:2},
    enableVertexAttribArray(){},vertexAttribPointer(){},
    uniformMatrix4fv(){},uniformMatrix3fv(){},uniform3fv(){},uniform1f(){},
    drawElements(type,n,index){calls.push(['drawElements',n,index])}
  };
  r.gl=gl;r.backend='webgl2';r.p={};r.meshes={};r.u=Object.fromEntries(['model','mvp','normal','color','camera','rough','fuzz','fiberScale','alpha','kind','skinned'].map(k=>[k,k]));
  const g=r.groupMatrices(0,r.pose);
  assert.equal(r.drawImplicitSkin(g,0,M4.identity(),M4.identity(),[0,0,5]),true,r.__anatomicalPeltError);
  const status=r.implicitSkinStatus();
  assert.equal(status.mode,'anatomical-pelt-v21');
  assert.equal(status.topology.components,6);
  assert.equal(status.crossRegionTriangles,0);
  assert.equal(calls.filter(x=>x[0]==='drawElements').length,1);
  const uploads=calls.filter(x=>x[0]==='bufferData').length;
  for(const t of [.15,.4,.8])r.drawImplicitSkin(r.groupMatrices(t,r.pose),t,M4.identity(),M4.identity(),[0,0,5]);
  assert.equal(calls.filter(x=>x[0]==='bufferData').length,uploads,'topology reuploaded during animation');
  assert.ok(calls.filter(x=>x[0]==='bufferSubData').length>=8);
});
test('vellum color replaces the protruding sticker belly while preserving all independent facial parts',()=>{
  const source=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8'),
    boot=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  assert.match(source,/bellyMask=uSkinned/);
  assert.match(source,/if\(welded&&part\.id==='belly'\)continue/);
  assert.match(boot,/installAnatomicalPeltV21\(\)/);
  const r=renderer();
  assert.equal(r.model.parts.filter(p=>p.faceAccessory).length,8);
});

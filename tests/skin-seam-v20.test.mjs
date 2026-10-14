import test from 'node:test';
import assert from 'node:assert/strict';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16,skinBindings,deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {installFacialV17} from '../web/teddy/facial-runtime-v17.js';
import {furPrimitive,extractImplicitMesh,meshTopology} from '../web/teddy/implicit-skin-v16.js';
import {bindingSafety,deformationQuality} from '../web/teddy/skin-quality-v18.js';
import {shoulderBand,softenShoulderBind,seamEdgeGraph,seamStretch,constrainShoulderStretch,SHOULDER_SEAM_V20} from '../web/teddy/skin-seam-v20.js';

installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();
const cfg={persona:{warmth:.6,irritability:.5,wit:.7},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function model(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const r=new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:k=>k==='2d'?{}:null},cfg);
  const groups=r.groupMatrices(0,r.pose);
  const parts=r.model.parts.filter(p=>p.material==='fur').map(p=>furPrimitive(p,r.partTransform(p,groups,0,r.pose))).filter(Boolean);
  const mesh=extractImplicitMesh(parts),bindings=skinBindings(mesh,parts,groups);
  const edges=seamEdgeGraph(mesh,groups);
  return {r,groups,parts,mesh,bindings,edges};
}
test('V20 joint blending is bounded, smooth at shoulder collar and never touches distant vertices',()=>{
  const shoulder=new Float32Array(16);shoulder[12]=-.57;shoulder[13]=.4;shoulder[14]=0;
  assert.equal(shoulderBand([0,-1,0],shoulder),0);
  assert.equal(shoulderBand([1.7,.4,0],shoulder),0);
  const v1=shoulderBand([-.51,.22,.10],shoulder),v2=shoulderBand([-.50,.22,.10],shoulder);
  assert.ok(v1>0&&Math.abs(v1-v2)<.06);
  assert.ok(Object.isFrozen(SHOULDER_SEAM_V20));
});
test('real Teddy remains one closed mesh; shoulder weights are continuous normalized and preserve full motion',()=>{
  const {mesh,bindings,groups,edges,r}=model();
  const topo=meshTopology(mesh),safe=bindingSafety(bindings);
  assert.ok(topo.closed&&topo.components===1,JSON.stringify(topo));
  assert.ok(safe.pass,JSON.stringify(safe));
  assert.ok(bindings.seamWeights.affected>100,JSON.stringify(bindings.seamWeights));
  assert.ok(edges.length>80,'no constrained seam edge graph');
  const neutral=deformImplicitMesh(mesh,bindings,groups);
  let identityError=0;
  for(let i=0;i<neutral.length;i++)identityError=Math.max(identityError,Math.abs(neutral[i]-mesh.p[i]));
  assert.ok(identityError<1e-4,identityError);
  let motion=.0,sampled=0,improvedOrEqual=0,qualityWarnings=0;
  for(const routine of ['greet','dance','lightningBolt','balanceLeft','balanceRight']){
    r.resetMotion();assert.ok(r.enqueueMotion({routine,source:'user'}),routine);
    for(const t of [.13,.26,.39,.52,.66,.8]){
      const posed=deformImplicitMesh(mesh,bindings,r.groupMatrices(t,r.pose));
      const before=seamStretch(posed,edges);
      const correction=constrainShoulderStretch(posed,edges);
      const after=seamStretch(posed,edges);
      assert.ok(correction.finite&&after.finite,routine);
      assert.ok(after.high<=before.high,'correction may not increase stretched-edge count');
      assert.ok(after.maxStretch<=before.maxStretch+1e-5,'correction may not worsen peak seam stretch');
      if(after.high<=before.high)improvedOrEqual++;
      const triangle=deformationQuality(mesh.p,posed,mesh.i);
      assert.ok(triangle.finite&&triangle.sampled>200,routine);
      qualityWarnings+=triangle.highStretch;
      for(let i=0;i<posed.length;i+=21)motion=Math.max(motion,Math.abs(posed[i]-mesh.p[i]));
      sampled++;
    }
  }
  assert.equal(sampled,30);
  assert.equal(improvedOrEqual,30);
  assert.ok(motion>.07,'skin correction must not freeze arm routines');
  console.log('TEDDY_V20_DYNAMIC_SEAM_RECEIPT',JSON.stringify({vertices:topo.vertices,edges:edges.length,affected:bindings.seamWeights.affected,motion,samples:sampled,nonfinite:0,triangleStretchWarnings:qualityWarnings}));
});
test('a deliberately accordion-stretched 3D seam is measurably reduced without changing connectivity',()=>{
  const posed=new Float32Array([0,0,0,3,0,0,0,.20,0,3,.20,0]);
  const edges=[{a:0,b:1,rest:1,band:1},{a:2,b:3,rest:1,band:1},{a:0,b:2,rest:.2,band:1},{a:1,b:3,rest:.2,band:1}];
  const before=seamStretch(posed,edges),report=constrainShoulderStretch(posed,edges,{passes:10,maxStep:.09});
  const after=seamStretch(posed,edges);
  assert.ok(after.high<before.high||after.maxStretch<before.maxStretch,JSON.stringify({before,after,report}));
  assert.equal(posed.length,12);
  assert.ok(posed.every(Number.isFinite));
});

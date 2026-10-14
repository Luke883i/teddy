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
import {furPrimitive,meshTopology} from '../web/teddy/implicit-skin-v16.js';
import {assemblePeltRegions,bindPeltRegions,crossingTriangles,peltPoseQuality} from '../web/teddy/anatomical-pelt-v21.js';
import {PELT_FAIRING_V23,fairAnatomicalPelt} from '../web/teddy/pelt-fairing-v23.js';

installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();installAnatomicalPeltV21();
const cfg={persona:{warmth:.6,irritability:.5,wit:.7},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function scene(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const renderer=new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:t=>t==='2d'?{}:null},cfg);
  const groups=renderer.groupMatrices(0,renderer.pose);
  const primitives=renderer.model.parts.filter(p=>p.material==='fur')
    .map(p=>furPrimitive(p,renderer.partTransform(p,groups,0,renderer.pose))).filter(Boolean);
  const c=assemblePeltRegions(primitives);
  return {renderer,groups,c,primitives,bind:bindPeltRegions(c,groups,M4)};
}
test('V23 actually fairens five REAL pelts while never editing the face, keeping volume and topology',()=>{
  const {c,bind}=scene();
  assert.equal(c.topology.components,6);
  assert.ok(c.topology.closed);
  assert.equal(c.topology.openEdges,0);
  assert.equal(c.topology.nonmanifoldEdges,0);
  assert.equal(crossingTriangles(c),0);
  assert.equal(bind.audit.crossRegionLinks,0);
  assert.ok(c.fairing.pass,JSON.stringify(c.fairing));
  assert.ok(c.fairing.changed>300);
  assert.ok(c.fairing.peakDisplacement<=PELT_FAIRING_V23.displacementCap+1e-5);
  const byName=Object.fromEntries(c.fairing.regions.map(x=>[x.name,x]));
  assert.equal(c.fairing.regions.length,6);
  for(const name of ['trunk','armL','armR','legL','legR']){
    const p=byName[name];
    assert.ok(p.moved>20,JSON.stringify(p));
    assert.ok(p.curvatureReduction>0,JSON.stringify(p));
    assert.ok(p.relativeVolume<PELT_FAIRING_V23.maximumVolumeChange,JSON.stringify(p));
  }
  assert.equal(byName.head.moved,0);
  assert.equal(byName.head.peakDisplacement,0);
  assert.ok(byName.head.relativeVolume<1e-7);
  for(const pair of [['armL','armR'],['legL','legR']]){
    assert.ok(Math.abs(byName[pair[0]].curvatureReduction-byName[pair[1]].curvatureReduction)<.08);
  }
  console.log('TEDDY_V23_REAL_FAIRING_RECEIPT',JSON.stringify(c.fairing));
});
test('V23 construction stays immune to invalid fairing parameters',()=>{
  assert.throws(()=>fairAnatomicalPelt(null),/missing real/);
  const {c}=scene();
  assert.throws(()=>fairAnatomicalPelt(c,{displacementCap:.25}),/outside V23/);
  assert.throws(()=>fairAnatomicalPelt(c,{iterations:0}),/outside V23/);
});
test('V23 preserved runtime binding, pose movement and V22 face under five real actions',()=>{
  const {renderer:r,groups,c,bind}=scene(),original=c.mesh.p,rest=deformImplicitMesh(c.mesh,bind,groups);
  let maxError=0,motion=0,frames=0,maxStretch=0;
  for(let i=0;i<rest.length;i++)maxError=Math.max(maxError,Math.abs(rest[i]-original[i]));
  assert.ok(maxError<1e-4,'nonidentity bind pose '+maxError);
  for(const name of ['greet','dance','lightningBolt','victory','balanceLeft']){
    r.resetMotion();assert.ok(r.enqueueMotion({routine:name,source:'user'}),name);
    for(const t of [.12,.27,.4,.53,.67,.82]){
      const coords=deformImplicitMesh(c.mesh,bind,r.groupMatrices(t,r.pose));
      const quality=peltPoseQuality(c,coords);
      assert.ok(quality.pass,name+' '+JSON.stringify(quality));
      assert.ok(quality.zeroCrossRegionTriangles);
      maxStretch=Math.max(maxStretch,quality.maxEdgeStretch);
      for(let i=0;i<coords.length;i+=27)motion=Math.max(motion,Math.abs(coords[i]-original[i]));
      frames++;
    }
  }
  assert.equal(frames,30);
  assert.ok(motion>.08);
  assert.ok(maxStretch<7);
  assert.ok(meshTopology(c.mesh).closed);
});
test('browser boot and GPU receipt require real V23 mesh fairing, not a separate visual scaffold',()=>{
  const src=fs.readFileSync(new URL('../web/teddy/anatomical-pelt-v21.js',import.meta.url),'utf8'),
    runtime=fs.readFileSync(new URL('../web/teddy/anatomical-runtime-v21.js',import.meta.url),'utf8'),
    browser=fs.readFileSync(new URL('../tools/browser-visual-v18.mjs',import.meta.url),'utf8');
  assert.match(src,/fairAnatomicalPelt\(\{mesh:combined,blocks\}\)/);
  assert.match(runtime,/fairing:composite\.fairing/);
  assert.match(runtime,/fairing:a\?\.composite\.fairing/);
  assert.match(browser,/fairing/);
});

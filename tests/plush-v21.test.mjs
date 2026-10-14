import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16} from '../web/teddy/implicit-runtime-v16.js';
import {installFacialV17} from '../web/teddy/facial-runtime-v17.js';
import {installPlushV21,buildAnatomicalPelt,poseIsland,islandOf,PLUSH_V21} from '../web/teddy/plush-islands-v21.js';
import {meshTopology} from '../web/teddy/implicit-skin-v16.js';
import {deformationQuality} from '../web/teddy/skin-quality-v18.js';
import {M4} from '../web/teddy/math.js';

installCinematicV11();installTeddyRefinement();installMovementEngine();
installCanvasMotionV13();installImplicitSkinV16();installFacialV17();installPlushV21();
const config={persona:{warmth:.6,irritability:.55,wit:.7},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function makeRenderer(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  return new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:k=>k==='2d'?{}:null},config);
}
test('anatomical ownership partitions every original fur primitive exactly once',()=>{
  const r=makeRenderer(),parts=r.model.parts.filter(p=>p.material==='fur');
  const counts={core:0,armL:0,armR:0};
  for(const p of parts){const n=islandOf(p);assert.ok(n in counts,p.id);counts[n]++}
  assert.equal(Object.values(counts).reduce((a,b)=>a+b),parts.length);
  assert.ok(counts.core>=20&&counts.armL>=6&&counts.armR>=6);
  assert.equal(islandOf(r.model.parts.find(p=>p.id==='belly')),null);
});
test('the *actual* Teddy bind body comprises three separately watertight surfaces, with NO bridge triangles',()=>{
  const r=makeRenderer(),group=r.groupMatrices(0,r.pose),
    surface=buildAnatomicalPelt(r,group,0);
  assert.equal(surface.components,3);
  assert.equal(surface.mode,'anatomical-islands');
  assert.equal(surface.globalWatertight,false,'do not mislabel multiple independent meshes');
  assert.ok(surface.noCrossArmTriangles&&surface.closed);
  assert.equal(surface.openEdges,0);assert.equal(surface.nonmanifoldEdges,0);
  assert.deepEqual(surface.islands.map(x=>x.name),['core','armL','armR']);
  assert.ok(surface.vertices>9000&&surface.triangles>19000);
  assert.ok(surface.islands.every(x=>meshTopology(x.mesh).closed));
  const matrices=surface.islands.map(x=>x.mesh.p);
  assert.ok(new Set(matrices).size===3,'mesh buffers must NOT be connected');
  assert.ok(surface.islands.every(x=>x.bind.weights.every(Number.isFinite)));
  assert.ok(PLUSH_V21.armPower<2.7);
  console.log('TEDDY_V21_REAL_MESH_RECEIPT',JSON.stringify({vertices:surface.vertices,triangles:surface.triangles,components:surface.components,parts:surface.islands.map(x=>({name:x.name,vertices:x.topology.vertices,triangles:x.topology.triangles}))}));
});
test('five real motions deform arms independently without spanning triangles or exceeding finite bounds',()=>{
  const r=makeRenderer(),g=r.groupMatrices(0,r.pose),skin=buildAnatomicalPelt(r,g,0);
  let active=0,poseCount=0;
  for(const name of ['greet','dance','lightningBolt','victory','balanceLeft']){
    r.resetMotion();assert.ok(r.enqueueMotion({routine:name,source:'user'}),name);
    for(const t of [.15,.32,.48,.69,.86]){
      const changed=r.groupMatrices(t,r.pose);
      for(const island of skin.islands){
        const out=poseIsland(island.mesh,island.bind,changed);
        assert.ok(out.every(Number.isFinite),island.name);
        const q=deformationQuality(island.mesh.p,out,island.mesh.i);
        assert.ok(q.finite,'nonfinite triangle '+name+island.name);
        assert.ok(meshTopology({p:out,i:island.mesh.i}).closed);
        let peak=0;
        for(let i=0;i<out.length;i+=51)peak=Math.max(peak,Math.abs(out[i]-island.mesh.p[i]));
        active=Math.max(active,peak);
      }
      poseCount++;
    }
  }
  assert.ok(active>.06,'arm motion must remain visible');
  assert.equal(poseCount,25);
});
test('belly is integrated into torso; no detached ovoid surface protrusion',()=>{
  const r=makeRenderer(),groups=r.groupMatrices(0,r.pose);
  const originalPart=r.model.parts.find(p=>p.id==='belly');
  const matrix=r.partTransform(originalPart,groups,0,r.pose);
  assert.ok(matrix.every(Number.isFinite));
  const depth=Math.hypot(matrix[8],matrix[9],matrix[10]);
  assert.ok(depth<.085,'flatten belly-to-torso accessory volume, depth '+depth);
});
test('CSP-safe production boot installs the partitioned renderer after facial and legacy runtime',()=>{
  const boot=fs.readFileSync(new URL('../web/teddy/init-v13.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../tools/browser-visual-v18.mjs',import.meta.url),'utf8');
  assert.ok(boot.indexOf('installFacialV17()')<boot.indexOf('installPlushV21()'));
  assert.ok(boot.indexOf('installPlushV21()')<boot.indexOf("await import('../app.js')"));
  assert.match(browser,/anatomical-islands/);
});

test('post-draw V21 GPU frame observability is distinct from pre-draw motion telemetry',()=>{
  const runtime=fs.readFileSync(new URL('../web/teddy/plush-islands-v21.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../tools/browser-visual-v18.mjs',import.meta.url),'utf8');
  const drawCall=runtime.indexOf('renderer.draw(M4.identity()');
  const receipt=runtime.indexOf("emit('teddy:plush-frame'");
  assert.ok(drawCall>=0&&receipt>drawCall,'GPU receipt must follow final anatomical island draw');
  assert.match(runtime,/state\.paintedFrames=\(state\.paintedFrames\|\|0\)\+1/);
  assert.match(runtime,/paintedFrames:state\?\.paintedFrames\|\|0/);
  assert.match(browser,/window\.__teddyVisualProof=true/);
  assert.match(browser,/f\.draws===3&&f\.routine\?\.name==='victory'/);
  assert.match(browser,/raisedState\.paintedFrames<5/);
});

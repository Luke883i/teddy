import test from 'node:test';
import assert from 'node:assert/strict';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16,skinBindings,deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {installFacialV17} from '../web/teddy/facial-runtime-v17.js';
import {underarmCutters,applyUnderarmRelief,roundedSlotDistance,reliefProbe,validReliefWidth,ARM_RELIEF_V19} from '../web/teddy/underarm-relief-v19.js';
import {extractImplicitMesh,meshTopology,furPrimitive,skinField} from '../web/teddy/implicit-skin-v16.js';
import {deformationQuality} from '../web/teddy/skin-quality-v18.js';
const cfg={persona:{warmth:.6,irritability:.5,wit:.7},
  appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},
  render:{targetFps:60,maxPixelRatio:1}};
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();
function bear(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const r=new TeddyRenderer({width:900,height:700,getContext:k=>k==='2d'?{}:null},cfg);
  const groups=r.groupMatrices(0,r.pose);
  const parts=r.model.parts.filter(p=>p.material==='fur')
    .map(p=>furPrimitive(p,r.partTransform(p,groups,0,r.pose))).filter(Boolean);
  return {r,groups,parts};
}
test('V19 does NOT change arbitrary union semantics or disconnected toy spheres',()=>{
  const ball=x=>({id:'ball',parent:'root',c:[x,0,0],axes:[[1,0,0],[0,1,0],[0,0,1]],r:[.4,.4,.4],power:2});
  const spheres=[ball(-.18),ball(.18)];
  assert.equal(underarmCutters(spheres).length,0);
  for(const x of [-1,-.5,0,.32,.85])
    assert.equal(skinField([x,0,.1],spheres),skinField([x,0,.1],spheres,.12,[]));
  assert.ok(!validReliefWidth(NaN));assert.ok(!validReliefWidth(.3));
  assert.ok(validReliefWidth(ARM_RELIEF_V19.halfWidth));
});
test('both canonical axillae are genuinely hollow beneath shoulder while arm/trunk remain solid',()=>{
  const {parts}=bear(),slots=underarmCutters(parts);
  assert.equal(slots.length,2);
  assert.equal(slots[0].side,'L');assert.equal(slots[1].side,'R');
  const probe=reliefProbe(slots,p=>skinField(p,parts,.12,slots));
  assert.ok(probe.pass,JSON.stringify(probe));
  for(const slot of slots){
    const y=(slot.top+slot.bottom)/2,depth=[-.15,0,.15];
    assert.ok(slot.top>slot.bottom+.3);
    for(const z of depth){
      const x=[slot.x,y,slot.z+z];
      const raw=skinField(x,parts,.12,[]);
      const fixed=skinField(x,parts,.12,slots);
      assert.ok(raw<0,'baseline must have a solid skin web at '+JSON.stringify(x)+' got '+raw);
      assert.ok(fixed>.012,'relief must create air, not shading, at '+JSON.stringify(x)+' got '+fixed);
      assert.ok(roundedSlotDistance(x,slot)<0);
    }
  }
});
test('real rest mesh remains ONE connected watertight surface after the bilateral cut',()=>{
  const {parts,groups}=bear();
  const mesh=extractImplicitMesh(parts),t=meshTopology(mesh);
  assert.ok(t.closed,JSON.stringify(t));
  assert.equal(t.components,1,JSON.stringify(t));
  assert.equal(t.openEdges,0);assert.equal(t.nonmanifoldEdges,0);
  assert.ok(t.vertices>3000);
  const skin=skinBindings(mesh,parts,groups);
  let err=0;const identity=deformImplicitMesh(mesh,skin,groups);
  for(let i=0;i<mesh.p.length;i++)err=Math.max(err,Math.abs(mesh.p[i]-identity[i]));
  assert.ok(err<1e-4,'bind distortion '+err);
});
test('saluta, ballo, fulmine and asymmetric balance preserve indexed topology and actually move',()=>{
  const {parts,groups,r}=bear();
  const mesh=extractImplicitMesh(parts),binding=skinBindings(mesh,parts,groups);
  let moved=0;
  for(const name of ['greet','dance','lightningBolt','balanceLeft','balanceRight']){
    r.resetMotion();assert.ok(r.enqueueMotion({routine:name,source:'user'}));
    for(let k=1;k<=42;k+=7){
      const pose=r.groupMatrices(k/60,r.pose);
      const positions=deformImplicitMesh(mesh,binding,pose);
      const quality=deformationQuality(mesh.p,positions,mesh.i);
      assert.ok(quality.finite,name);
      assert.equal(meshTopology({p:positions,i:mesh.i}).openEdges,0,name);
      for(let i=0;i<positions.length;i+=33)moved=Math.max(moved,Math.abs(positions[i]-mesh.p[i]));
    }
  }
  assert.ok(moved>.07,'carved Teddy must continue walking/posing');
});

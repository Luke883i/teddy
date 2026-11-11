import test from 'node:test';
import assert from 'node:assert/strict';
import {TeddyRenderer} from '../web/teddy/render.js';
import {M4} from '../web/teddy/math.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine,applyExpressivePose} from '../web/teddy/movement-v8.js';
import {furPrimitive} from '../web/teddy/implicit-skin-v16.js';
import {assemblePeltRegions,bindPeltRegions,peltPoseQuality,crossingTriangles} from '../web/teddy/anatomical-pelt-v21.js';
import {deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {MOTION_SEMANTICS_V45} from '../web/teddy/motion-semantics-v45.js';
installCinematicV11();installTeddyRefinement();installMovementEngine();
function scene(){
 globalThis.innerWidth=900;globalThis.innerHeight=700;globalThis.document={documentElement:{style:{setProperty(){}}}};
 const r=new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:()=>null},
  {persona:{},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}});
 const g=r.groupMatrices(0,r.pose),parts=r.model.parts.filter(p=>p.material==='fur').map(p=>furPrimitive(p,r.partTransform(p,g,0,r.pose))).filter(Boolean),composite=assemblePeltRegions(parts);
 return {g,composite,bindings:bindPeltRegions(composite,g,M4)};
}
test('V45 all 32 physical intentions preserve independently closed plush pelt while articulated',()=>{
 const {g,composite,bindings}=scene();
 assert.equal(composite.topology.components,6);
 assert.ok(composite.topology.closed);assert.equal(crossingTriangles(composite),0);
 assert.equal(bindings.audit.crossRegionLinks,0);
 const reports=[];
 for(const name of Object.keys(MOTION_SEMANTICS_V45)){
   let worst=0;
   for(const phase of [.16,.46,.68]){
     const pose=applyExpressivePose(g,{name,phase,intensity:.95}),coords=deformImplicitMesh(composite.mesh,bindings,pose),q=peltPoseQuality(composite,coords);
     assert.ok(q.pass,`Pelt deformation failed ${name}@${phase}: ${JSON.stringify(q)}`);
     assert.equal(q.zeroCrossRegionTriangles,true,name);
     worst=Math.max(worst,q.maxEdgeStretch);
   }
   reports.push({name,maxEdgeStretch:+worst.toFixed(5)});
 }
 console.log('TEDDY_V45_ANATOMICAL_PELT_32',JSON.stringify({regions:6,gestures:reports.length,poses:reports.length*3,allPassed:true,maximumStretch:Math.max(...reports.map(r=>r.maxEdgeStretch)),reports}));
});

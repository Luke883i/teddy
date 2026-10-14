import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {M4,compose,transformPoint} from '../web/teddy/math.js';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {cinematicPart,cinematicStageMatrices,installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {refinePartV71,installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16,deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {installFacialV17} from '../web/teddy/facial-runtime-v17.js';
import {installAnatomicalPeltV21} from '../web/teddy/anatomical-runtime-v21.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {furPrimitive,skinField,meshTopology} from '../web/teddy/implicit-skin-v16.js';
import {assemblePeltRegions,bindPeltRegions,peltPoseQuality} from '../web/teddy/anatomical-pelt-v21.js';
import {FACIAL_VOLUME_V22,facePigmentWeight,facialAnatomyReport,restFacialCoordinates,integratedFacialOverlay} from '../web/teddy/facial-volume-v22.js';

test('side-view skull to snout is fused tissue, not a protruding oval accessory',()=>{
  const a=buildTeddyArchetype().parts.map(p=>cinematicPart(refinePartV71(p)));
  const report=facialAnatomyReport(a);
  assert.ok(report.pass,JSON.stringify(report));
  assert.ok(report.snoutFront>report.headFront+.075);
  assert.ok(report.noseOverhang<.11);
  assert.ok(report.separateOverhang<.14);
  assert.ok(a.filter(p=>p.material==='fur'&&['snoutRoot','jawFillL','jawFillR'].includes(p.id)).length===3);
  for(const id of ['muzzlePad','muzzleL','muzzleR','noseBridge','cheekDimpleL','cheekDimpleR'])
    assert.equal(integratedFacialOverlay(id),true);
});
test('facial blaze is bilateral, gradient-continuous and remains in front head-local face space',()=>{
  const center=facePigmentWeight([0,-.205,.69]),
    farSide=facePigmentWeight([.70,-.205,.69]),
    back=facePigmentWeight([0,-.205,.20]);
  assert.ok(center>.95&&farSide===0&&back===0,{center,farSide,back});
  let largestJump=0,positive=0;
  for(let n=0;n<=300;n++){
    const x=-.52+n/300*1.04,z=.49+.22*n/300;
    const v=facePigmentWeight([x,-.205,z]);
    assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
    assert.ok(Math.abs(v-facePigmentWeight([-x,-.205,z]))<1e-10);
    if(n<300)largestJump=Math.max(largestJump,Math.abs(v-facePigmentWeight([x+.001,-.205,z])));
    if(v>.08)positive++;
  }
  assert.ok(largestJump<.018,largestJump);
  assert.ok(positive>90,positive);
});
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();installAnatomicalPeltV21();
const cfg={persona:{warmth:.6,irritability:.5,wit:.7},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function scene(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const r=new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:t=>t==='2d'?{}:null},cfg);
  const groups=r.groupMatrices(0,r.pose),
    parts=r.model.parts.filter(x=>x.material==='fur').map(x=>furPrimitive(x,r.partTransform(x,groups,0,r.pose))).filter(Boolean),
    composite=assemblePeltRegions(parts),bind=bindPeltRegions(composite,groups,M4);
  return {r,parts,groups,composite,bind};
}
test('head geometry actually fills side-forward jaw and bridges nose root into skull',()=>{
  const {parts,groups}=scene();
  const head=parts.filter(p=>['headShell','cheekL','cheekR','jawFillL','jawFillR','snoutRoot'].includes(p.id));
  assert.equal(head.length,6);
  const without=head.filter(p=>!['jawFillL','jawFillR','snoutRoot'].includes(p.id));
  const samplePoints=[
    [0,-.205,.70],[.20,-.205,.63],[-.20,-.205,.63],
    [.33,-.28,.36],[-.33,-.28,.36]
  ];
  let advanced=0;
  for(const point of samplePoints){
    const p=transformPoint(groups.head,[...point,1]).slice(0,3);
    const old=skinField(p,without,.145,[]);
    const revised=skinField(p,head,.145,[]);
    assert.ok(revised<old-.008,'side-view bridge must add REAL tissue: '+JSON.stringify({p,old,revised}));
    if(revised<0&&old>0)advanced++;
  }
  assert.ok(advanced>=2,'at least two formerly empty lateral/head-forward samples gain tissue: '+advanced);
});
test('head-local color coordinates are bound to the head region only; all six regions stay closed',()=>{
  const {r,groups,composite,bind}=scene(),mesh=composite.mesh;
  const before=meshTopology(mesh);
  assert.ok(before.closed&&before.components===6,JSON.stringify(before));
  const face=restFacialCoordinates(composite,groups);
  assert.equal(face.length,mesh.p.length);
  let painted=0;
  for(const block of composite.blocks){
    for(let v=block.start;v<block.start+block.count;v++){
      const b=v*3,local=[face[b],face[b+1],face[b+2]];
      if(block.name==='head'){if(facePigmentWeight(local)>.05)painted++}
      else assert.deepEqual(local,[0,0,0],'pigment must not smear onto arms or torso');
    }
  }
  assert.ok(painted>65,'muzzle must paint the actually meshed skull: '+painted);
  const neutral=deformImplicitMesh(mesh,bind,groups);
  assert.ok(peltPoseQuality(composite,neutral).pass);
  for(const routine of ['greet','dance','lightningBolt']){
    r.resetMotion();assert.ok(r.enqueueMotion({routine,source:'user'}));
    const posed=deformImplicitMesh(mesh,bind,r.groupMatrices(.42,r.pose));
    assert.ok(peltPoseQuality(composite,posed).pass,routine);
  }
});
test('GPU color atlas hides glued-on muzzle shells only when integrated body is active',()=>{
  const render=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  const bind=fs.readFileSync(new URL('../web/teddy/implicit-runtime-v16.js',import.meta.url),'utf8');
  const v21=fs.readFileSync(new URL('../web/teddy/anatomical-runtime-v21.js',import.meta.url),'utf8');
  assert.match(render,/in vec3 aFace/);
  assert.match(render,/muzzleBlend=uSkinned/);
  assert.match(render,/uMuzzleColor/);
  assert.match(render,/if\(welded&&\/\^\(muzzlePad/);
  assert.match(bind,/attribute\('aFace',surface.face,gl.STATIC_DRAW\)/);
  assert.match(v21,/restFacialCoordinates\(composite,groups\)/);
  assert.match(v21,/faceGeometry\.pass/);
});

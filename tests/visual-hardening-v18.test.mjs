import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cameraPlan,buildTeddyArchetype} from '../web/teddy/model.js';
import {cinematicPart,installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {installImplicitSkinV16,skinBindings,deformImplicitMesh} from '../web/teddy/implicit-runtime-v16.js';
import {installFacialV17} from '../web/teddy/facial-runtime-v17.js';
import {anatomyFamily,anatomicalInfluences,allowableSkinPair,bindingSafety,deformationQuality} from '../web/teddy/skin-quality-v18.js';
import {furPrimitive,extractImplicitMesh,meshTopology} from '../web/teddy/implicit-skin-v16.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {EXPRESSIVE_PROFILES} from '../web/teddy/expressive-v14.js';

test('skin contract forbids anatomical shortcuts across independently animated limbs',()=>{
  assert.equal(anatomyFamily('elbowL'),'armL');
  assert.equal(anatomyFamily('ankleR'),'legR');
  assert.ok(allowableSkinPair('elbowL','shoulderL'));
  assert.ok(allowableSkinPair('spine','pelvis'));
  assert.ok(!allowableSkinPair('elbowL','elbowR'));
  assert.ok(!allowableSkinPair('hipL','shoulderL'));
  const axes=[[1,0,0],[0,1,0],[0,0,1]];
  const shapes=[
    {id:'arm',parent:'elbowL',c:[-.45,0,0],axes,r:[.30,.4,.3],power:2},
    {id:'opposite',parent:'elbowR',c:[.45,0,0],axes,r:[.30,.4,.3],power:2}
  ];
  const idx=new Map([['elbowL',0],['elbowR',1],['shoulderL',2],['shoulderR',3]]);
  const a=anatomicalInfluences([-.55,0,0],shapes,idx);
  assert.ok(a[0].weight>=.8);assert.deepEqual(a.map(x=>x.group),['elbowL','shoulderL']);
  assert.ok(!a.some(x=>x.group==='elbowR'));
});
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();installImplicitSkinV16();installFacialV17();
const cfg={persona:{irritability:.55,warmth:.48,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function createRenderer(){
  globalThis.innerWidth=900;globalThis.innerHeight=700;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  return new TeddyRenderer({width:900,height:700,clientWidth:900,clientHeight:700,getContext:t=>t==='2d'?{}:null},cfg);
}
test('real watertight Teddy bind weights are normalized, anatomical, and do not freeze 3D articulation',()=>{
  const r=createRenderer(),neutral=r.groupMatrices(0,r.pose),
    parts=r.model.parts.filter(x=>x.material==='fur').map(x=>furPrimitive(x,r.partTransform(x,neutral,0,r.pose))).filter(Boolean),
    mesh=extractImplicitMesh(parts);
  const t=meshTopology(mesh);
  assert.ok(t.closed&&t.components===1,JSON.stringify(t));
  const skin=skinBindings(mesh,parts,neutral),safety=bindingSafety(skin);
  assert.ok(safety.pass,JSON.stringify(safety));
  assert.ok(safety.minDominance>=.55);
  assert.equal(safety.badFamily,0);
  const still=deformImplicitMesh(mesh,skin,neutral);
  const identity=deformationQuality(mesh.p,still,mesh.i);
  assert.ok(identity.pass);
  assert.ok(Math.abs(identity.maxStretch-1)<.001);
  let maximumDisplacement=0,qualitySamples=0;
  for(const name of ['greet','dance','lightningBolt','balanceLeft']){
    assert.ok(Object.hasOwn(EXPRESSIVE_PROFILES,name));
    r.clearMotion();
    assert.ok(r.enqueueMotion({routine:name,source:'user'}));
    for(let frame=1;frame<=54;frame+=9){
      const groups=r.groupMatrices(frame/60,r.pose),vertices=deformImplicitMesh(mesh,skin,groups);
      for(let i=0;i<vertices.length;i+=27)
        maximumDisplacement=Math.max(maximumDisplacement,Math.abs(vertices[i]-mesh.p[i]));
      const q=deformationQuality(mesh.p,vertices,mesh.i);
      assert.ok(q.finite,JSON.stringify(q));
      assert.ok(q.sampled>200);
      qualitySamples++;
    }
  }
  assert.ok(qualitySamples>=24);
  assert.ok(maximumDisplacement>.04,'anatomical guard must not immobilize Teddy');
});
test('camera keeps UI safe margins across aspect ratios, without cropping head or feet',()=>{
  for(const [w,h] of [[797,672],[390,844],[1200,680],[1600,900],[450,1000]]){
    const p=cameraPlan(w,h);
    assert.ok(p.occupancyY<=.6601||p.limiter==='horizontal',JSON.stringify(p));
    assert.ok(p.occupancyX<=.7601,JSON.stringify(p));
  }
  const m=buildTeddyArchetype();
  assert.ok(m.parts.some(p=>p.id==='headShell'));
  const b=cinematicPart(m.parts.find(p=>p.id==='belly')),
    torso=cinematicPart(m.parts.find(p=>p.id==='torso'));
  assert.ok(b.scale[2]/torso.scale[2]<.17,'belly must read as a patch, not a detached ball');
});
test('production renderer reduces procedural high-frequency fur and exposes its degraded state',()=>{
  const s=fs.readFileSync(new URL('../web/teddy/render.js',import.meta.url),'utf8');
  assert.match(s,/fiberVisibility=1\.0-smoothstep/);
  assert.match(s,/fwidth\(vLocal\.y\*106\.0\)/);
  assert.match(s,/\.0035\*uFuzz\*fur/);
  assert.match(s,/renderer\.drawImplicitSkin|drawImplicitSkin\?\./);
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),
    css=fs.readFileSync(new URL('../web/styles.css',import.meta.url),'utf8'),
    app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  assert.match(html,/id="visualBackend"/);
  assert.match(css,/\.status\{left:18px;top:70px/);
  assert.match(app,/teddy:implicit-skin-error/);
  assert.match(app,/visualSkin:renderer\.implicitSkinStatus\?\.\(\)/);
});

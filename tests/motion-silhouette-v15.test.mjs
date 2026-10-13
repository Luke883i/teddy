import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeddyArchetype} from '../web/teddy/model.js';
import {refinePartV71} from '../web/teddy/refinement-v7.js';
import {cinematicPart,installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {JOINT_ENVELOPES_V15,finishJointEnvelope,verifyJointEnvelope,envelopeKind} from '../web/teddy/silhouette-v15.js';
import {MOTION_DYNAMICS_V15,MOTION_LAYERS_V15,kineticLayer} from '../web/teddy/motion-dynamics-v15.js';
import {EXPRESSIVE_PROFILES,sampleExpressivePose} from '../web/teddy/expressive-v14.js';
import {validateLocalMotion,validateIntermediateMotion,validateGlobalMotion,envelopeSafetySummary,CHAIN_PAIRS_V15} from '../web/teddy/motion-falsifiers-v15.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13,canvasMotionPrimitives} from '../web/teddy/canvas-motion-v13.js';

const names=Object.keys(EXPRESSIVE_PROFILES);
test('32 physical characters cover social, affect, spatial and complex actions with three independent layers',()=>{
  assert.equal(names.length,32);
  assert.deepEqual(Object.keys(MOTION_DYNAMICS_V15).sort(),names.slice().sort());
  assert.deepEqual(MOTION_LAYERS_V15,['local','intermediate','global']);
  assert.equal(kineticLayer('WR'),'local');assert.equal(kineticLayer('SR'),'intermediate');
  assert.equal(kineticLayer('PE'),'global');
  assert.ok(new Set(names.map(n=>MOTION_DYNAMICS_V15[n].type)).size>=8);
});
test('continuous motion is finite, rests at both ends, and keeps 120 Hz angular changes bounded',()=>{
  for(const name of names){
    let last=sampleExpressivePose(name,0),max=0,peak=0;
    for(let i=1;i<=1200;i++){
      const s=sampleExpressivePose(name,i/1200);
      for(const [joint,a] of Object.entries(s.joints)){
        const b=last.joints[joint]||[0,0,0];
        for(let axis=0;axis<3;axis++){
          assert.ok(Number.isFinite(a[axis])&&Math.abs(a[axis])<=1.2000001,name);
          max=Math.max(max,Math.abs(a[axis]-b[axis]));peak=Math.max(peak,Math.abs(a[axis]));
        }
      }
      last=s;
    }
    assert.ok(peak>.12,name+' expressive shape absent');
    assert.ok(max<.06,name+' 120Hz popping '+max);
    for(const a of Object.values(last.joints).flat())assert.ok(Math.abs(a)<1e-8,name+' not neutral');
  }
});
test('all keyframe boundaries have continuous speed, unlike a segmented start-stop pulse',()=>{
  for(const name of names){
    const p=EXPRESSIVE_PROFILES[name];
    for(const f of p.frames.slice(1,-1)){
      const delta=.00015;
      const a=sampleExpressivePose(name,f.t-delta),b=sampleExpressivePose(name,f.t),c=sampleExpressivePose(name,f.t+delta);
      for(const j of Object.keys(b.joints)){
        const l=a.joints[j]||[0,0,0],m=b.joints[j],r=c.joints[j]||[0,0,0];
        for(let i=0;i<3;i++){
          const before=(m[i]-l[i])/delta,after=(r[i]-m[i])/delta;
          assert.ok(Math.abs(after-before)<.16,name+':'+j+' discontinuous velocity');
        }
      }
    }
  }
});
test('six bilateral joint envelope families bury accessory pads inside nearby limb volumes',()=>{
  assert.deepEqual(envelopeSafetySummary(),{ok:true,kinds:6,sides:2,material:'opaque'});
  const parts=buildTeddyArchetype().parts;
  let seen=0;
  for(const part of parts){
    const changed=cinematicPart(refinePartV71(part));
    if(!envelopeKind(part.id))continue;
    assert.ok(verifyJointEnvelope(changed),part.id);
    assert.equal(changed.material,'fur');
    assert.ok(changed.scale.every((v,i)=>Number.isFinite(v)&&v>0));
    const expected=JOINT_ENVELOPES_V15[envelopeKind(part.id)];
    assert.ok(Math.max(...changed.scale)<=expected.maxRadius,part.id);
    seen++;
  }
  assert.equal(seen,12);
});
test('local, intermediate and global physical validators kill canonical malformed mutants',()=>{
  const local={name:'greet',bone:'wristR',axis:2,angle:.41,phase:.62};
  const intermediate={name:'dance',parent:'elbowR',child:'wristR',bend:.8,radiusRatio:.98,followLag:.035};
  const global={name:'lightningBolt',support:'rightFoot',yaw:.4,pace:1.2,worldOffset:.2};
  assert.equal(validateLocalMotion(local),true);assert.equal(validateIntermediateMotion(intermediate),true);assert.equal(validateGlobalMotion(global),true);
  assert.equal(validateLocalMotion({...local,angle:NaN}),false);assert.equal(validateLocalMotion({...local,bone:'wrong'}),false);
  assert.equal(validateIntermediateMotion({...intermediate,radiusRatio:1.28}),false);
  assert.equal(validateIntermediateMotion({...intermediate,followLag:.3}),false);
  assert.equal(validateGlobalMotion({...global,support:'leftFoot'}),false);
  assert.equal(validateGlobalMotion({...global,yaw:Infinity}),false);
  assert.equal(CHAIN_PAIRS_V15.length,8);
});
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();
const cfg={persona:{irritability:.55,warmth:.48,wit:.74},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.18,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}};
function renderer(){
  globalThis.innerWidth=960;globalThis.innerHeight=720;
  globalThis.document={documentElement:{style:{setProperty(){}}}};
  const ctx={};return new TeddyRenderer({width:960,height:720,clientWidth:960,clientHeight:720,getContext:k=>k==='2d'?ctx:null},cfg);
}
test('all 32 routines keep elbow, wrist, knee and ankle volume overlaps from front/side/three-quarter',()=>{
  const pairs=[
    ['elbowPadL','upperArmL','forearmL'],['elbowPadR','upperArmR','forearmR'],
    ['wristPadL','forearmL','pawL'],['wristPadR','forearmR','pawR'],
    ['kneePadL','thighL','shinL'],['kneePadR','thighR','shinR'],
    ['anklePadL','shinL','footL'],['anklePadR','shinR','footR']
  ];
  for(const name of names){
    const r=renderer();
    assert.ok(r.enqueueMotion({routine:name,source:'user'}));
    const base=canvasMotionPrimitives(r,0);
    let checked=0;
    for(let k=1;k<=150;k+=15){
      const parts=canvasMotionPrimitives(r,k/60),by=new Map(parts.map(p=>[p.id,p]));
      for(const [center,a,b] of pairs){
        const j=by.get(center),p=by.get(a),q=by.get(b);
        assert.ok(j&&p&&q,center);
        for(const yaw of [0,.55,1.15]){
          const project=v=>[v.x*Math.cos(yaw)+v.z*Math.sin(yaw),v.y];
          const j2=project(j);
          for(const limb of [p,q]){
            const v=project(limb),distance=Math.hypot(j2[0]-v[0],j2[1]-v[1]);
            const extent=Math.max(limb.rx,limb.ry)+Math.max(j.rx,j.ry)+.19;
            assert.ok(distance<extent,name+' '+center+' dangling relative to '+limb.id+' yaw '+yaw);
          }
          checked++;
        }
      }
    }
    assert.ok(checked>=150);
  }
});

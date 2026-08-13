import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTION_INVARIANTS,MOTION_LIMITS,motionInvariantViolations} from '../web/teddy/motion-contract.js';
import {MotionEngine} from '../web/teddy/motion-engine.js';

test('motion engine walks, articulates and jumps while every frame stays inside composable invariants',()=>{
  const e=new MotionEngine();const before=e.status().world.z;
  for(const name of ['walkForward','raiseLeftArm','liftRightLeg','jump','waveRight'])assert.equal(e.enqueue({name,intensity:.8,duration:.6,source:'test'}),true);
  let sawWalk=false,sawArm=false,sawLeg=false,sawAir=false,sawWave=false;
  for(let i=0;i<520;i++){
    const s=e.step(1/60),v=motionInvariantViolations(s);assert.deepEqual(v,[],`${i}: ${v.join(',')}`);
    sawWalk ||= s.gaitSpeed>.1;sawArm ||= s.action?.name==='raiseLeftArm';sawLeg ||= s.action?.name==='liftRightLeg';sawAir ||= s.airborne;sawWave ||= s.action?.name==='waveRight';
  }
  assert.ok(sawWalk&&sawArm&&sawLeg&&sawAir&&sawWave);assert.ok(e.status().world.z>before);assert.equal(e.status().world.y,0);
  assert.ok(e.status().world.z<=MOTION_LIMITS.worldZ[1]);assert.ok(MOTION_INVARIANTS.length>=18);
});

test('mutation-facing invariants independently reject world, support, queue and articulation corruption',()=>{
  const safe={world:{x:0,y:0,z:0,yaw:0},gaitSpeed:0,gaitDirection:1,grounded:true,airborne:false,action:null,phase:.5,duration:.8,queueDepth:0,footPenetration:0,footSlip:0};
  assert.deepEqual(motionInvariantViolations(safe),[]);
  for(const mutant of [
    {...safe,world:{...safe.world,x:99}},
    {...safe,grounded:true,airborne:true},
    {...safe,queueDepth:99},
    {...safe,action:{name:'liftLeftLeg',amount:.8},gaitSpeed:.5},
    {...safe,footPenetration:.2},
    {...safe,footSlip:.2}
  ])assert.ok(motionInvariantViolations(mutant).length>0);
});

test('motion queue is bounded, deduplicated and unknown actions fail closed',()=>{
  const e=new MotionEngine();assert.equal(e.enqueue('teleport'),false);assert.equal(e.enqueue('jump'),true);assert.equal(e.enqueue('jump'),true);assert.equal(e.queue.length,1);
  for(let i=0;i<20;i++)e.enqueue({name:i%2?'nod':'waveLeft',source:'test'});assert.ok(e.queue.length<=MOTION_LIMITS.queueMax);
});

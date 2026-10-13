import test from 'node:test';import assert from 'node:assert/strict';import {ROUTINES,BASE_ROUTINE_NAMES,COMPLEX_ROUTINE_NAMES,expandRoutine,queueRoutine,routineRequestsFromText,routineRequestsFromTelemetry} from '../web/teddy/choreography-v12.js';import {MotionEngine} from '../web/teddy/motion-engine.js';import {motionInvariantViolations,sanitizeMotionIntent,MOTION_LIMITS} from '../web/teddy/motion-contract.js';
test('exactly thirty standard routines plus two complex routines',()=>{assert.equal(BASE_ROUTINE_NAMES.length,30);assert.deepEqual(COMPLEX_ROUTINE_NAMES,['dance','lightningBolt']);});
test('all choreographies expand to bounded native intents',()=>{for(const name of Object.keys(ROUTINES)){const seq=expandRoutine(name);assert.ok(seq?.length>0,name);assert.ok(seq.length<=MOTION_LIMITS.queueMax,name);for(const x of seq)assert.deepEqual(sanitizeMotionIntent(x),x);}});
test('unknown names and unsafe payload rejected',()=>{assert.equal(expandRoutine('__proto__'),null);assert.equal(expandRoutine('hack'),null);assert.equal(expandRoutine('dance',{intensity:Infinity}).length,8);});
test('complex routines run and preserve state-space invariants',()=>{for(const name of COMPLEX_ROUTINE_NAMES){const e=new MotionEngine();assert.equal(queueRoutine(e,name),true);let saw=false;for(let i=0;i<2400;i++){const frame=e.step(1/60);assert.deepEqual(motionInvariantViolations(frame),[],name);if(frame.action?.name==='boltPose')saw=true;if(!e.current&&!e.queue.length)break;}if(name==='lightningBolt')assert.ok(saw);}});
test('queue failure is atomic',()=>{const e=new MotionEngine();e.enqueue({name:'nod'});const before=e.queue.length;assert.equal(queueRoutine(e,'dance'),false);assert.equal(e.queue.length,before);});

test('repeat gestures keep their identity inside a choreography',()=>{const e=new MotionEngine();assert.equal(queueRoutine(e,'yes'),true);assert.deepEqual(e.queue.map(x=>x.name),['nod','nod']);});
test('routine telemetry and dialogue are both sanitized',()=>{
  assert.deepEqual(routineRequestsFromTelemetry({metadata:{motion:{routine:'lightningBolt',intensity:3}}}).map(x=>x.routine),['lightningBolt']);
  assert.deepEqual(routineRequestsFromText('Fai un ballo.').map(x=>x.routine),['dance']);
  assert.deepEqual(routineRequestsFromText('Mettiti in posa del fulmine').map(x=>x.routine),['lightningBolt']);
  assert.deepEqual(routineRequestsFromText('Non ballare'),[]);
  assert.deepEqual(routineRequestsFromTelemetry({metadata:{motion:{routine:'unknown'}}}),[]);
});
test('browser motion wire routes validated named routines',async()=>{
  const fs=await import('node:fs');const wire=fs.readFileSync(new URL('../web/teddy/motion-wire-v8.js',import.meta.url),'utf8');
  assert.match(wire,/routineRequestsFromTelemetry/);assert.match(wire,/routineRequestsFromText/);assert.match(wire,/sanitizeRoutineRequest\(intent\)/);
});

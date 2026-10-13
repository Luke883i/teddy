// Named choreography layer: bounded, data-only sequences of existing safe motions.
import {sanitizeMotionIntent, MOTION_LIMITS} from './motion-contract.js';
const sequence=(...names)=>Object.freeze(names);
export const ROUTINES=Object.freeze({
  greet:sequence('waveRight','nod'), farewell:sequence('waveLeft','turnRight'),
  yes:sequence('nod','nod'), noThanks:sequence('turnLeft','turnRight'),
  shy:sequence('turnLeft','nod'), proud:sequence('raiseRightArm','nod'),
  curious:sequence('turnRight','nod'), celebrate:sequence('jump','waveRight'),
  applaud:sequence('waveLeft','waveRight'), stretch:sequence('raiseLeftArm','raiseRightArm'),
  pointLeft:sequence('raiseLeftArm','turnLeft'), pointRight:sequence('raiseRightArm','turnRight'),
  march:sequence('walkForward','walkBack'), retreat:sequence('walkBack','nod'),
  approach:sequence('walkForward','waveRight'), pivot:sequence('turnLeft','turnRight'),
  sway:sequence('turnLeft','turnRight','turnLeft'), bounce:sequence('jump','nod'),
  stepLeft:sequence('turnLeft','walkForward'), stepRight:sequence('turnRight','walkForward'),
  balanceLeft:sequence('liftLeftLeg','nod'), balanceRight:sequence('liftRightLeg','nod'),
  warmup:sequence('raiseLeftArm','raiseRightArm','jump'), coolDown:sequence('nod'),
  salute:sequence('raiseRightArm'), bow:sequence('nod'),
  surprise:sequence('jump','raiseLeftArm'), ponder:sequence('turnLeft','nod','turnRight'),
  spin:sequence('turnLeft','turnRight'), victory:sequence('jump','raiseRightArm'),
  dance:sequence('stepLeft','stepRight','jump','waveRight','turnLeft','nod'),
  lightningBolt:sequence('boltPose')
});
export const BASE_ROUTINE_NAMES=Object.freeze(Object.keys(ROUTINES).filter(n=>n!=='dance'&&n!=='lightningBolt'));
export const COMPLEX_ROUTINE_NAMES=Object.freeze(['dance','lightningBolt']);
export function expandRoutine(name,{intensity=.7,source='runtime'}={}){
  if(typeof name!=='string'||!Object.hasOwn(ROUTINES,name))return null;
  const out=[];
  function visit(key,depth){
    if(depth>4||out.length>32)return false;
    if(!Object.hasOwn(ROUTINES,key)){const command=sanitizeMotionIntent({name:key,intensity,source,reason:'routine:'+name});if(!command)return false;out.push(command);return true;}
    return ROUTINES[key].every(child=>visit(child,depth+1));
  }
  if(!visit(name,0)||out.length>32)return null;
  return Object.freeze(out);
}
// Atomic enqueue: no partial choreography when the finite queue lacks capacity.
export function queueRoutine(engine,name,options={}){
  const actions=expandRoutine(name,options);
  if(!actions||engine.current||engine.queue.length||actions.length>MOTION_LIMITS.queueMax)return false;
  const old=engine.queue.slice();
  for(const action of actions)if(!engine.enqueue(action)){engine.queue=old;return false;}
  return true;
}

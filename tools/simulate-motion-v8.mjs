import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {MOTION_NAMES,MOTION_LIMITS,MOTION_INVARIANTS,sanitizeMotionIntent,motionInvariantViolations} from '../web/teddy/motion-contract.js';
import {MotionEngine} from '../web/teddy/motion-engine.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FULL=process.argv.includes('--full'),M=FULL?1_000_000:Number(process.argv.find(x=>/^\d+$/.test(x))||100_000);
function h32(x){x=(x+0x9e3779b9)|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0}function u(i,k){return h32(i^Math.imul(k,0x45d9f3b))/4294967295}
const range=(t,[a,b])=>a+(b-a)*t;
function snapshot(i){
  const name=MOTION_NAMES[i%MOTION_NAMES.length],intensity=.05+u(i,1)*.95,duration=range(u(i,2),MOTION_LIMITS.duration),phase=u(i,3),intent=sanitizeMotionIntent({name,intensity,duration,source:'test'});
  const world={x:range(u(i,4),MOTION_LIMITS.worldX),y:0,z:range(u(i,5),MOTION_LIMITS.worldZ),yaw:range(u(i,6),MOTION_LIMITS.yaw)};let gaitSpeed=0,gaitDirection=1,action=null,airborne=false,footSlip=0;
  if(name==='walkForward'||name==='walkBack'){gaitSpeed=intensity*.92;gaitDirection=name==='walkBack'?-1:1;footSlip=.012+.03*gaitSpeed;}
  else if(name==='jump'){world.y=Math.sin(Math.PI*phase)*(.08+.26*intensity);airborne=world.y>MOTION_LIMITS.groundEpsilon;action={name:'jump',amount:Math.sin(Math.PI*phase)*intensity};}
  else if(!['stand','turnLeft','turnRight'].includes(name)){action={name,amount:Math.sin(Math.PI*phase)*intensity};}
  return {world,gaitSpeed,gaitDirection,grounded:!airborne,airborne,action,phase,duration:intent.duration,queueDepth:i%9,footPenetration:0,footSlip};
}
let unsafe=0;const failures=new Map(),familyCounts={};
for(let i=0;i<M;i++){const s=snapshot(i),v=motionInvariantViolations(s);familyCounts[MOTION_NAMES[i%MOTION_NAMES.length]]=(familyCounts[MOTION_NAMES[i%MOTION_NAMES.length]]||0)+1;if(v.length){unsafe++;for(const x of v)failures.set(x,(failures.get(x)||0)+1)}}
let runtimeUnsafe=0,runtimeFrames=0;const sequences=FULL?10_000:1_000;
for(let i=0;i<sequences;i++){const e=new MotionEngine({reducedMotion:(i%7)===0});for(let j=0;j<3;j++)e.enqueue({name:MOTION_NAMES[(i*7+j*5)%MOTION_NAMES.length],intensity:.2+u(i,j+20)*.8,duration:.22+u(i,j+30)*1.15,source:'test'});for(let f=0;f<150;f++){const s=e.step(1/60);runtimeFrames++;if(motionInvariantViolations(s).length)runtimeUnsafe++;}}
const sourceFiles=['web/teddy/motion-contract.js','web/teddy/motion-engine.js','web/teddy/movement-v8.js'];
const sourceDigest=crypto.createHash('sha256').update(sourceFiles.map(f=>`${f}\0${fs.readFileSync(path.join(ROOT,f),'utf8')}`).join('\0')).digest('hex');
const canonical={M,unsafe,runtimeUnsafe,runtimeFrames,familyCounts,invariants:MOTION_INVARIANTS,sourceDigest};
const report={version:8,kind:'deterministic motion/articulation scenario saturation',mode:FULL?'full':'quick',identity:{scenarios:M,uniqueByConstruction:true},families:familyCounts,invariants:MOTION_INVARIANTS,unsafe,failures:Object.fromEntries(failures),runtime:{sequences,frames:runtimeFrames,unsafe:runtimeUnsafe},stage:{floorY:-1.37,x:MOTION_LIMITS.worldX,z:MOTION_LIMITS.worldZ,jumpY:MOTION_LIMITS.worldY},sourceDigest,digest:crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),definition:{syntheticScenarioSpace:true,physicalBrowserRenders:false,objective:'bounded composable motion on grounded stage with semantic intent routing'}};
if(FULL){fs.mkdirSync(path.join(ROOT,'docs'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/motion-v8-report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify(report,null,2));if(unsafe||runtimeUnsafe||M!==(FULL?1_000_000:M))process.exitCode=1;

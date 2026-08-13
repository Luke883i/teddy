const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s_-]/g,' ').replace(/\s+/g,' ').trim();

export const MOTION_NAMES=Object.freeze([
  'stand','walkForward','walkBack','turnLeft','turnRight',
  'raiseLeftArm','raiseRightArm','waveLeft','waveRight',
  'liftLeftLeg','liftRightLeg','jump','nod'
]);
const MOTION_SET=new Set(MOTION_NAMES);
export const MOTION_INVARIANTS=Object.freeze([
  'finite-state','bounded-stage-x','bounded-stage-y','bounded-stage-z','bounded-yaw','bounded-gait-speed','signed-gait-direction','bounded-duration','bounded-phase','bounded-queue','known-action','bounded-action','exclusive-support-state','ground-height-consistency','bounded-foot-penetration','bounded-foot-slip','single-leg-support','jump-airborne-consistency'
]);
export const MOTION_LIMITS=Object.freeze({
  worldX:Object.freeze([-.62,.62]),worldY:Object.freeze([0,.38]),worldZ:Object.freeze([-.42,.34]),yaw:Object.freeze([-.70,.70]),
  speed:Object.freeze([0,1]),duration:Object.freeze([.18,4.0]),queueMax:8,actionAmount:Object.freeze([0,1]),
  footPenetrationMax:.012,footSlipMax:.065,groundEpsilon:.012
});
const DEFAULT_DURATION=Object.freeze({stand:.28,walkForward:1.8,walkBack:1.5,turnLeft:.85,turnRight:.85,raiseLeftArm:.85,raiseRightArm:.85,waveLeft:1.45,waveRight:1.45,liftLeftLeg:.9,liftRightLeg:.9,jump:.82,nod:.55});
const DEFAULT_INTENSITY=Object.freeze({stand:1,walkForward:.72,walkBack:.58,turnLeft:.58,turnRight:.58,raiseLeftArm:.78,raiseRightArm:.78,waveLeft:.72,waveRight:.72,liftLeftLeg:.62,liftRightLeg:.62,jump:.72,nod:.48});

export function sanitizeMotionIntent(value={},fallbackSource='runtime'){
  if(typeof value==='string')value={name:value};
  if(!value||typeof value!=='object'||!MOTION_SET.has(value.name))return null;
  const name=value.name,intensity=clamp(value.intensity??DEFAULT_INTENSITY[name]);
  const [minDuration,maxDuration]=MOTION_LIMITS.duration;
  const duration=Math.max(minDuration,Math.min(maxDuration,finite(value.duration,DEFAULT_DURATION[name])));
  const source=['user','assistant','telemetry','runtime','test'].includes(value.source)?value.source:fallbackSource;
  const reason=String(value.reason||'').replace(/\s+/g,' ').trim().slice(0,120);
  return Object.freeze({name,intensity,duration,source,reason});
}

const negatedAt=(text,index)=>{const p=text.slice(Math.max(0,index-32),index),n=p.lastIndexOf('non ');if(n<0)return false;const tail=p.slice(n);if(/\b(?:ma|pero|invece)\b/.test(tail))return false;return /\bnon\b(?:\s+\w+){0,2}\s*$/.test(tail)};
const PATTERNS=Object.freeze([
  ['jump',/\b(?:salto|saltare|salta|balzo|balzare|hop|jump)\b/],
  ['waveLeft',/\b(?:salut\w*|ciao con)\b.{0,28}\b(?:mano|braccio)\s+sinistr\w*/],
  ['waveRight',/\b(?:salut\w*|ciao con)\b.{0,28}\b(?:mano|braccio)\s+destr\w*/],
  ['raiseLeftArm',/\b(?:alz\w*|sollev\w*|su)\b.{0,24}\bbraccio\s+sinistr\w*/],
  ['raiseRightArm',/\b(?:alz\w*|sollev\w*|su)\b.{0,24}\bbraccio\s+destr\w*/],
  ['liftLeftLeg',/\b(?:alz\w*|sollev\w*|lift\w*)\b.{0,24}\bgamba\s+sinistr\w*/],
  ['liftRightLeg',/\b(?:alz\w*|sollev\w*|lift\w*)\b.{0,24}\bgamba\s+destr\w*/],
  ['turnLeft',/\b(?:gir\w*|volt\w*|turn)\b.{0,18}\b(?:sinistra|left)\b/],
  ['turnRight',/\b(?:gir\w*|volt\w*|turn)\b.{0,18}\b(?:destra|right)\b/],
  ['walkBack',/\b(?:cammin\w*|pass\w*|walk\w*)\b.{0,22}\b(?:indietro|dietro|back|backward)\b/],
  ['walkForward',/(?:\b(?:cammin\w*|walk\w*|avanz\w*)\b(?:.{0,22}\b(?:avanti|forward)\b)?|\b(?:faccio|fai|fa|fare)\s+un\s+passo(?:\s+avanti)?\b)/],
  ['waveRight',/\b(?:saluto|salutare|saluta|faccio ciao|ciao con la mano|wave)\b/],
  ['nod',/\b(?:annuisc\w*|faccio si con la testa|nod)\b/],
  ['stand',/\b(?:fermo|fermati|resto fermo|resta fermo|in piedi|stop)\b/]
]);

export function motionIntentsFromText(text,{role='assistant',max=3}={}){
  const clean=fold(text);if(!clean)return [];
  const hits=[];
  for(const [name,re] of PATTERNS){const m=re.exec(clean);if(m&&!negatedAt(clean,m.index))hits.push({name,index:m.index});}
  hits.sort((a,b)=>a.index-b.index);
  const seen=new Set(),out=[];
  for(const hit of hits){
    if(seen.has(hit.name))continue;seen.add(hit.name);
    const intent=sanitizeMotionIntent({name:hit.name,source:role==='user'?'user':'assistant',reason:`semantic:${hit.name}`});if(intent)out.push(intent);
    if(out.length>=Math.max(1,Math.min(3,Number(max)||1)))break;
  }
  return out;
}

function normalizeTelemetryCandidate(raw){
  if(typeof raw==='string')return {name:raw,source:'telemetry',reason:'telemetry:string'};
  if(raw&&typeof raw==='object')return {...raw,source:'telemetry',reason:raw.reason||'telemetry:metadata'};
  return null;
}
export function motionIntentsFromTelemetry(event={}){
  if(!event||typeof event!=='object')return [];
  const candidates=[];
  for(const raw of [event.motion,event.metadata?.motion,event.response?.metadata?.motion,event.item?.metadata?.motion]){
    for(const item of Array.isArray(raw)?raw:[raw]){const c=normalizeTelemetryCandidate(item);if(c)candidates.push(c);}
  }
  if(event.type==='teddy.motion'&&event.command)candidates.push(normalizeTelemetryCandidate(event.command));
  return candidates.map(c=>sanitizeMotionIntent(c,'telemetry')).filter(Boolean).slice(0,3);
}

export function motionInvariantViolations(snapshot={}){
  const out=[],w=snapshot.world||{},a=snapshot.action||null;
  const finiteFields=[['world.x',w.x],['world.y',w.y],['world.z',w.z],['world.yaw',w.yaw],['gaitSpeed',snapshot.gaitSpeed],['gaitDirection',snapshot.gaitDirection],['duration',snapshot.duration],['phase',snapshot.phase],['footPenetration',snapshot.footPenetration],['footSlip',snapshot.footSlip],['queueDepth',snapshot.queueDepth]];
  for(const [name,v] of finiteFields)if(!Number.isFinite(Number(v)))out.push(`nonfinite:${name}`);
  if(a&&!Number.isFinite(Number(a.amount)))out.push('nonfinite:action.amount');
  const range=(name,v,[lo,hi])=>{if(Number.isFinite(Number(v))&&(Number(v)<lo-1e-9||Number(v)>hi+1e-9))out.push(`range:${name}`)};
  range('world.x',w.x,MOTION_LIMITS.worldX);range('world.y',w.y,MOTION_LIMITS.worldY);range('world.z',w.z,MOTION_LIMITS.worldZ);range('world.yaw',w.yaw,MOTION_LIMITS.yaw);range('gaitSpeed',snapshot.gaitSpeed,MOTION_LIMITS.speed);range('duration',snapshot.duration,MOTION_LIMITS.duration);range('phase',snapshot.phase,[0,1]);
  if(Number.isFinite(Number(snapshot.gaitSpeed))&&Number(snapshot.gaitSpeed)>.001&&![-1,1].includes(Number(snapshot.gaitDirection)))out.push('gait:direction');
  if(Number.isFinite(Number(snapshot.queueDepth))&&(snapshot.queueDepth<0||snapshot.queueDepth>MOTION_LIMITS.queueMax||!Number.isInteger(Number(snapshot.queueDepth))))out.push('queue:depth');
  if(a){if(!MOTION_SET.has(a.name))out.push('action:name');range('action.amount',a.amount,MOTION_LIMITS.actionAmount);}
  const y=finite(w.y),grounded=!!snapshot.grounded,airborne=!!snapshot.airborne;
  if(grounded===airborne)out.push('support:exclusive');
  if(grounded&&y>MOTION_LIMITS.groundEpsilon)out.push('support:grounded-height');
  if(airborne&&y<=MOTION_LIMITS.groundEpsilon)out.push('support:airborne-height');
  if(Number(snapshot.footPenetration)<-1e-9||Number(snapshot.footPenetration)>MOTION_LIMITS.footPenetrationMax+1e-9)out.push('ground:penetration');
  if(Number(snapshot.footSlip)<-1e-9||(grounded&&Number(snapshot.footSlip)>MOTION_LIMITS.footSlipMax+1e-9))out.push('ground:slip');
  if(a&&/^lift(?:Left|Right)Leg$/.test(a.name)&&Number(snapshot.gaitSpeed)>.05)out.push('support:leg-lift-while-walking');
  if(a?.name==='jump'&&!airborne&&Number(a.amount)>.08&&Number(snapshot.phase)>.12&&Number(snapshot.phase)<.88)out.push('jump:not-airborne');
  return [...new Set(out)];
}
export const motionSnapshotIsSafe=s=>motionInvariantViolations(s).length===0;

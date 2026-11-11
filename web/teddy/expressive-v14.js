import {sampleKineticJoint,styleForMotion} from './motion-dynamics-v15.js';
// Motion v14 — physical, authored, continuous whole-body trajectories.
// Each entry has explicit semantic intent and different coordinated joint targets.
// Values are rotations in radians about the *existing* anatomical joint pivots.
// Frames are neutral -> anticipation -> key pose -> counterpose -> recovery.
const V=(...v)=>v;
const profiles={
greet:['saluto con zampa destra sopra la spalla e oscillazione visibile','twoFeet',1.0,{SR:V(0,0,1.52),ER:V(.16,0,1.36),WR:V(0,0,.52),SP:V(0,0,-.10),HE:V(0,-.14,-.08)},{SR:V(0,0,1.47),ER:V(.15,0,1.30),WR:V(0,0,-.52),HE:V(0,.11,-.04)}],
farewell:['congedo con zampa sinistra alta e oscillazione','twoFeet',.96,{SL:V(0,0,-1.54),EL:V(.10,0,-1.42),WL:V(0,0,-.52),SP:V(0,0,.08),HE:V(0,.14,0)},{SL:V(0,0,-1.49),EL:V(0,0,-1.34),WL:V(0,0,.52),HE:V(0,-.12,.06)}],
yes:['assenso visibile','twoFeet',.85,{HE:V(-.34,0,0),NE:V(-.12,0,0),SP:V(.09,0,0),SL:V(0,0,-.13)},{HE:V(.30,0,0),NE:V(.12,0,0),SP:V(-.05,0,0)}],
noThanks:['rifiuto gentile','twoFeet',.82,{HE:V(0,-.43,.1),NE:V(0,-.16,0),SR:V(0,0,.38),WR:V(0,0,.17)},{HE:V(0,.39,-.07),NE:V(0,.14,0),SR:V(0,0,.16)}],
shy:['timidezza raccolta','twoFeet',.76,{HE:V(.23,-.22,-.21),SP:V(.10,0,-.12),SL:V(.10,0,.22),SR:V(.10,0,-.2)},{HE:V(.12,.14,.10),SP:V(-.02,0,.07),WL:V(0,0,-.16)}],
proud:['fierezza e petto aperto','twoFeet',1.08,{SP:V(-.19,0,0),SL:V(0,0,-.74),SR:V(0,0,.74),HE:V(-.20,0,0),EL:V(0,0,-.30),ER:V(0,0,.30)},{SP:V(-.10,0,.08),SL:V(0,0,-.51),SR:V(0,0,.65),HE:V(-.12,.12,0)}],
curious:['curiosita orientata','twoFeet',.88,{HE:V(-.12,-.44,-.19),NE:V(0,-.13,0),SP:V(.06,0,-.1),SR:V(0,0,.32)},{HE:V(.10,.46,.18),SP:V(-.04,0,.08),SL:V(0,0,-.2)}],
celebrate:['esultanza con entrambe le zampe alte','twoFeet',1.10,{SL:V(0,0,-1.48),SR:V(0,0,1.48),EL:V(0,0,-1.00),ER:V(0,0,1.00),SP:V(-.13,0,0),HE:V(-.17,0,0)},{SL:V(0,0,-1.36),SR:V(0,0,1.36),EL:V(0,0,-.91),ER:V(0,0,.91),SP:V(.08,0,.1),HE:V(-.07,.18,.08)}],
applaud:['zampe che convergono e si separano davanti al petto','twoFeet',1.0,{SL:V(.35,0,0),SR:V(.35,0,0),EL:V(.25,0,1.0),ER:V(.25,0,-1.0),WL:V(.16,0,0),WR:V(.16,0,0)},{SL:V(.28,0,0),SR:V(.28,0,0),EL:V(.20,0,.35),ER:V(.20,0,-.35)}],
stretch:['allungamento bilaterale con le zampe sollevate','twoFeet',1.10,{SL:V(0,0,-1.48),SR:V(0,0,1.48),EL:V(0,0,-1.05),ER:V(0,0,1.05),SP:V(-.12,0,.10),HE:V(-.11,0,-.1)},{SL:V(0,0,-1.26),SR:V(0,0,1.26),EL:V(0,0,-.86),ER:V(0,0,.86),SP:V(.08,0,-.10),HE:V(.09,0,.1)}],
pointLeft:['indicazione precisa sinistra','twoFeet',1.02,{SL:V(0,0,-1.06),EL:V(0,0,-.08),WL:V(0,-.17,0),SP:V(0,-.12,-.15),HE:V(0,-.39,0)},{SL:V(0,0,-.93),EL:V(0,0,-.12),HE:V(-.1,-.28,0)}],
pointRight:['indicazione precisa destra','twoFeet',1.02,{SR:V(0,0,1.06),ER:V(0,0,.08),WR:V(0,.17,0),SP:V(0,.12,.15),HE:V(0,.39,0)},{SR:V(0,0,.93),ER:V(0,0,.12),HE:V(-.1,.28,0)}],
march:['marcia alternata energica','alternating',1.12,{HL:V(.46,0,0),HR:V(-.28,0,0),KL:V(-.35,0,0),SL:V(-.3,0,-.22),SR:V(.30,0,.20),SP:V(.08,0,-.10)},{HL:V(-.28,0,0),HR:V(.46,0,0),KR:V(-.35,0,0),SL:V(.3,0,-.22),SR:V(-.3,0,.20),SP:V(.08,0,.10)}],
retreat:['passo controllato indietro','alternating',.94,{HR:V(-.35,0,0),HL:V(.19,0,0),SL:V(0,0,-.48),SP:V(.16,0,0),HE:V(.09,0,0)},{HL:V(-.31,0,0),HR:V(.21,0,0),SR:V(0,0,.42),SP:V(.08,0,0)}],
approach:['avvicinamento accogliente','alternating',1.07,{HL:V(.35,0,0),HR:V(-.22,0,0),SR:V(0,0,.73),ER:V(0,0,.18),SP:V(-.11,0,0)},{HR:V(.35,0,0),HL:V(-.22,0,0),SR:V(0,0,.98),WR:V(0,0,-.28)}],
pivot:['rotazione consapevole','twoFeet',1.03,{SP:V(0,.29,-.13),HE:V(0,.31,.06),SL:V(0,0,-.33),SR:V(0,0,.44)},{SP:V(0,-.32,.15),HE:V(0,-.35,-.05),SL:V(0,0,-.44),SR:V(0,0,.29)}],
sway:['dondolio morbido','twoFeet',1.08,{SP:V(0,0,-.25),HE:V(0,0,.21),SL:V(0,0,-.22),SR:V(0,0,.40),PE:V(0,0,.08)},{SP:V(0,0,.25),HE:V(0,0,-.21),SL:V(0,0,-.40),SR:V(0,0,.22),PE:V(0,0,-.08)}],
bounce:['rimbalzo controllato','twoFeet',1.06,{KL:V(-.38,0,0),KR:V(-.38,0,0),SP:V(.15,0,0),SL:V(0,0,-.38),SR:V(0,0,.38)},{KL:V(.12,0,0),KR:V(.12,0,0),SP:V(-.12,0,0),SL:V(0,0,-.83),SR:V(0,0,.83)}],
stepLeft:['passo laterale sinistro','alternating',1.10,{HL:V(.31,0,-.30),HR:V(-.18,0,.10),SP:V(0,0,-.18),SL:V(0,0,-.47)},{HR:V(.18,0,-.11),HL:V(-.11,0,.20),SP:V(0,0,.09),SR:V(0,0,.42)}],
stepRight:['passo laterale destro','alternating',1.10,{HR:V(.31,0,.30),HL:V(-.18,0,-.10),SP:V(0,0,.18),SR:V(0,0,.47)},{HL:V(.18,0,.11),HR:V(-.11,0,-.20),SP:V(0,0,-.09),SL:V(0,0,-.42)}],
balanceLeft:['equilibrio su gamba destra','rightFoot',1.08,{HL:V(-.46,0,-.10),KL:V(-.86,0,0),SP:V(0,0,.15),SL:V(0,0,-.72),SR:V(0,0,.35),HE:V(0,0,-.15)},{HL:V(-.32,0,-.12),KL:V(-.65,0,0),SP:V(0,0,-.09),SL:V(0,0,-.44)}],
balanceRight:['equilibrio su gamba sinistra','leftFoot',1.08,{HR:V(-.46,0,.10),KR:V(-.86,0,0),SP:V(0,0,-.15),SR:V(0,0,.72),SL:V(0,0,-.35),HE:V(0,0,.15)},{HR:V(-.32,0,.12),KR:V(-.65,0,0),SP:V(0,0,.09),SR:V(0,0,.44)}],
warmup:['mobilita articolare','twoFeet',1.13,{SL:V(.1,0,-.92),SR:V(.1,0,.46),HE:V(0,-.24,0),SP:V(.1,0,-.12),KL:V(-.20,0,0)},{SL:V(.1,0,-.46),SR:V(.1,0,.92),HE:V(0,.24,0),SP:V(-.08,0,.12),KR:V(-.20,0,0)}],
coolDown:['respiro e distensione','twoFeet',.80,{SP:V(.12,0,0),SL:V(0,0,.12),SR:V(0,0,-.12),HE:V(.13,0,0),NE:V(.09,0,0)},{SP:V(-.11,0,0),SL:V(0,0,-.32),SR:V(0,0,.32),HE:V(-.12,0,0)}],
salute:['zampa destra verso il lato della fronte','twoFeet',1.03,{SR:V(1.48,0,.10),ER:V(1.30,0,.12),WR:V(.32,0,-.18),HE:V(-.11,.12,0)},{SR:V(1.46,0,.1),ER:V(1.28,0,.1),WR:V(.26,0,-.14),HE:V(0,-.06,0)}],
bow:['inchino del busto','twoFeet',1.03,{SP:V(.48,0,0),NE:V(.10,0,0),HE:V(.24,0,0),SL:V(.1,0,.12),SR:V(.1,0,-.12)},{SP:V(.30,0,0),HE:V(.19,0,0),SL:V(0,0,-.25),SR:V(0,0,.25)}],
surprise:['sorpresa ampia','twoFeet',1.11,{HE:V(-.24,0,0),NE:V(-.12,0,0),SP:V(-.17,0,0),SL:V(.15,0,-.83),SR:V(.15,0,.83)},{HE:V(-.14,.12,0),SL:V(.12,0,-.63),SR:V(.12,0,.63)}],
ponder:['riflessione con zampa destra vicino al mento','twoFeet',.95,{HE:V(.15,-.24,.12),SR:V(1.34,0,-.12),ER:V(1.30,0,-.08),WR:V(.2,0,-.14),SP:V(.08,0,0)},{HE:V(.03,.22,-.10),SR:V(1.26,0,-.1),ER:V(1.28,0,-.07)}],
spin:['giro controllato con braccia aperte','twoFeet',1.04,{SL:V(0,0,-.66),SR:V(0,0,.66),SP:V(0,.24,-.08),HE:V(0,.27,0)},{SL:V(0,0,-.61),SR:V(0,0,.61),SP:V(0,-.24,.08),HE:V(0,-.30,0)}],
victory:['vittoria con due zampe alte a V','twoFeet',1.12,{SL:V(0,0,-1.50),SR:V(0,0,1.50),EL:V(0,0,-.93),ER:V(0,0,.93),SP:V(-.15,0,-.08),HE:V(-.13,0,.08)},{SL:V(0,0,-1.46),SR:V(0,0,1.46),EL:V(0,0,-.90),ER:V(0,0,.90),SP:V(-.07,0,.08),HE:V(0,0,-.08)}],
dance:['ballo sincopato multi-articolare','alternating',1.17,{SL:V(.12,0,-.91),SR:V(-.16,0,.42),HL:V(.43,0,-.16),KL:V(-.35,0,0),SP:V(0,.22,-.20),HE:V(0,-.25,.17)},{SL:V(-.15,0,-.38),SR:V(.14,0,1.06),HR:V(.46,0,.19),KR:V(-.37,0,0),SP:V(0,-.25,.21),HE:V(0,.27,-.17)}],
lightningBolt:['posa iconica diagonalmente asimmetrica','rightFoot',1.18,{SR:V(-.12,0,1.17),ER:V(0,0,.16),WR:V(0,0,.12),SL:V(.43,0,-.59),EL:V(.39,0,-.65),HL:V(.25,0,-.22),KL:V(-.34,0,0),SP:V(0,.09,-.23),HE:V(-.12,.16,.18)},{SR:V(-.12,0,1.17),ER:V(0,0,.1),SL:V(.43,0,-.65),EL:V(.37,0,-.59),SP:V(0,.11,-.20),HE:V(-.13,.18,.16)}]
};
export const BONE=Object.freeze({PE:'pelvis',SP:'spine',NE:'neck',HE:'head',SL:'shoulderL',SR:'shoulderR',EL:'elbowL',ER:'elbowR',WL:'wristL',WR:'wristR',HL:'hipL',HR:'hipR',KL:'kneeL',KR:'kneeR',AL:'ankleL',AR:'ankleR'});
const smooth=t=>t*t*(3-2*t);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const EXPRESSIVE_PROFILES=Object.freeze(Object.fromEntries(Object.entries(profiles).map(([name,[intent,support,amplitude,a,b]])=>{
  const frames=Object.freeze([
    Object.freeze({t:0,pose:Object.freeze({})}),
    Object.freeze({t:.16,pose:Object.freeze(a)}),
    Object.freeze({t:.46,pose:Object.freeze(b)}),
    Object.freeze({t:.68,pose:Object.freeze(a)}),
    Object.freeze({t:.86,pose:Object.freeze(b)}),
    Object.freeze({t:1,pose:Object.freeze({})})
  ]);
  return [name,Object.freeze({name,intent,support,amplitude,frames})];
})));
export function sampleExpressivePose(name,phase,intensity=1){
  const profile=Object.hasOwn(EXPRESSIVE_PROFILES,name)?EXPRESSIVE_PROFILES[name]:null;
  if(!profile)return null;
  const p=clamp(Number.isFinite(phase)?phase:0,0,1),gain=clamp(Number.isFinite(intensity)?intensity:0,0,1)*profile.amplitude;
  let index=profile.frames.findIndex(f=>f.t>=p);if(index<1)index=1;
  const style=styleForMotion(name),joints={};
  // All authored joints stay present throughout the entire routine.
  // Previously keys were dropped when a joint was absent in adjacent keyposes.
  for(const code of new Set(profile.frames.flatMap(frame=>Object.keys(frame.pose)))){
    joints[BONE[code]]=Object.freeze([0,1,2].map(axis=>
      clamp(sampleKineticJoint(profile.frames,code,axis,p,style)*gain,-EXPRESSIVE_JOINT_LIMIT,EXPRESSIVE_JOINT_LIMIT)));
  }
  return Object.freeze({name,phase:p,support:profile.support,intent:profile.intent,joints:Object.freeze(joints)});
}
export function profileSignature(name){
  const points=[.16,.32,.46,.68,.86].map(t=>sampleExpressivePose(name,t,1));
  return points.flatMap(p=>Object.keys(BONE).flatMap(k=>p.joints[BONE[k]]||[0,0,0]))
    .map(v=>Math.round(v*1000)).join(',');
}
export const EXPRESSIVE_JOINT_LIMIT=1.55;

const VALID_BONES=new Set(Object.values(BONE));
export function validPoseMutation(m){
  return !!m&&Object.hasOwn(EXPRESSIVE_PROFILES,m.name)&&VALID_BONES.has(m.joint)&&
    Number.isInteger(m.axis)&&m.axis>=0&&m.axis<3&&
    Number.isFinite(m.angle)&&Math.abs(m.angle)<=EXPRESSIVE_JOINT_LIMIT&&
    Number.isFinite(m.phase)&&m.phase>=0&&m.phase<=1;
}

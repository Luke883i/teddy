// V17 face semantics: deterministic, bounded micro-expression signals.
// Existing ExpressionRig, voice frames and MotionEngine are the only authorities.
const C=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:a));
const signed=(v,l)=>C(v,-l,l);
const smooth=v=>{v=C(v);return v*v*(3-2*v)};
export const FACE_V17=Object.freeze({
  microHz:[.37,.83,1.43,2.7],maxGaze:.020,maxCheekWorld:.030,
  maxMuzzleOffset:.024,maxBrowOffset:.035,maxLidClose:.94,maxNoseMotion:.014,
  modes:Object.freeze(['idle','listening','thinking','speaking','concerned']),
  motifs:Object.freeze(['greet','farewell','yes','noThanks','shy','proud','curious','celebrate','applaud','stretch','pointLeft','pointRight','march','retreat','approach','pivot','sway','bounce','stepLeft','stepRight','balanceLeft','balanceRight','warmup','coolDown','salute','bow','surprise','ponder','spin','victory','dance','lightningBolt'])
});
const MOTIFS=Object.freeze({
  greet:[.13,.12,.05],farewell:[.10,.05,.05],yes:[.07,.11,.02],noThanks:[-.07,.06,-.05],
  shy:[.14,-.08,-.12],proud:[.15,.15,.02],curious:[.06,.27,.12],celebrate:[.26,.19,.12],
  applaud:[.17,.13,.04],stretch:[.07,.09,0],pointLeft:[.05,.10,-.19],pointRight:[.05,.10,.19],
  march:[.04,.07,.03],retreat:[-.02,.09,-.02],approach:[.11,.13,.07],pivot:[.05,.1,.09],
  sway:[.14,.1,.04],bounce:[.13,.13,.02],stepLeft:[.08,.1,-.04],stepRight:[.08,.1,.04],
  balanceLeft:[.02,.16,-.08],balanceRight:[.02,.16,.08],warmup:[.08,.11,.02],coolDown:[.12,.06,0],
  salute:[.09,.11,.08],bow:[.13,.04,0],surprise:[-.11,.55,.11],ponder:[-.03,.18,-.12],
  spin:[.06,.15,.06],victory:[.25,.22,.09],dance:[.23,.21,.11],lightningBolt:[.14,.20,.15]
});
export function facialMicroPose(pose={},seconds=0,{reducedMotion=false,routine=null,routinePhase=.5}={}){
  const t=C(seconds,0,1e9),v=pose.voice||{},voice=C(v.level),attack=C(v.attack),high=C(v.high),
    brightness=C(v.brightness),jaw=C(pose.jaw),smile=C(pose.smile),blink=C(pose.blink),
    squint=C(pose.squint),browRaise=C(pose.browRaise),pinch=C(pose.browPinch),
    mode=FACE_V17.modes.includes(pose.mode)?pose.mode:'idle';
  const rawAction=Object.hasOwn(MOTIFS,routine||'')?MOTIFS[routine]:[0,0,0],
    phaseGain=(Math.sin(Math.PI*C(routinePhase))**2)*(reducedMotion?.3:1),
    action=rawAction.map(v=>v*phaseGain),
    modeLift=mode==='listening'?.11:mode==='thinking'?.07:mode==='concerned'?.04:0,
    modeSmile=mode==='concerned'?-.13:mode==='listening'?.05:0,
    gain=reducedMotion?.18:1;
  // Micro motion has two incommensurate low-frequency beats, not random jitter.
  const tremble=gain*(Math.sin(t*2.325+.7)*.46+Math.sin(t*5.216+1.8)*.17);
  const saccadeX=gain*(Math.sin(t*1.37+.21)*.011+Math.sin(t*4.52)*.003);
  const saccadeY=gain*(Math.sin(t*.81+1.1)*.007+Math.sin(t*3.91+.8)*.002);
  const lift=C(smile+action[0]+modeSmile+voice*.075,0,.90);
  const alert=C(browRaise+action[1]+modeLift+high*.08,0,.87);
  const attention=signed((action[2]+signed(pose.headYaw||0,.18)*.13),.22);
  const blinkClose=C(blink*.92+squint*.18,0,.94);
  const puff=C(.08+smile*.11+voice*.16+attack*.07,0,.34);
  const cheekBase=C(.12+lift*.70+voice*.17,0,.82);
  const cheekL=C(cheekBase+alert*.05+Math.max(0,attention)*.10+tremble*.008,0,.89);
  const cheekR=C(cheekBase+alert*.05+Math.max(0,-attention)*.10-tremble*.008,0,.89);
  const lipOpen=C(jaw*.86+voice*.13,0,1);
  const asym=signed(attention*.38+Math.sin(t*1.19)*.012*gain,.10);
  const output={
    gazeX:signed(saccadeX+attention*.070,FACE_V17.maxGaze),
    gazeY:signed(saccadeY+alert*.008,FACE_V17.maxGaze),
    lidClose:blinkClose,
    cheekL,cheekR,
    cheekLiftL:Math.min(FACE_V17.maxCheekWorld,cheekL*.031),
    cheekLiftR:Math.min(FACE_V17.maxCheekWorld,cheekR*.031),
    muzzlePuff:C(puff*.060,0,FACE_V17.maxMuzzleOffset),
    noseBreath:signed(.005*Math.sin(t*2.25)*gain+voice*.005,FACE_V17.maxNoseMotion),
    browLiftL:signed(alert*.036+asym*.03+tremble*.004,FACE_V17.maxBrowOffset),
    browLiftR:signed(alert*.036-asym*.03-tremble*.004,FACE_V17.maxBrowOffset),
    browPinch:C(pinch*.022,0,.028),
    lipOpen,lipCornerL:signed(lift*.025+asym*.018,.032),
    lipCornerR:signed(lift*.025-asym*.018,.032),
    eyeSpark:C(.64+alert*.22+smile*.10,0,.96),
    mode,expressiveMotif:routine||'idle'
  };
  return Object.freeze(output);
}
export function validateFaceMicroState(f={}){
  const bounded={gazeX:FACE_V17.maxGaze,gazeY:FACE_V17.maxGaze,lidClose:.94,
    cheekL:1,cheekR:1,cheekLiftL:FACE_V17.maxCheekWorld,cheekLiftR:FACE_V17.maxCheekWorld,
    muzzlePuff:FACE_V17.maxMuzzleOffset,noseBreath:FACE_V17.maxNoseMotion,
    browLiftL:FACE_V17.maxBrowOffset,browLiftR:FACE_V17.maxBrowOffset,browPinch:.028,
    lipOpen:1,lipCornerL:.032,lipCornerR:.032,eyeSpark:1};
  return Object.entries(bounded).every(([k,limit])=>Number.isFinite(f[k])&&Math.abs(f[k])<=limit+1e-9);
}
export function facialPartDeltas(part,f){
  const id=part?.id||'',p=[...(part.pos||[0,0,0])],s=[...(part.scale||[1,1,1])],
    rot=[...(part.rot||[0,0,0])];
  if(!validateFaceMicroState(f))return {...part,pos:p,scale:s,rot};
  const left=id.endsWith('L'),right=id.endsWith('R'),eye=/^(eye|iris|sclera|catch)[LR]$/.test(id),
    side=left?-1:right?1:0;
  if(eye){
    if(/^(iris|eye|catch)/.test(id)){p[0]+=f.gazeX;p[1]+=f.gazeY;}
    if(/^catch/.test(id)){p[0]-=.009*side;p[1]+=.009;s[0]*=.73+f.eyeSpark*.26;s[1]*=.76+f.eyeSpark*.24;}
    if(/^sclera/.test(id))s[1]*=Math.max(.32,1-f.lidClose*.78);
    if(/^eye/.test(id)||/^iris/.test(id))s[1]*=Math.max(.31,1-f.lidClose*.74);
    p[2]+=.002;
  }
  if(/^brow[LR]$/.test(id)){
    p[1]+=left?f.browLiftL:f.browLiftR;
    p[0]+=(left?1:-1)*f.browPinch;
    rot[2]+=(left?-1:1)*(.12*f.browPinch/.028);
  }
  if(/^muzzle(L|R|Pad)$/.test(id)){
    p[2]+=f.muzzlePuff*(id==='muzzlePad'?.36:1);
    p[1]+=(id==='muzzlePad'?.2:.45)*(f.cheekL+f.cheekR)*.012;
    s[0]*=1+f.muzzlePuff*.7;
  }
  if(id==='nose'||id==='noseBridge'){
    p[1]+=f.noseBreath;p[2]+=f.noseBreath*.5;
    if(id==='nose')s[0]*=1+Math.abs(f.noseBreath)*1.3;
  }
  if(id==='noseStem'){s[1]*=1+f.lipOpen*.16;p[1]-=f.lipOpen*.007;}
  if(/^upperLip/.test(id)){p[1]+=(left?f.lipCornerL:f.lipCornerR);p[0]+=(left?-.006:.006)*f.lipOpen;}
  if(id==='mouthCavity'){s[1]*=1+f.lipOpen*.28;p[2]+=f.lipOpen*.008;}
  if(id==='lowerLip'){p[1]-=f.lipOpen*.022;p[2]+=f.lipOpen*.012;}
  if(id==='tongue'){s[1]*=1+f.lipOpen*.55;p[1]-=f.lipOpen*.010;}
  return {...part,pos:p,scale:s,rot};
}

const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const safeSpeed=v=>Math.max(0,Math.min(1,Number(v)||0));

export function kinematicTargets({time=0,pose={},locomotion={}}={}){
  const speed=safeSpeed(locomotion.speed),direction=clamp(locomotion.direction??1,-1,1)||1;
  const phase=(Number.isFinite(Number(time))?Number(time):0)*(2.6+speed*4.6),stride=Math.sin(phase)*speed*direction,opposite=Math.sin(phase+Math.PI)*speed*direction;
  const plant=Math.max(0,Math.cos(phase))*speed,plantOpp=Math.max(0,Math.cos(phase+Math.PI))*speed;
  const voice=clamp(pose.gesture??0,0,1),shoulder=clamp(pose.shoulder??0,0,1),jaw=clamp(pose.jaw??0,0,1),ear=clamp(pose.earLift??0,0,1);
  const headPitch=clamp(pose.headPitch??0),headYaw=clamp(pose.headYaw??0),headRoll=clamp(pose.headRoll??0);
  const weight=Math.sin(phase)*speed*.045;
  return {
    root:{pos:[0,Math.sin(phase*2)*.014*speed,0],rot:[0,0,weight]},
    pelvis:{rot:[stride*.025,0,-weight*.75]},
    spine:{rot:[-stride*.018,0,weight*.48]},
    neckBase:{rot:[headPitch*.22,headYaw*.28,headRoll*.24]},
    neck:{rot:[headPitch*.34,headYaw*.38,headRoll*.34]},
    head:{rot:[headPitch*.44,headYaw*.34,headRoll*.42]},
    jaw:{rot:[jaw*.13,0,0],pos:[0,-jaw*.045,jaw*.022]},
    earL:{rot:[0,0,-ear*.055]},earR:{rot:[0,0,ear*.055]},
    shoulderL:{rot:[opposite*.20-voice*.06,0,-voice*.17-shoulder*.05]},
    shoulderR:{rot:[stride*.20+voice*.06,0,voice*.17+shoulder*.05]},
    elbowL:{rot:[Math.max(0,-opposite)*.25+voice*.12,0,-voice*.08]},
    elbowR:{rot:[Math.max(0,-stride)*.25+voice*.12,0,voice*.08]},
    wristL:{rot:[voice*.08,0,-voice*.04]},wristR:{rot:[voice*.08,0,voice*.04]},
    hipL:{rot:[stride*.32,0,-weight*.35]},hipR:{rot:[opposite*.32,0,-weight*.35]},
    kneeL:{rot:[Math.max(0,-stride)*.48+plantOpp*.05,0,0]},kneeR:{rot:[Math.max(0,-opposite)*.48+plant*.05,0,0]},
    ankleL:{rot:[-stride*.14-Math.max(0,-stride)*.18,0,0]},ankleR:{rot:[-opposite*.14-Math.max(0,-opposite)*.18,0,0]},
    diagnostics:{speed,stride,weight,voice}
  };
}

export function kinematicPoseIsSafe(k={}){
  const groups=['root','pelvis','spine','neckBase','neck','head','jaw','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','hipL','hipR','kneeL','kneeR','ankleL','ankleR'];
  for(const name of groups){
    const g=k[name]||{};
    for(const v of [...(g.pos||[]),...(g.rot||[])])if(!Number.isFinite(v)||Math.abs(v)>1.2)return false;
  }
  return true;
}

export function footPlantError(k={}){
  const speed=k.diagnostics?.speed||0;
  if(speed<.01)return 0;
  const a=Math.abs(k.ankleL?.rot?.[0]||0),b=Math.abs(k.ankleR?.rot?.[0]||0),p=Math.abs(k.pelvis?.rot?.[2]||0);
  return Math.max(0,a-.34)+Math.max(0,b-.34)+Math.max(0,p-.08);
}

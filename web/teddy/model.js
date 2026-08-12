const part=(id,geometry,parent,pos,scale,material,roughness=.76,rot=[0,0,0],flags={})=>({id,geometry,parent,pos,scale,material,roughness,rot,...flags});

export const TEDDY_BOUNDS={min:[-1.18,-1.28,-.78],max:[1.18,2.13,1.02]};

export function buildTeddyArchetype(){
  const groups={
    root:{parent:null,pos:[0,0,0],rot:[0,0,0]},
    head:{parent:'root',pos:[0,1.24,.01],rot:[0,0,0]},
    armL:{parent:'root',pos:[-.74,.28,.01],rot:[0,0,-.24]},
    armR:{parent:'root',pos:[.74,.28,.01],rot:[0,0,.24]}
  };
  const parts=[
    part('torso','sphere','root',[0,-.03,0],[.83,1.00,.67],'fur',.90),
    part('belly','sphere','root',[0,-.10,.60],[.51,.65,.085],'belly',.96),
    part('tail','sphere','root',[0,-.18,-.67],[.22,.23,.19],'fur',.94),

    part('headShell','sphere','head',[0,0,0],[.84,.74,.72],'fur',.88),
    part('earL','sphere','head',[-.59,.51,-.03],[.31,.32,.21],'fur',.91),
    part('earR','sphere','head',[.59,.51,-.03],[.31,.32,.21],'fur',.91),
    part('innerEarL','sphere','head',[-.59,.51,.145],[.17,.18,.055],'innerEar',.95),
    part('innerEarR','sphere','head',[.59,.51,.145],[.17,.18,.055],'innerEar',.95),

    part('muzzle','sphere','head',[0,-.20,.61],[.49,.31,.27],'muzzle',.97),
    part('nose','prism','head',[0,-.105,.885],[.17,.12,.09],'eyes',.22,[0,0,Math.PI]),
    part('eyeL','sphere','head',[-.275,.075,.682],[.083,.105,.073],'eyes',.12),
    part('eyeR','sphere','head',[.275,.075,.682],[.083,.105,.073],'eyes',.12),
    part('catchL','sphere','head',[-.248,.112,.752],[.018,.023,.012],'highlight',.05),
    part('catchR','sphere','head',[(.302),.112,.752],[.018,.023,.012],'highlight',.05),
    part('browL','box','head',[-.285,.285,.700],[.26,.045,.035],'eyes',.50,[0,0,.10],{expressive:true}),
    part('browR','box','head',[.285,.285,.700],[.26,.045,.035],'eyes',.50,[0,0,-.10],{expressive:true}),
    part('mouthL','box','head',[-.085,-.405,.866],[.115,.020,.024],'mouth',.40,[0,0,-.34],{mouth:true}),
    part('mouthR','box','head',[.085,-.405,.866],[.115,.020,.024],'mouth',.40,[0,0,.34],{mouth:true}),

    part('armL','sphere','armL',[0,-.31,.01],[.29,.67,.30],'fur',.91),
    part('armR','sphere','armR',[0,-.31,.01],[.29,.67,.30],'fur',.91),
    part('handL','sphere','armL',[0,-.78,.20],[.31,.30,.27],'fur',.91),
    part('handR','sphere','armR',[0,-.78,.20],[.31,.30,.27],'fur',.91),
    part('handPadL','sphere','armL',[0,-.79,.43],[.18,.16,.045],'paw',.96),
    part('handPadR','sphere','armR',[0,-.79,.43],[.18,.16,.045],'paw',.96),

    part('legL','sphere','root',[-.37,-.91,.06],[.40,.47,.43],'fur',.92,[0,0,-.04]),
    part('legR','sphere','root',[.37,-.91,.06],[.40,.47,.43],'fur',.92,[0,0,.04]),
    part('footPadL','sphere','root',[-.37,-.92,.42],[.23,.19,.055],'paw',.97),
    part('footPadR','sphere','root',[.37,-.92,.42],[.23,.19,.055],'paw',.97)
  ];
  return {groups,parts,bounds:TEDDY_BOUNDS};
}

export function cameraPlan(width,height){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),aspect=w/h;
  const fov=.72;
  const fill=aspect>=1.3?.62:aspect>=.82?.58:.52;
  const span=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1];
  const distance=span/(2*Math.tan(fov/2)*fill);
  const centerY=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2;
  return {aspect,fov,fill,distance,centerY};
}

export function archetypeMetrics(model=buildTeddyArchetype()){
  const byId=new Map(model.parts.map(p=>[p.id,p]));
  const pair=(a,b)=>{const A=byId.get(a),B=byId.get(b);return !!A&&!!B&&Math.abs(A.pos[0]+B.pos[0])<1e-6&&Math.abs(A.scale[0]-B.scale[0])<1e-6&&Math.abs(A.scale[1]-B.scale[1])<1e-6};
  const head=byId.get('headShell'),muzzle=byId.get('muzzle'),nose=byId.get('nose'),eyeL=byId.get('eyeL');
  return {
    partCount:model.parts.length,
    geometryKinds:new Set(model.parts.map(p=>p.geometry)).size,
    bilateralPairs:[['earL','earR'],['innerEarL','innerEarR'],['eyeL','eyeR'],['armL','armR'],['legL','legR'],['footPadL','footPadR']].filter(([a,b])=>pair(a,b)).length,
    faceProjectsForward:!!(head&&muzzle&&nose&&eyeL&&muzzle.pos[2]>head.pos[2]&&nose.pos[2]>muzzle.pos[2]&&eyeL.pos[2]>head.pos[2]),
    hasCatchlights:byId.has('catchL')&&byId.has('catchR'),
    hasPawPads:byId.has('handPadL')&&byId.has('handPadR')&&byId.has('footPadL')&&byId.has('footPadR'),
    hasInnerEars:byId.has('innerEarL')&&byId.has('innerEarR'),
    headToTorsoRatio:(head?.scale[0]||0)/(byId.get('torso')?.scale[0]||1)
  };
}

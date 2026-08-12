const part=(id,geometry,parent,pos,scale,material,roughness=.82,rot=[0,0,0],flags={})=>({id,geometry,parent,pos,scale,material,roughness,rot,...flags});

export const TEDDY_BOUNDS={min:[-1.23,-1.38,-.84],max:[1.23,2.14,1.12]};

export function buildTeddyArchetype(){
  const groups={
    root:{parent:null,pos:[0,0,0],rot:[0,0,0]},
    head:{parent:'root',pos:[0,1.22,.01],rot:[0,0,0]},
    jaw:{parent:'head',pos:[0,-.40,.78],rot:[0,0,0]},
    earL:{parent:'head',pos:[-.58,.49,-.02],rot:[0,0,-.06]},earR:{parent:'head',pos:[.58,.49,-.02],rot:[0,0,.06]},
    shoulderL:{parent:'root',pos:[-.72,.38,.00],rot:[0,0,-.24]},shoulderR:{parent:'root',pos:[.72,.38,.00],rot:[0,0,.24]},
    forearmL:{parent:'shoulderL',pos:[0,-.52,.06],rot:[0,0,-.04]},forearmR:{parent:'shoulderR',pos:[0,-.52,.06],rot:[0,0,.04]}
  };
  const parts=[
    part('torso','sphere','root',[0,-.04,0],[.78,.98,.65],'fur',.92),
    part('chestFluff','sphere','root',[0,.42,.53],[.55,.51,.14],'furLight',.96),
    part('belly','sphere','root',[0,-.16,.61],[.48,.62,.09],'belly',.97),
    part('neckFluff','sphere','root',[0,.73,.22],[.62,.28,.48],'fur',.95),
    part('tail','sphere','root',[0,-.24,-.66],[.23,.24,.19],'fur',.95),

    part('headShell','sphere','head',[0,0,0],[.83,.75,.73],'fur',.91),
    part('cheekL','sphere','head',[-.37,-.13,.42],[.43,.38,.36],'fur',.93),part('cheekR','sphere','head',[.37,-.13,.42],[.43,.38,.36],'fur',.93),
    part('earL','sphere','earL',[0,0,0],[.31,.33,.22],'fur',.93),part('earR','sphere','earR',[0,0,0],[.31,.33,.22],'fur',.93),
    part('innerEarL','sphere','earL',[0,0,.17],[.175,.19,.055],'innerEar',.98),part('innerEarR','sphere','earR',[0,0,.17],[.175,.19,.055],'innerEar',.98),
    part('muzzleL','sphere','head',[-.18,-.22,.66],[.34,.28,.27],'muzzle',.98),part('muzzleR','sphere','head',[.18,-.22,.66],[.34,.28,.27],'muzzle',.98),
    part('chin','sphere','jaw',[0,-.04,.055],[.30,.17,.13],'muzzle',.98),
    part('noseBridge','sphere','head',[0,-.075,.73],[.23,.17,.16],'muzzleDark',.96),
    part('nose','prism','head',[0,-.105,.91],[.17,.115,.085],'eyes',.18,[0,0,Math.PI]),
    part('eyeL','sphere','head',[-.285,.085,.69],[.087,.108,.075],'eyes',.10),part('eyeR','sphere','head',[.285,.085,.69],[.087,.108,.075],'eyes',.10),
    part('catchL','sphere','head',[-.255,.125,.762],[.020,.026,.012],'highlight',.04),part('catchR','sphere','head',[.315,.125,.762],[.020,.026,.012],'highlight',.04),
    part('browL','box','head',[-.29,.292,.704],[.25,.043,.032],'brow',.56,[0,0,.10],{expressive:true}),part('browR','box','head',[.29,.292,.704],[.25,.043,.032],'brow',.56,[0,0,-.10],{expressive:true}),
    part('upperLipL','box','head',[-.082,-.402,.888],[.112,.018,.022],'mouth',.42,[0,0,-.28],{mouth:true}),part('upperLipR','box','head',[.082,-.402,.888],[.112,.018,.022],'mouth',.42,[0,0,.28],{mouth:true}),
    part('mouthCavity','sphere','jaw',[0,.015,.105],[.245,.055,.055],'mouthCavity',.45,[0,0,0],{jaw:true}),
    part('lowerLip','sphere','jaw',[0,-.005,.165],[.22,.038,.035],'mouth',.48,[0,0,0],{jaw:true}),
    part('tongue','sphere','jaw',[0,-.005,.205],[.13,.025,.023],'tongue',.70,[0,0,0],{jaw:true}),

    part('upperArmL','sphere','shoulderL',[0,-.27,.01],[.285,.47,.29],'fur',.93),part('upperArmR','sphere','shoulderR',[0,-.27,.01],[.285,.47,.29],'fur',.93),
    part('forearmL','sphere','forearmL',[0,-.24,.09],[.30,.42,.30],'fur',.93),part('forearmR','sphere','forearmR',[0,-.24,.09],[.30,.42,.30],'fur',.93),
    part('handL','sphere','forearmL',[0,-.54,.22],[.32,.30,.28],'fur',.94),part('handR','sphere','forearmR',[0,-.54,.22],[.32,.30,.28],'fur',.94),
    part('handPadL','sphere','forearmL',[0,-.555,.455],[.18,.16,.045],'paw',.98),part('handPadR','sphere','forearmR',[0,-.555,.455],[.18,.16,.045],'paw',.98),

    part('legL','sphere','root',[-.37,-.91,.02],[.40,.49,.43],'fur',.94,[0,0,-.035]),part('legR','sphere','root',[.37,-.91,.02],[.40,.49,.43],'fur',.94,[0,0,.035]),
    part('footL','sphere','root',[-.38,-1.11,.27],[.43,.31,.52],'fur',.94,[.08,0,-.03]),part('footR','sphere','root',[.38,-1.11,.27],[.43,.31,.52],'fur',.94,[.08,0,.03]),
    part('footPadL','sphere','root',[-.38,-1.12,.695],[.245,.19,.055],'paw',.98),part('footPadR','sphere','root',[.38,-1.12,.695],[.245,.19,.055],'paw',.98),
    part('toePadL1','sphere','root',[-.50,-1.02,.742],[.07,.055,.022],'pawDark',.98),part('toePadL2','sphere','root',[-.27,-1.02,.742],[.07,.055,.022],'pawDark',.98),
    part('toePadR1','sphere','root',[.27,-1.02,.742],[.07,.055,.022],'pawDark',.98),part('toePadR2','sphere','root',[.50,-1.02,.742],[.07,.055,.022],'pawDark',.98)
  ];
  return {groups,parts,bounds:TEDDY_BOUNDS};
}

export function cameraPlan(width,height){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),aspect=w/h,fov=.68,tan=Math.tan(fov/2);
  const spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],spanX=TEDDY_BOUNDS.max[0]-TEDDY_BOUNDS.min[0];
  const targetY=.76,targetX=.86,dY=spanY/(2*tan*targetY),dX=spanX/(2*tan*aspect*targetX),distance=Math.max(dY,dX);
  const visibleY=2*distance*tan,visibleX=visibleY*aspect,centerY=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2+.045;
  return {aspect,fov,distance,centerY,occupancyY:spanY/visibleY,occupancyX:spanX/visibleX,limiter:dX>dY?'horizontal':'vertical'};
}

export function archetypeMetrics(model=buildTeddyArchetype()){
  const byId=new Map(model.parts.map(p=>[p.id,p]));
  const pair=(a,b)=>{const A=byId.get(a),B=byId.get(b);return !!A&&!!B&&Math.abs(A.pos[0]+B.pos[0])<1e-6&&Math.abs(A.scale[0]-B.scale[0])<1e-6&&Math.abs(A.scale[1]-B.scale[1])<1e-6};
  const head=byId.get('headShell'),muzzle=byId.get('muzzleL'),nose=byId.get('nose'),eyeL=byId.get('eyeL');
  return {
    partCount:model.parts.length,geometryKinds:new Set(model.parts.map(p=>p.geometry)).size,groupCount:Object.keys(model.groups).length,
    bilateralPairs:[['earL','earR'],['innerEarL','innerEarR'],['eyeL','eyeR'],['upperArmL','upperArmR'],['legL','legR'],['footPadL','footPadR']].filter(([a,b])=>pair(a,b)).length,
    extendedPairs:[['cheekL','cheekR'],['muzzleL','muzzleR'],['forearmL','forearmR'],['handL','handR'],['handPadL','handPadR'],['footL','footR']].filter(([a,b])=>pair(a,b)).length,
    faceProjectsForward:!!(head&&muzzle&&nose&&eyeL&&muzzle.pos[2]>head.pos[2]&&nose.pos[2]>muzzle.pos[2]&&eyeL.pos[2]>head.pos[2]),
    hasCatchlights:byId.has('catchL')&&byId.has('catchR'),hasPawPads:byId.has('handPadL')&&byId.has('handPadR')&&byId.has('footPadL')&&byId.has('footPadR'),hasInnerEars:byId.has('innerEarL')&&byId.has('innerEarR'),
    mouthLayers:['upperLipL','upperLipR','mouthCavity','lowerLip','tongue'].filter(id=>byId.has(id)).length,headToTorsoRatio:(head?.scale[0]||0)/(byId.get('torso')?.scale[0]||1)
  };
}

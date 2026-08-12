const part=(id,geometry,parent,pos,scale,material,roughness=.9,rot=[0,0,0],flags={})=>({id,geometry,parent,pos,scale,material,roughness,rot,...flags});

export const TEDDY_BOUNDS={min:[-1.09,-1.30,-.83],max:[1.09,1.76,1.12]};
export const MORPHOLOGY_V5=Object.freeze({
  searchIndex:792652,searchIterations:1_000_000,
  rawCandidate:{headW:.84715,headH:.77488,bodyW:.78092,bodyH:1.08816,muzzleW:.40137,muzzleH:.28025,muzzleZ:.72526,eyeX:.23623,eyeY:.16936,earX:.64878,earY:.48645,earR:.28800,armX:.64153,hipX:.43251,footZ:.45686},
  visualConvergence:'vtk-front-three-quarter-silhouette'
});

export function buildTeddyArchetype(){
  const groups={
    root:{parent:null,pos:[0,0,0],rot:[0,0,0]},
    head:{parent:'root',pos:[0,.90,.02],rot:[0,0,0]},
    jaw:{parent:'head',pos:[0,-.31,.91],rot:[0,0,0]},
    earL:{parent:'head',pos:[-.66,.50,-.03],rot:[0,-.04,-.08]},earR:{parent:'head',pos:[.66,.50,-.03],rot:[0,.04,.08]},
    shoulderL:{parent:'root',pos:[-.66,.28,.08],rot:[0,.04,-.14]},shoulderR:{parent:'root',pos:[.66,.28,.08],rot:[0,-.04,.14]},
    elbowL:{parent:'shoulderL',pos:[-.010,-.47,.14],rot:[-.06,0,-.03]},elbowR:{parent:'shoulderR',pos:[.010,-.47,.14],rot:[-.06,0,.03]},
    hipL:{parent:'root',pos:[-.43,-.57,.00],rot:[.03,0,.06]},hipR:{parent:'root',pos:[.43,-.57,.00],rot:[.03,0,-.06]},
    ankleL:{parent:'hipL',pos:[0,-.31,.22],rot:[.11,0,.02]},ankleR:{parent:'hipR',pos:[0,-.31,.22],rot:[.11,0,-.02]}
  };
  const parts=[
    // A teddy is read from mass first: a pear belly, a soft chest and no human neck.
    part('torso','sphere','root',[0,-.16,-.01],[.80,1.05,.66],'fur',.97),
    part('belly','sphere','root',[0,-.18,.675],[.405,.49,.060],'belly',.99),
    part('tail','sphere','root',[0,-.40,-.63],[.21,.21,.17],'fur',.99),

    // Skull, cheek planes and inset ears overlap: no disconnected balls around the head.
    part('headShell','sphere','head',[0,.04,0],[.87,.80,.72],'fur',.96),
    part('browPadL','sphere','head',[-.24,.27,.50],[.15,.08,.08],'fur',.99),part('browPadR','sphere','head',[.24,.27,.50],[.15,.08,.08],'fur',.99),
    part('cheekL','sphere','head',[-.31,-.10,.08],[.26,.25,.25],'fur',.98),part('cheekR','sphere','head',[.31,-.10,.08],[.26,.25,.25],'fur',.98),
    part('earL','sphere','earL',[0,0,0],[.30,.31,.23],'fur',.98),part('earR','sphere','earR',[0,0,0],[.30,.31,.23],'fur',.98),
    part('innerEarL','sphere','earL',[0,-.006,.245],[.17,.18,.050],'innerEar',.99),part('innerEarR','sphere','earR',[0,-.006,.245],[.17,.18,.050],'innerEar',.99),

    // A single broad snout is the dominant face landmark; small lobes only soften its lower contour.
    part('muzzlePad','sphere','head',[0,-.235,.735],[.41,.285,.285],'muzzle',.99),
    part('muzzleL','sphere','head',[-.145,-.285,.790],[.175,.150,.195],'muzzle',.99),part('muzzleR','sphere','head',[.145,-.285,.790],[.175,.150,.195],'muzzle',.99),
    part('noseBridge','sphere','head',[0,-.135,.830],[.135,.105,.095],'muzzleDark',.98),
    part('nose','prism','head',[0,-.185,.945],[.132,.086,.078],'eyes',.18,[0,0,Math.PI]),

    // Small glossy eyes form a compact bear triangle with the nose.
    part('eyeL','sphere','head',[-.235,.145,.625],[.080,.097,.071],'eyes',.09),part('eyeR','sphere','head',[.235,.145,.625],[.080,.097,.071],'eyes',.09),
    part('catchL','sphere','head',[-.211,.181,.691],[.017,.021,.010],'highlight',.04),part('catchR','sphere','head',[.259,.181,.691],[.017,.021,.010],'highlight',.04),
    part('browL','capsule','head',[-.235,.305,.602],[.075,.014,.017],'brow',.72,[0,0,.10],{expressive:true}),part('browR','capsule','head',[.235,.305,.602],[.075,.014,.017],'brow',.72,[0,0,-.10],{expressive:true}),

    // Mouth is mostly hidden at rest and expands only when the speech rig asks for it.
    part('noseStem','capsule','head',[0,-.330,1.035],[.012,.060,.012],'mouth',.72,[0,0,0],{mouth:true}),
    part('upperLipL','capsule','head',[-.060,-.397,1.035],[.070,.008,.012],'mouth',.68,[0,0,-.30],{mouth:true}),part('upperLipR','capsule','head', [.060,-.397,1.035],[.070,.008,.012],'mouth',.68,[0,0,.30],{mouth:true}),
    part('mouthCavity','sphere','jaw',[0,.006,.125],[.145,.025,.032],'mouthCavity',.86,[0,0,0],{jaw:true}),
    part('lowerLip','capsule','jaw',[0,-.017,.145],[.115,.008,.014],'mouth',.76,[0,0,0],{jaw:true}),
    part('tongue','sphere','jaw',[0,-.008,.160],[.075,.006,.014],'tongue',.88,[0,0,0],{jaw:true}),

    // Arms are overlapping plush masses. Joints exist for motion but never read as hard robot segments.
    part('shoulderSocketL','sphere','root',[-.57,.30,-.12],[.24,.28,.24],'fur',.99),part('shoulderSocketR','sphere','root',[.57,.30,-.12],[.24,.28,.24],'fur',.99),
    part('upperArmL','sphere','shoulderL',[0,-.25,.03],[.285,.55,.29],'fur',.98),part('upperArmR','sphere','shoulderR',[0,-.25,.03],[.285,.55,.29],'fur',.98),

    // Seated haunches merge into the pear body. Broad feet project toward the camera.
    part('thighL','sphere','hipL',[0,-.12,.02],[.43,.43,.44],'fur',.99),part('thighR','sphere','hipR',[0,-.12,.02],[.43,.43,.44],'fur',.99),
    part('footL','sphere','hipL',[0,-.34,.50],[.47,.32,.55],'fur',.99,[.10,0,-.02]),part('footR','sphere','hipR',[0,-.34,.50],[.47,.32,.55],'fur',.99,[.10,0,.02]),
    part('footPadL','sphere','hipL',[0,-.345,.958],[.255,.168,.038],'paw',.99),part('footPadR','sphere','hipR',[0,-.345,.958],[.255,.168,.038],'paw',.99),
    part('toeL1','sphere','hipL',[-.12,-.245,.998],[.048,.039,.012],'pawDark',.99),part('toeL2','sphere','hipL',[0,-.226,1.006],[.048,.039,.012],'pawDark',.99),part('toeL3','sphere','hipL',[.12,-.245,.998],[.048,.039,.012],'pawDark',.99),
    part('toeR1','sphere','hipR',[-.12,-.245,.998],[.048,.039,.012],'pawDark',.99),part('toeR2','sphere','hipR',[0,-.226,1.006],[.048,.039,.012],'pawDark',.99),part('toeR3','sphere','hipR',[.12,-.245,.998],[.048,.039,.012],'pawDark',.99)
  ];
  return {groups,parts,bounds:TEDDY_BOUNDS};
}

export function cameraPlan(width,height){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),aspect=w/h,fov=.62,tan=Math.tan(fov/2);
  const spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],spanX=TEDDY_BOUNDS.max[0]-TEDDY_BOUNDS.min[0];
  const targetY=aspect<.62?.72:.74,targetX=aspect<.62?.86:.84;
  const dY=spanY/(2*tan*targetY),dX=spanX/(2*tan*aspect*targetX),distance=Math.max(dY,dX);
  const visibleY=2*distance*tan,visibleX=visibleY*aspect,centerY=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2-.08;
  return {aspect,fov,distance,centerY,occupancyY:spanY/visibleY,occupancyX:spanX/visibleX,limiter:dX>dY?'horizontal':'vertical'};
}

export function archetypeMetrics(model=buildTeddyArchetype()){
  const byId=new Map(model.parts.map(p=>[p.id,p]));
  const pair=(a,b)=>{const A=byId.get(a),B=byId.get(b);return !!A&&!!B&&Math.abs(A.pos[0]+B.pos[0])<1e-5&&Math.abs(A.scale[0]-B.scale[0])<1e-5};
  const earOverlap=(byId.get('headShell')?.scale[0]||0)-((model.groups.earR?.pos[0]||0)-(byId.get('earR')?.scale[0]||0));
  return {
    partCount:model.parts.length,groupCount:Object.keys(model.groups).length,geometryKinds:new Set(model.parts.map(p=>p.geometry)).size,
    bilateralPairs:[['earL','earR'],['innerEarL','innerEarR'],['eyeL','eyeR'],['upperArmL','upperArmR'],['forearmL','forearmR'],['thighL','thighR'],['footL','footR']].filter(([a,b])=>pair(a,b)).length,
    faceProjectsForward:byId.get('nose').pos[2]>byId.get('muzzlePad').pos[2]&&byId.get('muzzlePad').pos[2]>byId.get('headShell').pos[2],
    hasBearTriangle:byId.has('eyeL')&&byId.has('eyeR')&&byId.has('nose'),hasCatchlights:byId.has('catchL')&&byId.has('catchR'),hasPawPads:byId.has('footPadL')&&byId.has('footPadR'),hasInnerEars:byId.has('innerEarL')&&byId.has('innerEarR'),
    mouthLayers:['noseStem','upperLipL','upperLipR','mouthCavity','lowerLip','tongue'].filter(id=>byId.has(id)).length,layeredMouth:['upperLipL','upperLipR','mouthCavity','lowerLip','tongue'].every(id=>byId.has(id)),
    extendedPairs:[['cheekL','cheekR'],['muzzleL','muzzleR'],['browPadL','browPadR'],['shoulderSocketL','shoulderSocketR'],['thighL','thighR'],['footL','footR']].filter(([a,b])=>pair(a,b)).length,
    headToTorsoRatio:(byId.get('headShell')?.scale[0]||0)/(byId.get('torso')?.scale[0]||1),earSkullOverlap:earOverlap,morphologySearchIterations:MORPHOLOGY_V5.searchIterations
  };
}

const part=(id,geometry,parent,pos,scale,material,roughness=.9,rot=[0,0,0],flags={})=>({id,geometry,parent,pos,scale,material,roughness,rot,...flags});

export const FLOOR_Y=-1.37;
export const TEDDY_BOUNDS={min:[-1.00,-1.39,-.73],max:[1.00,1.80,1.03]};
export const MORPHOLOGY_V5=Object.freeze({
  searchIndex:792652,searchIterations:1_000_000,
  rawCandidate:{headW:.84715,headH:.77488,bodyW:.78092,bodyH:1.08816,muzzleW:.40137,muzzleH:.28025,muzzleZ:.72526,eyeX:.23623,eyeY:.16936,earX:.64878,earY:.48645,earR:.28800,armX:.64153,hipX:.43251,footZ:.45686},
  visualConvergence:'vtk-front-three-quarter-silhouette'
});
export const ANATOMY_V6=Object.freeze({
  searchIterations:10_000_000,
  noveltyWindow:100,
  stance:'grounded-bipedal-plush',
  floorY:FLOOR_Y,
  articulatedChains:['neck-head-jaw','shoulder-elbow-wrist','hip-knee-ankle'],
  opaqueBody:true
});

export function buildTeddyArchetype(){
  const groups={
    root:{parent:null,pos:[0,0,0],rot:[0,0,0]},
    pelvis:{parent:'root',pos:[0,-.35,0],rot:[0,0,0]},
    spine:{parent:'pelvis',pos:[0,.36,0],rot:[0,0,0]},
    neckBase:{parent:'spine',pos:[0,.60,-.015],rot:[0,0,0]},
    neck:{parent:'neckBase',pos:[0,.10,0],rot:[0,0,0]},
    head:{parent:'neck',pos:[0,.34,.025],rot:[0,0,0]},
    jaw:{parent:'head',pos:[0,-.30,.655],rot:[0,0,0]},
    earL:{parent:'head',pos:[-.57,.43,-.035],rot:[0,-.03,-.08]},
    earR:{parent:'head',pos:[.57,.43,-.035],rot:[0,.03,.08]},
    shoulderL:{parent:'spine',pos:[-.57,.40,.00],rot:[0,.03,-.09]},
    shoulderR:{parent:'spine',pos:[.57,.40,.00],rot:[0,-.03,.09]},
    elbowL:{parent:'shoulderL',pos:[0,-.49,.055],rot:[-.04,0,-.02]},
    elbowR:{parent:'shoulderR',pos:[0,-.49,.055],rot:[-.04,0,.02]},
    wristL:{parent:'elbowL',pos:[0,-.40,.08],rot:[0,0,0]},
    wristR:{parent:'elbowR',pos:[0,-.40,.08],rot:[0,0,0]},
    hipL:{parent:'pelvis',pos:[-.33,-.12,.00],rot:[0,0,.02]},
    hipR:{parent:'pelvis',pos:[.33,-.12,.00],rot:[0,0,-.02]},
    kneeL:{parent:'hipL',pos:[0,-.35,.025],rot:[0,0,0]},
    kneeR:{parent:'hipR',pos:[0,-.35,.025],rot:[0,0,0]},
    ankleL:{parent:'kneeL',pos:[0,-.32,.10],rot:[.04,0,0]},
    ankleR:{parent:'kneeR',pos:[0,-.32,.10],rot:[.04,0,0]}
  };

  const parts=[
    // Core masses overlap deliberately so joints are hidden inside plush volume instead of reading as detached balls.
    part('pelvisMass','sphere','pelvis',[0,.02,-.02],[.59,.45,.50],'fur',.98),
    part('torso','sphere','spine',[0,.18,-.015],[.70,.80,.55],'fur',.97),
    part('chest','sphere','spine',[0,.45,.00],[.64,.50,.53],'fur',.97),
    part('belly','sphere','spine',[0,.12,.515],[.36,.47,.045],'belly',.99),
    part('neckRoll','sphere','neckBase',[0,.02,.00],[.31,.24,.29],'fur',.99),
    part('tail','sphere','pelvis',[0,-.02,-.49],[.18,.19,.16],'fur',.99),

    // Head is broad but no longer a giant mask: cheeks, muzzle and ears sit on a continuous skull with controlled depth.
    part('headShell','sphere','head',[0,.02,0],[.76,.72,.64],'fur',.96),
    part('browPadL','sphere','head',[-.21,.22,.48],[.14,.075,.065],'fur',.99),
    part('browPadR','sphere','head',[.21,.22,.48],[.14,.075,.065],'fur',.99),
    part('cheekL','sphere','head',[-.275,-.10,.27],[.22,.22,.22],'fur',.98),
    part('cheekR','sphere','head',[.275,-.10,.27],[.22,.22,.22],'fur',.98),
    // V22: head-local three-dimensional soft tissue connects the side profile
    // from cheekbone through jaw into the snout, never a glued-on color sphere.
    part('jawFillL','sphere','head',[-.295,-.265,.175],[.285,.255,.355],'fur',.985),
    part('jawFillR','sphere','head',[.295,-.265,.175],[.285,.255,.355],'fur',.985),
    part('snoutRoot','sphere','head',[0,-.205,.495],[.388,.255,.268],'fur',.98),
    part('earL','sphere','earL',[0,0,0],[.255,.27,.205],'fur',.98),
    part('earR','sphere','earR',[0,0,0],[.255,.27,.205],'fur',.98),
    part('innerEarL','sphere','earL',[0,-.008,.188],[.145,.155,.030],'innerEar',.99),
    part('innerEarR','sphere','earR',[0,-.008,.188],[.145,.155,.030],'innerEar',.99),
    part('muzzlePad','sphere','head',[0,-.205,.515],[.300,.190,.102],'muzzle',.99),
    part('muzzleL','sphere','head',[-.112,-.25,.580],[.113,.090,.087],'muzzle',.99),
    part('muzzleR','sphere','head',[.112,-.25,.580],[.113,.090,.087],'muzzle',.99),
    part('noseBridge','sphere','head',[0,-.115,.685],[.073,.042,.028],'muzzleDark',.98),
    part('nose','prism','head',[0,-.164,.762],[.097,.068,.064],'eyes',.16,[0,0,Math.PI]),
    part('eyeL','sphere','head',[-.205,.115,.555],[.066,.083,.060],'eyes',.08),
    part('eyeR','sphere','head',[.205,.115,.555],[.066,.083,.060],'eyes',.08),
    part('catchL','sphere','head',[-.184,.147,.612],[.014,.018,.009],'highlight',.03),
    part('catchR','sphere','head',[.226,.147,.612],[.014,.018,.009],'highlight',.03),
    part('browL','capsule','head',[-.205,.265,.555],[.062,.013,.014],'brow',.72,[0,0,.10],{expressive:true}),
    part('browR','capsule','head',[.205,.265,.555],[.062,.013,.014],'brow',.72,[0,0,-.10],{expressive:true}),
    part('noseStem','capsule','head',[0,-.272,.747],[.009,.032,.009],'mouth',.70,[0,0,0],{mouth:true}),
    part('upperLipL','capsule','head',[-.047,-.310,.747],[.052,.006,.008],'mouth',.70,[0,0,-.31],{mouth:true}),
    part('upperLipR','capsule','head',[.047,-.310,.747],[.052,.006,.008],'mouth',.70,[0,0,.31],{mouth:true}),
    part('mouthCavity','sphere','jaw',[0,.012,.105],[.125,.018,.027],'mouthCavity',.88,[0,0,0],{jaw:true}),
    part('lowerLip','capsule','jaw',[0,-.005,.113],[.095,.006,.011],'mouth',.76,[0,0,0],{jaw:true}),
    part('tongue','sphere','jaw',[0,.005,.116],[.060,.004,.011],'tongue',.90,[0,0,0],{jaw:true}),

    // Shoulder/elbow/wrist spheres fill capsule intersections so motion remains plush instead of mechanical.
    part('shoulderSocketL','sphere','shoulderL',[0,-.02,0],[.235,.245,.235],'fur',.99),
    part('shoulderSocketR','sphere','shoulderR',[0,-.02,0],[.235,.245,.235],'fur',.99),
    part('upperArmL','capsule','shoulderL',[0,-.25,.025],[.225,.34,.225],'fur',.98),
    part('upperArmR','capsule','shoulderR',[0,-.25,.025],[.225,.34,.225],'fur',.98),
    part('elbowPadL','sphere','elbowL',[0,0,.025],[.205,.205,.205],'fur',.99),
    part('elbowPadR','sphere','elbowR',[0,0,.025],[.205,.205,.205],'fur',.99),
    part('forearmL','capsule','elbowL',[0,-.205,.075],[.195,.285,.200],'fur',.98),
    part('forearmR','capsule','elbowR',[0,-.205,.075],[.195,.285,.200],'fur',.98),
    part('wristPadL','sphere','wristL',[0,0,.04],[.185,.18,.19],'fur',.99),
    part('wristPadR','sphere','wristR',[0,0,.04],[.185,.18,.19],'fur',.99),
    part('pawL','sphere','wristL',[0,-.04,.09],[.205,.18,.22],'fur',.99),
    part('pawR','sphere','wristR',[0,-.04,.09],[.205,.18,.22],'fur',.99),

    // Grounded legs have a full hip-knee-ankle chain. The foot is shorter and narrower than v5 so it no longer dominates the silhouette.
    part('hipSocketL','sphere','hipL',[0,0,0],[.295,.30,.295],'fur',.99),
    part('hipSocketR','sphere','hipR',[0,0,0],[.295,.30,.295],'fur',.99),
    part('thighL','capsule','hipL',[0,-.18,.015],[.285,.28,.29],'fur',.99),
    part('thighR','capsule','hipR',[0,-.18,.015],[.285,.28,.29],'fur',.99),
    part('kneePadL','sphere','kneeL',[0,0,.03],[.245,.23,.25],'fur',.99),
    part('kneePadR','sphere','kneeR',[0,0,.03],[.245,.23,.25],'fur',.99),
    part('shinL','capsule','kneeL',[0,-.18,.055],[.235,.245,.24],'fur',.99),
    part('shinR','capsule','kneeR',[0,-.18,.055],[.235,.245,.24],'fur',.99),
    part('anklePadL','sphere','ankleL',[0,0,.10],[.225,.18,.24],'fur',.99),
    part('anklePadR','sphere','ankleR',[0,0,.10],[.225,.18,.24],'fur',.99),
    part('footL','sphere','ankleL',[0,-.045,.31],[.31,.18,.39],'fur',.99,[.04,0,-.01]),
    part('footR','sphere','ankleR',[0,-.045,.31],[.31,.18,.39],'fur',.99,[.04,0,.01]),
    part('footPadL','sphere','ankleL',[0,-.038,.642],[.205,.105,.025],'paw',.99),
    part('footPadR','sphere','ankleR',[0,-.038,.642],[.205,.105,.025],'paw',.99),
    part('toeL1','sphere','ankleL',[-.095,.020,.665],[.036,.030,.010],'pawDark',.99),
    part('toeL2','sphere','ankleL',[0,.032,.672],[.036,.030,.010],'pawDark',.99),
    part('toeL3','sphere','ankleL',[.095,.020,.665],[.036,.030,.010],'pawDark',.99),
    part('toeR1','sphere','ankleR',[-.095,.020,.665],[.036,.030,.010],'pawDark',.99),
    part('toeR2','sphere','ankleR',[0,.032,.672],[.036,.030,.010],'pawDark',.99),
    part('toeR3','sphere','ankleR',[.095,.020,.665],[.036,.030,.010],'pawDark',.99)
  ];
  return {groups,parts,bounds:TEDDY_BOUNDS,floorY:FLOOR_Y};
}

export function cameraPlan(width,height){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),aspect=w/h,fov=.50,tan=Math.tan(fov/2);
  const spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],spanX=TEDDY_BOUNDS.max[0]-TEDDY_BOUNDS.min[0];
  const targetY=aspect<.62?.61:.64,targetX=aspect<.62?.73:.74;
  const dY=spanY/(2*tan*targetY),dX=spanX/(2*tan*aspect*targetX),distance=Math.max(dY,dX);
  const visibleY=2*distance*tan,visibleX=visibleY*aspect;
  const geometricCenter=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2;
  const centerY=geometricCenter-.17;
  const eye=[0,centerY+.15,distance],target=[0,centerY-.01,0];
  return {aspect,fov,distance,centerY,eye,target,occupancyY:spanY/visibleY,occupancyX:spanX/visibleX,limiter:dX>dY?'horizontal':'vertical'};
}

export function archetypeMetrics(model=buildTeddyArchetype()){
  const byId=new Map(model.parts.map(p=>[p.id,p]));
  const pair=(a,b)=>{const A=byId.get(a),B=byId.get(b);return !!A&&!!B&&Math.abs(A.pos[0]+B.pos[0])<1e-5&&Math.abs(A.scale[0]-B.scale[0])<1e-5};
  const head=byId.get('headShell'),torso=byId.get('torso'),ear=byId.get('earR');
  const earOverlap=(head?.scale[0]||0)-((model.groups.earR?.pos[0]||0)-(ear?.scale[0]||0));
  const jointGroups=['neck','head','jaw','shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','hipL','hipR','kneeL','kneeR','ankleL','ankleR'];
  return {
    partCount:model.parts.length,groupCount:Object.keys(model.groups).length,geometryKinds:new Set(model.parts.map(p=>p.geometry)).size,
    bilateralPairs:[['earL','earR'],['innerEarL','innerEarR'],['eyeL','eyeR'],['forearmL','forearmR'],['thighL','thighR'],['footL','footR']].filter(([a,b])=>pair(a,b)).length,
    extendedPairs:[['cheekL','cheekR'],['muzzleL','muzzleR'],['browPadL','browPadR'],['shoulderSocketL','shoulderSocketR'],['elbowPadL','elbowPadR'],['hipSocketL','hipSocketR'],['kneePadL','kneePadR'],['shinL','shinR']].filter(([a,b])=>pair(a,b)).length,
    faceProjectsForward:byId.get('nose').pos[2]>byId.get('muzzlePad').pos[2]&&byId.get('muzzlePad').pos[2]>head.pos[2],
    hasBearTriangle:byId.has('eyeL')&&byId.has('eyeR')&&byId.has('nose'),hasCatchlights:byId.has('catchL')&&byId.has('catchR'),hasPawPads:byId.has('footPadL')&&byId.has('footPadR'),hasInnerEars:byId.has('innerEarL')&&byId.has('innerEarR'),
    mouthLayers:['noseStem','upperLipL','upperLipR','mouthCavity','lowerLip','tongue'].filter(id=>byId.has(id)).length,layeredMouth:['upperLipL','upperLipR','mouthCavity','lowerLip','tongue'].every(id=>byId.has(id)),
    headToTorsoRatio:(head?.scale[0]||0)/(torso?.scale[0]||1),earSkullOverlap:earOverlap,morphologySearchIterations:MORPHOLOGY_V5.searchIterations,
    anatomySearchIterations:ANATOMY_V6.searchIterations,jointCount:jointGroups.filter(id=>model.groups[id]).length,
    fullArmChain:['shoulderL','elbowL','wristL','shoulderR','elbowR','wristR'].every(id=>model.groups[id]),
    fullLegChain:['hipL','kneeL','ankleL','hipR','kneeR','ankleR'].every(id=>model.groups[id]),
    hasNeck:!!model.groups.neck&&!!byId.get('neckRoll'),grounded:Math.abs(model.floorY-FLOOR_Y)<1e-9
  };
}

const part=(id,geometry,parent,pos,scale,material,roughness=.88,rot=[0,0,0],flags={})=>({id,geometry,parent,pos,scale,material,roughness,rot,...flags});

export const TEDDY_BOUNDS={min:[-1.28,-1.47,-.78],max:[1.28,2.12,1.18]};
export const TEDDY_PROPORTIONS=Object.freeze({
  torso:[.76,.94,.61],belly:[.714,.73,.62],pelvis:[.66,.42,.56],head:[.760,.706,.68],
  muzzle:[.424,.262,.277],ear:[.257,.30,.19],eyeX:.255,eyeY:.085,armX:.69,legX:.38
});

export function buildTeddyArchetype(){
  const groups={
    root:{parent:null,pos:[0,0,0],rot:[0,0,0]},
    head:{parent:'root',pos:[0,1.22,.02],rot:[0,0,0]},
    jaw:{parent:'head',pos:[0,-.37,.78],rot:[0,0,0]},
    earL:{parent:'head',pos:[-.545,.438,.00],rot:[0,-.03,-.10]},earR:{parent:'head',pos:[.545,.438,.00],rot:[0,.03,.10]},
    shoulderL:{parent:'root',pos:[-.665,.35,.02],rot:[0,.02,-.34]},shoulderR:{parent:'root',pos:[.665,.35,.02],rot:[0,-.02,.34]},
    forearmL:{parent:'shoulderL',pos:[-.09,-.48,.08],rot:[0,.08,.12]},forearmR:{parent:'shoulderR',pos:[.09,-.48,.08],rot:[0,-.08,-.12]},
    hipL:{parent:'root',pos:[-.360,-.73,.02],rot:[.03,0,-.06]},hipR:{parent:'root',pos:[.360,-.73,.02],rot:[.03,0,.06]}
  };
  const parts=[
    // Core plush mass: a single pear mesh avoids intersection seams across the torso.
    part('torsoShell','pear','root',[0,-.18,-.02],[.79,1.08,.64],'fur',.95),
    part('tail','sphere','root',[0,-.57,-.59],[.21,.23,.18],'fur',.96),

    // Head and face.
    part('headShell','sphere','head',[0,0,0],[.760,.706,.68],'fur',.93),
    part('templeL','sphere','head',[-.42,.05,.20],[.36,.43,.42],'fur',.95),part('templeR','sphere','head',[.42,.05,.20],[.36,.43,.42],'fur',.95),
    part('cheekL','sphere','head',[-.33,-.20,.42],[.38,.31,.34],'fur',.96),part('cheekR','sphere','head',[.33,-.20,.42],[.38,.31,.34],'fur',.96),
    part('earL','sphere','earL',[0,0,0],[.257,.30,.19],'fur',.96),part('earR','sphere','earR',[0,0,0],[.257,.30,.19],'fur',.96),
    part('earRimL','sphere','earL',[0,-.004,.142],[.188,.210,.030],'furDark',.98),part('earRimR','sphere','earR',[0,-.004,.142],[.188,.210,.030],'furDark',.98),
    part('innerEarL','sphere','earL',[0,-.005,.160],[.155,.175,.034],'innerEar',.99),part('innerEarR','sphere','earR',[0,-.005,.160],[.155,.175,.034],'innerEar',.99),
    part('muzzleBase','sphere','head',[0,-.235,.61],[.424,.262,.277],'muzzle',.99),
    part('muzzleL','sphere','head',[-.16,-.235,.68],[.30,.23,.24],'muzzle',.99),part('muzzleR','sphere','head',[.16,-.235,.68],[.30,.23,.24],'muzzle',.99),
    part('chin','sphere','jaw',[0,-.035,.075],[.27,.145,.13],'muzzle',.99),
    part('noseBridge','sphere','head',[0,-.075,.755],[.18,.135,.13],'muzzleDark',.98),
    part('nose','sphere','head',[0,-.115,.935],[.160,.108,.092],'nose',.36),
    part('noseHighlight','sphere','head',[.050,-.080,1.010],[.024,.014,.010],'highlight',.06),
    part('eyeSocketL','sphere','head',[-.264,.085,.648],[.083,.100,.024],'furDark',.96),part('eyeSocketR','sphere','head',[.264,.085,.648],[.083,.100,.024],'furDark',.96),
    part('eyeL','sphere','head',[-.264,.085,.685],[.072,.089,.064],'eyes',.18),part('eyeR','sphere','head',[.264,.085,.685],[.072,.089,.064],'eyes',.18),
    part('catchL','sphere','head',[-.240,.112,.747],[.015,.019,.010],'highlight',.04),part('catchR','sphere','head',[.288,.112,.747],[.015,.019,.010],'highlight',.04),
    part('browL','capsule','head',[-.255,.262,.695],[.130,.014,.014],'furDark',.82,[0,0,.10],{expressive:true}),part('browR','capsule','head',[.255,.262,.695],[.130,.014,.014],'furDark',.82,[0,0,-.10],{expressive:true}),
    part('mouthCavity','sphere','jaw',[0,.015,.105],[.205,.040,.038],'mouthCavity',.62,[0,0,0],{jaw:true}),
    part('upperLipL','capsule','head',[-.075,-.398,.865],[.105,.018,.018],'mouth',.50,[0,0,-.38],{mouth:true}),part('upperLipR','capsule','head',[.075,-.398,.865],[.105,.018,.018],'mouth',.50,[0,0,.38],{mouth:true}),
    part('lowerLip','capsule','jaw',[0,-.005,.165],[.17,.016,.016],'mouth',.52,[0,0,0],{jaw:true}),
    part('tongue','sphere','jaw',[0,-.006,.105],[.105,.020,.016],'tongue',.78,[0,0,0],{jaw:true}),

    // Arms: shoulder -> forearm -> paw, deliberately forward of torso.
    part('upperArmL','capsule','shoulderL',[0,-.25,.03],[.285,.47,.285],'fur',.95),part('upperArmR','capsule','shoulderR',[0,-.25,.03],[.285,.47,.285],'fur',.95),
    part('forearmL','capsule','forearmL',[.03,-.22,.09],[.29,.39,.29],'fur',.95),part('forearmR','capsule','forearmR',[-.03,-.22,.09],[.29,.39,.29],'fur',.95),
    part('handL','sphere','forearmL',[.08,-.49,.29],[.315,.29,.26],'fur',.96),part('handR','sphere','forearmR',[-.08,-.49,.29],[.315,.29,.26],'fur',.96),
    part('handPadL','sphere','forearmL',[.08,-.50,.505],[.17,.145,.035],'paw',.99),part('handPadR','sphere','forearmR',[-.08,-.50,.505],[.17,.145,.035],'paw',.99),
    part('thumbPadL','sphere','forearmL',[-.035,-.525,.535],[.040,.033,.013],'pawDark',.99),part('thumbPadR','sphere','forearmR',[.035,-.525,.535],[.040,.033,.013],'pawDark',.99),
    part('fingerPadL1','sphere','forearmL',[-.04,-.42,.535],[.040,.035,.014],'pawDark',.99),part('fingerPadL2','sphere','forearmL',[.08,-.405,.545],[.040,.035,.014],'pawDark',.99),part('fingerPadL3','sphere','forearmL',[.20,-.43,.53],[.040,.035,.014],'pawDark',.99),
    part('fingerPadR1','sphere','forearmR',[-.20,-.43,.53],[.040,.035,.014],'pawDark',.99),part('fingerPadR2','sphere','forearmR',[-.08,-.405,.545],[.040,.035,.014],'pawDark',.99),part('fingerPadR3','sphere','forearmR',[.04,-.42,.535],[.040,.035,.014],'pawDark',.99),

    // Legs and forward-facing feet.
    part('thighL','sphere','hipL',[0,-.23,-.07],[.39,.44,.40],'fur',.96),part('thighR','sphere','hipR',[0,-.23,-.07],[.39,.44,.40],'fur',.96),
    part('shinL','capsule','hipL',[0,-.45,.02],[.34,.36,.35],'fur',.96,[.10,0,0]),part('shinR','capsule','hipR',[0,-.45,.02],[.34,.36,.35],'fur',.96,[.10,0,0]),
    part('footL','sphere','hipL',[0,-.59,.43],[.43,.29,.482],'fur',.96,[.12,0,-.02]),part('footR','sphere','hipR',[0,-.59,.43],[.43,.29,.482],'fur',.96,[.12,0,.02]),
    part('footPadL','sphere','hipL',[0,-.57,.775],[.245,.175,.045],'paw',.99),part('footPadR','sphere','hipR',[0,-.57,.775],[.245,.175,.045],'paw',.99),
    part('heelPadL','sphere','hipL',[0,-.650,.815],[.075,.052,.014],'pawDark',.99),part('heelPadR','sphere','hipR',[0,-.650,.815],[.075,.052,.014],'pawDark',.99),
    part('toeL1','sphere','hipL',[-.15,-.47,.815],[.060,.050,.018],'pawDark',.99),part('toeL2','sphere','hipL',[0,-.45,.825],[.060,.050,.018],'pawDark',.99),part('toeL3','sphere','hipL',[.15,-.47,.815],[.060,.050,.018],'pawDark',.99),
    part('toeR1','sphere','hipR',[-.15,-.47,.815],[.060,.050,.018],'pawDark',.99),part('toeR2','sphere','hipR',[0,-.45,.825],[.060,.050,.018],'pawDark',.99),part('toeR3','sphere','hipR',[.15,-.47,.815],[.060,.050,.018],'pawDark',.99),
  ];
  return {groups,parts,bounds:TEDDY_BOUNDS};
}

export function cameraPlan(width,height){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),aspect=w/h,fov=.62,tan=Math.tan(fov/2);
  const spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],spanX=TEDDY_BOUNDS.max[0]-TEDDY_BOUNDS.min[0];
  const targetY=.755,targetX=.80,dY=spanY/(2*tan*targetY),dX=spanX/(2*tan*aspect*targetX),distance=Math.max(dY,dX);
  const visibleY=2*distance*tan,visibleX=visibleY*aspect,centerY=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2+.03;
  return {aspect,fov,distance,centerY,occupancyY:spanY/visibleY,occupancyX:spanX/visibleX,limiter:dX>dY?'horizontal':'vertical'};
}

export function archetypeMetrics(model=buildTeddyArchetype()){
  const byId=new Map(model.parts.map(p=>[p.id,p]));
  const pair=(a,b)=>{const A=byId.get(a),B=byId.get(b);return !!A&&!!B&&Math.abs(A.scale[0]-B.scale[0])<1e-6&&Math.abs(A.scale[1]-B.scale[1])<1e-6};
  const primary=[['earL','earR'],['innerEarL','innerEarR'],['eyeL','eyeR'],['upperArmL','upperArmR'],['thighL','thighR'],['footPadL','footPadR']];
  const extended=[['cheekL','cheekR'],['muzzleL','muzzleR'],['eyeSocketL','eyeSocketR'],['earRimL','earRimR'],['forearmL','forearmR'],['handL','handR'],['handPadL','handPadR'],['footL','footR'],['heelPadL','heelPadR']];
  const head=byId.get('headShell'),torso=byId.get('torsoShell');
  return {
    partCount:model.parts.length,groupCount:Object.keys(model.groups).length,geometryKinds:new Set(model.parts.map(p=>p.geometry)).size,
    bilateralPairs:primary.filter(([a,b])=>pair(a,b)).length,extendedPairs:extended.filter(([a,b])=>pair(a,b)).length,
    faceProjectsForward:byId.get('nose').pos[2]>byId.get('muzzleBase').pos[2]&&byId.get('muzzleBase').pos[2]>head.pos[2],
    earEmergence:Math.abs(model.groups.earL.pos[0])>.52&&model.groups.earL.pos[1]>.40,
    eyeNoseTriangle:Math.abs(byId.get('eyeL').pos[0])>.22&&byId.get('nose').pos[1]<byId.get('eyeL').pos[1],
    hasCatchlights:byId.has('catchL')&&byId.has('catchR'),hasPawPads:byId.has('handPadL')&&byId.has('handPadR')&&byId.has('footPadL')&&byId.has('footPadR'),hasInnerEars:byId.has('innerEarL')&&byId.has('innerEarR'),
    pawDetail:['thumbPadL','thumbPadR','heelPadL','heelPadR','toeL1','toeL2','toeL3','toeR1','toeR2','toeR3'].every(x=>byId.has(x)),
    mouthLayers:['upperLipL','upperLipR','mouthCavity','lowerLip','tongue'].filter(x=>byId.has(x)).length,
    headToTorsoRatio:head.scale[0]/(torso.scale[0]*.92),headToTorsoWidth:head.scale[0]/torso.scale[0]
  };
}

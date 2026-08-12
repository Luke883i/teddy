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
    jaw:{parent:'head',pos:[0,-.30,.78],rot:[0,0,0]},
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
    part('earL','sphere','earL',[0,0,0],[.255,.27,.205],'fur',.98),
    part('earR','sphere','earR',[0,0,0],[.255,.27,.205],'fur',.98),
    part('innerEarL','sphere','earL',[0,-.008,.188],[.145,.155,.030],'innerEar',.99),
    part('innerEarR','sphere','earR',[0,-.008,.188],[.145,.155,.030],'innerEar',.99),
    part('muzzlePad','sphere','head',[0,-.18,.595],[.35,.245,.245],'muzzle',.99),
    part('muzzleL','sphere','head',[-.115,-.23,.655],[.145,.125,.155],'muzzle',.99),
    part('muzzleR','sphere','head',[.115,-.23,.655],[.145,.125,.155],'muzzle',.99),
    part('noseBridge','sphere','head',[0,-.10,.735],[.105,.080,.070],'muzzleDark',.98),
    part('nose','prism','head',[0,-.16,.845],[.112,.075,.070],'eyes',.16,[0,0,Math.PI]),
    part('eyeL','sphere','head',[-.205,.115,.555],[.066,.083,.060],'eyes',.08),
    part('eyeR','sphere','head',[.205,.115,.555],[.066,.083,.060],'eyes',.08),
    part('catchL','sphere','head',[-.184,.147,.612],[.014,.018,.009],'highlight',.03),
    part('catchR','sphere','head',[.226,.147,.612],[.014,.018,.009],'highlight',.03),
    part('browL','capsule','head',[-.205,.265,.555],[.062,.013,.014],'brow',.72,[0,0,.10],{expressive:true}),
    part('browR','capsule','head',[.205,.265,.555],[.062,.013,.014],'brow',.72,[0,0,-.10],{expressive:true}),
    part('noseStem','capsule','head',[0,-.285,.855],[.010,.045,.010],'mouth',.70,[0,0,0],{mouth:true}),
    part('upperLipL','capsule','head',[-.047,-.332,.862],[.052,.006,.010],'mouth',.70,[0,0,-.31],{mouth:true}),
    part('upperLipR','capsule','head',[.047,-.332,.862],[.052,.006,.010],'mouth',.70,[0,0,.31],{mouth:true}),
    part('mouthCavity','sphere','jaw',[0,.012,.105],[.125,.018,.027],'mouthCavity',.88,[0,0,0],{jaw:true}),
    part('lowerLip','capsule','jaw',[0,-.005,.122],[.095,.006,.011],'mouth',.76,[0,0,0],{jaw:true}),
    part('tongue','sphere','jaw',[0,.005,.132],[.060,.004,.011],'tongue',.90,[0,0,0],{jaw:true}),

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
    part('toeR1','spher','ankleR',[-.095,.020,.665],[.036,.030,.010],'pawDark',.99),
    part('toeR2','sphere','ankleR',[0,.032,.672],[.036,.030,.010],'pawDark',.99),
    part('toeR3','sphere','ankleR',[.095,.020,.665],[.036,.030,.010],'pawDark',.99)
  ];
  return {groups,parts,bounds:TEDDY_BOUNDS,floorY:FLOOR_Y};
}

export function cameraPlan(width,height){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),aspect=w/h,fov=.50,tan=Math.tan(fov/2);
  const spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1],spanX=TEDDY_BOUNDS.max[0]-TEDDY_BOUNDS.min[0];
  const targetY=aspect<.62?.70:.71,targetX=aspect<.62?.84:.82;
  const dY=spanY/(2*tan*targetY),dX=spanX/(2*tan*aspect*targetX),distance=Math.max(dY,dX);
  const visibleY=2*distance*tan,visibleX=visibleY*aspect;
  const geometricCenter=(TEDDY_BOUNDS.max[1]+TEDDY_BOUNDS.min[1])/2;
  const centerY=geometricCenter-.17;
  const eye=[0,centerY+.15,distance],target=[0,centerY-.01,0];
  return {aspect,fov,distance,centerY,eye,target,occupancyY:spanY/visibleY,occupancyX:spanX/visibleX,limiter:dX>dY?'horizontal':'vertical'};
}

export function archetypeMetrics(model=buildTeddyArchetype()){
  const byId=new Map(model.parts.map(p=>[p.id,p]));
  const pair=(a,b)=>{const A=byId.get(a),B=byId.get(b);return !!A&&!!B&&dF‚æ'2„ç÷5³Ò´"ç÷5³Ò“ÃRÓRbdÖF‚æ'2„ç66ÆU³ÒÔ"ç66ÆU³Ò“ÃRÓWÓ°¢6öç7B†VCÖ'”–BævWB‚v†VE6†VÆÂr’ÇF÷'6óÖ'”–BævWB‚wF÷'6òr’ÆV#Ö'”–BævWB‚vV%"r“°¢6öç7BV$÷fW&ÆÒ††VCòç66ÆU³×ÇÃ’Ò‚†ÖöFVÂæw&÷W2æV%#òç÷5³×ÇÃ’Ò†V#òç66ÆU³×ÇÃ’“°¢6öç7B¦ö–çDw&÷W3Õ²væV6²rÂv†VBrÂv¦rrÂw6†÷VÆFW$ÂrÂw6†÷VÆFW%"rÂvVÆ&÷tÂrÂvVÆ&÷u"rÂww&—7DÂrÂww&—7E"rÂv†—ÂrÂv†—"rÂv¶æVTÂrÂv¶æVU"rÂvæ¶ÆTÂrÂvæ¶ÆU"uÓ°¢&WGW&â°¢'D6÷VçC¦ÖöFVÂç'G2æÆVæwF‚Æw&÷W6÷VçC¤ö&¦V7Bæ¶W—2†ÖöFVÂæw&÷W2’æÆVæwF‚ÆvVöÖWG'”¶–æG3¦æWr6WB†ÖöFVÂç'G2æÖ‡ÓçævVöÖWG'’’’ç6—¦RÀ¢&–ÆFW&Å—'3¥µ²vV$ÂrÂvV%"uÒÅ²v–ææW$V$ÂrÂv–ææW$V%"uÒÅ²vW–TÂrÂvW–U"uÒÅ²vf÷&V&ÔÂrÂvf÷&V&Õ"uÒÅ²wF†–v„ÂrÂwF†–v…"uÒÅ²vfö÷DÂrÂvfö÷E"uÕÒæf–ÇFW"‚…¶Æ%Ò“Óç—"†Æ"’’æÆVæwF‚À¢W‡FVæFVE—'3¥µ²v6†VV´ÂrÂv6†VVµ"uÒÅ²v×W§¦ÆTÂrÂv×W§¦ÆU"uÒÅ²v'&÷uDÂrÂv'&÷uE"uÒÅ²w6†÷VÆFW%6ö6¶WDÂrÂw6†÷VÆFW%6ö6¶WE"uÒÅ²vVÆ&÷uDÂrÂvVÆ&÷uE"uÒÅ²v†—6ö6¶WDÂrÂv†—6ö6¶WE"uÒÅ²v¶æVUDÂrÂv¶æVUE"uÒÅ²w6†–äÂrÂw6†–å"uÕÒæf–ÇFW"‚…¶Æ%Ò“Óç—"†Æ"’’æÆVæwF‚À¢f6U&ö¦V7G4f÷'v&C¦'”–BævWB‚væ÷6Rr’ç÷5³%Óæ'”–BævWB‚v×W§¦ÆUBr’ç÷5³%Òbf'”–BævWB‚v×W§¦ÆUBr’ç÷5³%Óæ†VBç÷5³%ÒÀ¢†4&V%G&–ævÆS¦'”–Bæ†2‚vW–TÂr’bf'”–Bæ†2‚vW–U"r’bf'”–Bæ†2‚væ÷6Rr’Æ†46F6†Æ–v‡G3¦'”–Bæ†2‚v6F6„Âr’bf'”–Bæ†2‚v6F6…"r’Æ†5uG3¦'”–Bæ†2‚vfö÷EDÂr’bf'”–Bæ†2‚vfö÷EE"r’Æ†4–ææW$V'3¦'”–Bæ†2‚v–ææW$V$Âr’bf'”–Bæ†2‚v–ææW$V%"r’À¢Ö÷WF„Æ–W'3¥²væ÷6U7FVÒrÂwWW$Æ—ÂrÂwWW$Æ—"rÂvÖ÷WF„6f—G’rÂvÆ÷vW$Æ—rÂwFöæwVRuÒæf–ÇFW"†–CÓæ'”–Bæ†2†–B’’æÆVæwF‚ÆÆ–W&VDÖ÷WFƒ¥²wWW$Æ—ÂrÂwWW$Æ—"rÂvÖ÷WF„6f—G’rÂvÆ÷vW$Æ—rÂwFöæwVRuÒæWfW'’†–CÓæ'”–Bæ†2†–B’’À¢†VEFõF÷'6õ&F–ó¢††VCòç66ÆU³×ÇÃ’ò‡F÷'6óòç66ÆU³×ÇÃ’ÆV%6·VÆÄ÷fW&Æ¦V$÷fW&ÆÆÖ÷'†öÆöw•6V&6„—FW&F–öç3¤Ôõ%„ôÄôu•õcRç6V&6„—FW&F–öç2À¢æFö×•6V&6„—FW&F–öç3¤äDôÕ•õcbç6V&6„—FW&F–öç2Æ¦ö–çD6÷VçC¦¦ö–çDw&÷W2æf–ÇFW"†–CÓæÖöFVÂæw&÷W5¶–EÒ’æÆVæwF‚À¢gVÆÄ&Ô6†–ã¥²w6†÷VÆFW$ÂrÂvVÆ&÷tÂrÂww&—7DÂrÂw6†÷VÆFW%"rÂvVÆ&÷u"rÂww&—7E"uÒæWfW'’†–CÓæÖöFVÂæw&÷W5¶–EÒ’À¢gVÆÄÆVt6†–ã¥²v†—ÂrÂv¶æVTÂrÂvæ¶ÆTÂrÂv†—"rÂv¶æVU"rÂvæ¶ÆU"uÒæWfW'’†–CÓæÖöFVÂæw&÷W5¶–EÒ’À¢†4æV6³¢ÖöFVÂæw&÷W2ææV6²bb'”–BævWB‚væV6µ&öÆÂr’Æw&÷VæFVC¤ÖF‚æ'2†ÖöFVÂæfÆö÷%’ÔdÄôõ%õ’“ÃRÓ¢Ó°§Ğ
// V22 three-dimensional bear facial silhouette and material-support contracts.
// Head-local dimensions apply to the existing articulated V21 head region.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
export const FACIAL_VOLUME_V22=Object.freeze({
  version:22,
  snout:Object.freeze({pos:[0,-.205,.495],scale:[.388,.255,.268]}),
  lowerCheek:Object.freeze({x:.295,y:-.265,z:.175,scale:[.285,.255,.355]}),
  pigment:Object.freeze({width:.375,height:.235,centerY:-.205,frontLow:.435,frontHigh:.565}),
  target:Object.freeze({maxNoseProjection:.11,maximumSeparateMuzzleDepth:.14})
});
export const FLUSH_FACIAL_OVERLAYS_V22=Object.freeze([
  'muzzlePad','muzzleL','muzzleR','noseBridge','cheekDimpleL','cheekDimpleR'
]);
export function integratedFacialOverlay(id){return FLUSH_FACIAL_OVERLAYS_V22.includes(id)}
export function facePigmentWeight([x,y,z]){
  const p=FACIAL_VOLUME_V22.pigment,
    ellipse=(x/p.width)**2+((y-p.centerY)/p.height)**2;
  return (1-smooth(.70,1.28,ellipse))*smooth(p.frontLow,p.frontHigh,z);
}
export function restFacialCoordinates(composite,groups){
  const mesh=composite?.mesh,head=composite?.blocks?.find(x=>x.name==='head'),m=groups?.head;
  if(!mesh?.p||!head||!m||m.length!==16)throw Error('V22 needs canonical head block and bind matrix');
  const face=new Float32Array(mesh.p.length),origin=[m[12],m[13],m[14]];
  for(let v=head.start;v<head.start+head.count;v++){
    const b=3*v,dx=mesh.p[b]-origin[0],dy=mesh.p[b+1]-origin[1],dz=mesh.p[b+2]-origin[2];
    for(let axis=0;axis<3;axis++)face[b+axis]=dx*m[4*axis]+dy*m[4*axis+1]+dz*m[4*axis+2];
  }
  return face;
}
export function facialAnatomyReport(parts){
  const get=id=>parts.find(x=>x.id===id),nose=get('nose'),snout=get('snoutRoot'),
    skull=get('headShell'),muzzle=get('muzzlePad'),left=get('jawFillL'),right=get('jawFillR');
  if(!nose||!snout||!skull||!muzzle||!left||!right)
    return {pass:false,reason:'missing anatomical face primitives'};
  const snoutFront=snout.pos[2]+snout.scale[2],
    noseFront=nose.pos[2]+nose.scale[2],
    headFront=skull.pos[2]+skull.scale[2],
    separateFront=muzzle.pos[2]+muzzle.scale[2];
  const symmetry=Math.max(Math.abs(left.pos[0]+right.pos[0]),
    ...left.scale.map((v,i)=>Math.abs(v-right.scale[i])));
  const lip=get('noseStem'),mouth=get('upperLipL');
  const output={snoutFront,noseFront,headFront,separateFront,
    noseOverhang:noseFront-snoutFront,
    separateOverhang:separateFront-snoutFront,
    symmetry,
    mouthDepth:Math.max(lip?.pos[2]||0,mouth?.pos[2]||0)-snoutFront,
    jawSupport:Math.min(left.scale[2],right.scale[2])};
  return {...output,pass:symmetry<1e-6&&
    snoutFront>headFront+.075&&snoutFront<headFront+.19&&
    output.noseOverhang>.015&&output.noseOverhang<FACIAL_VOLUME_V22.target.maxNoseProjection&&
    output.separateOverhang<FACIAL_VOLUME_V22.target.maximumSeparateMuzzleDepth&&
    output.mouthDepth<.06&&output.jawSupport>.28};
}

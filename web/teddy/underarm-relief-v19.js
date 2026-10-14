// V19 local anatomy-aware negative space: an open underarm crease, not translucent masking.
// A single connected SDF body attaches at shoulder caps; below the cap, a rounded
// through-slot prevents smooth-union bridges from filling arm-to-torso negative space.
const finite=v=>Number.isFinite(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ARM_RELIEF_V19=Object.freeze({
  version:19,halfWidth:.082,topShoulderOffset:.135,lowerTorsoOffset:.83,
  depthMargin:.28,rounding:.018,minWidth:.055,maxWidth:.108
});
export function validReliefWidth(value){
  return Number.isFinite(value)&&value>=ARM_RELIEF_V19.minWidth&&value<=ARM_RELIEF_V19.maxWidth;
}
export function underarmCutters(primitives,options={}){
  if(!Array.isArray(primitives))return [];
  const torso=primitives.find(p=>p.id==='torso');
  if(!torso)return [];
  const halfWidth=Number(options.halfWidth??ARM_RELIEF_V19.halfWidth);
  if(!validReliefWidth(halfWidth))throw Error('underarm relief width outside safe contract');
  const result=[];
  for(const side of ['L','R']){
    const shoulder=primitives.find(p=>p.id==='shoulderSocket'+side);
    const upper=primitives.find(p=>p.id==='upperArm'+side);
    if(!shoulder||!upper)continue;
    const sign=side==='L'?-1:1;
    // The gap is on the MEDIAL face of the arm, below the physical shoulder
    // attachment. These landmarks are bind-pose world coordinates, not a
    // camera-space painted slit or a second free-floating surface.
    const x=upper.c[0]-sign*.118,
      top=shoulder.c[1]-ARM_RELIEF_V19.topShoulderOffset,
      bottom=torso.c[1]-ARM_RELIEF_V19.lowerTorsoOffset;
    if(![x,top,bottom].every(finite)||top<=bottom+.20)continue;
    const depth=Math.max(torso.r[2],upper.r[2])+ARM_RELIEF_V19.depthMargin;
    result.push(Object.freeze({id:'underarm'+side,side,x,top,bottom,
      z:torso.c[2],halfWidth,halfDepth:depth,
      rounding:ARM_RELIEF_V19.rounding}));
  }
  return result;
}
export function roundedSlotDistance(point,slot){
  // Signed distance to finite rounded box, with open sides in depth, rather
  // than a sealed internal pocket. Fits the existing marching-tetra field.
  const centerY=(slot.top+slot.bottom)/2,halfY=(slot.top-slot.bottom)/2;
  const q=[Math.abs(point[0]-slot.x)-(slot.halfWidth-slot.rounding),
    Math.abs(point[1]-centerY)-(halfY-slot.rounding),
    Math.abs(point[2]-slot.z)-(slot.halfDepth-slot.rounding)];
  const outside=Math.hypot(Math.max(q[0],0),Math.max(q[1],0),Math.max(q[2],0));
  return outside+Math.min(Math.max(...q),0)-slot.rounding;
}
export function applyUnderarmRelief(point,original,cutters=[]){
  let field=original;
  for(const slot of cutters)field=Math.max(field,-roundedSlotDistance(point,slot));
  return field;
}
export function reliefProbe(cutters,field){
  const sample=cutters.map(slot=>{
    const midY=Math.min(slot.top-.18,Math.max(slot.bottom+.18,(slot.top+slot.bottom)/2));
    const gap=[slot.x,midY,slot.z],
      torso=[0,midY,slot.z],
      arm=[slot.x+(slot.side==='L'?-.20:.20),midY,slot.z];
    return {id:slot.id,gap:field(gap),torso:field(torso),arm:field(arm),
      shoulderCap:field([slot.x,slot.top+.22,slot.z])};
  });
  return {cutters:cutters.length,samples:sample,
    pass:sample.length===2&&sample.every(x=>x.gap>.012&&x.torso<0&&x.arm<0)};
}

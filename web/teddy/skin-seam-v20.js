// V20: Anatomically continuous shoulder weights + local stretch limiter.
// All operations on the existing V16 indexed watertight surface; no fake alpha skin.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export const SHOULDER_SEAM_V20=Object.freeze({
  version:20,bandInner:.34,bandOuter:.77,collarLow:-.59,collarHigh:-.12,
  upperFade:.24,stretchLimit:1.85,passes:3,maxStep:.038
});
export function shoulderBand(point,shoulder){
  const dx=Math.abs(point[0]-shoulder[12]),dy=point[1]-shoulder[13],
    radial=1-smooth(.57,.82,Math.hypot(dx,dy*.65,point[2]-shoulder[14])),
    bottom=smooth(SHOULDER_SEAM_V20.collarLow,SHOULDER_SEAM_V20.collarHigh,dy),
    top=1-smooth(.16,SHOULDER_SEAM_V20.upperFade,dy);
  return clamp(radial*bottom*top,0,1);
}
export function softenShoulderBind(mesh,bind,groups){
  const {groupNames,groupIds,weights}=bind;
  const spine=groupNames.indexOf('spine');
  if(spine<0)throw Error('missing spine for shoulder continuity');
  let affected=0,maxJump=0;
  for(let side of ['L','R']){
    const joint=groupNames.indexOf('shoulder'+side),shoulder=groups['shoulder'+side];
    if(joint<0||!shoulder)throw Error('missing shoulder'+side);
    const sign=side==='L'?-1:1;
    for(let v=0;v<mesh.p.length/3;v++){
      const i=v*3,point=[mesh.p[i],mesh.p[i+1],mesh.p[i+2]];
      if(point[0]*sign<.20)continue;
      const band=shoulderBand(point,shoulder);
      if(band<.001)continue;
      const off=4*v;
      const current=[];
      for(let k=0;k<4;k++)if(weights[off+k]>1e-8)current.push([groupNames[groupIds[off+k]],weights[off+k]]);
      const valid=current.every(([name])=>name==='spine'||name==='pelvis'||name==='shoulder'+side);
      // Keep elbows, hands, facial and lower body rigged to their own chains.
      if(!valid)continue;
      const arm=smooth(.28,.86,Math.abs(point[0]-groups.spine[12]));
      const intended=clamp(.12+arm*.79,.12,.91);
      let old=0;for(const [name,w] of current)if(name==='shoulder'+side)old+=w;
      const newWeight=old+(intended-old)*band;
      const oldDiff=Math.abs(newWeight-old);
      maxJump=Math.max(maxJump,oldDiff);
      weights.fill(0,off,off+4);
      groupIds[off]=joint;weights[off]=newWeight;
      groupIds[off+1]=spine;weights[off+1]=1-newWeight;
      affected++;
    }
  }
  return {affected,maxAdjustment:maxJump};
}
export function seamEdgeGraph(mesh,groups){
  const edges=new Map(),p=mesh.p;
  for(let t=0;t<mesh.i.length;t+=3){
    for(const [a,b] of [[mesh.i[t],mesh.i[t+1]],[mesh.i[t+1],mesh.i[t+2]],[mesh.i[t+2],mesh.i[t]]]){
      const lo=Math.min(a,b),hi=Math.max(a,b),key=lo+','+hi;
      if(edges.has(key))continue;
      let band=0;
      for(const side of ['L','R']){
        const shoulder=groups['shoulder'+side];
        if(shoulder){
          const pa=[p[3*a],p[3*a+1],p[3*a+2]],pb=[p[3*b],p[3*b+1],p[3*b+2]];
          band=Math.max(band,Math.min(shoulderBand(pa,shoulder),shoulderBand(pb,shoulder)));
        }
      }
      if(band<.015)continue;
      const len=Math.hypot(p[3*a]-p[3*b],p[3*a+1]-p[3*b+1],p[3*a+2]-p[3*b+2]);
      if(len>1e-5)edges.set(key,{a,b,rest:len,band});
    }
  }
  return [...edges.values()];
}
export function seamStretch(positions,edges,limit=SHOULDER_SEAM_V20.stretchLimit){
  let high=0,max=0,finite=true;
  for(const {a,b,rest} of edges){
    const d=Math.hypot(positions[3*a]-positions[3*b],positions[3*a+1]-positions[3*b+1],positions[3*a+2]-positions[3*b+2]);
    if(!Number.isFinite(d)){finite=false;continue}
    const ratio=d/rest;max=Math.max(ratio,max);if(ratio>limit)high++;
  }
  return {edges:edges.length,high,maxStretch:max,finite};
}
export function constrainShoulderStretch(positions,edges,{passes=SHOULDER_SEAM_V20.passes,maxStep=SHOULDER_SEAM_V20.maxStep}={}){
  if(!edges.length)return {edges:0,corrected:0,before:0,after:0};
  const before=seamStretch(positions,edges),delta=new Float32Array(positions.length),
    count=new Float32Array(positions.length/3);let corrected=0;
  for(let pass=0;pass<passes;pass++){
    delta.fill(0);count.fill(0);
    for(const {a,b,rest,band} of edges){
      const ia=3*a,ib=3*b,x=positions[ib]-positions[ia],y=positions[ib+1]-positions[ia+1],z=positions[ib+2]-positions[ia+2],
        len=Math.hypot(x,y,z),allowed=rest*SHOULDER_SEAM_V20.stretchLimit;
      if(!Number.isFinite(len)||len<=allowed||len<1e-8)continue;
      const amplitude=Math.min(maxStep,(len-allowed)*.30)*band/len;
      for(let k=0;k<3;k++){
        const d=amplitude*(k===0?x:k===1?y:z);
        delta[ia+k]+=d;delta[ib+k]-=d;
      }
      count[a]++;count[b]++;corrected++;
    }
    for(let v=0;v<count.length;v++)if(count[v]){
      for(let k=0;k<3;k++)positions[3*v+k]+=delta[3*v+k]/count[v];
    }
  }
  const after=seamStretch(positions,edges);
  return {edges:edges.length,corrected,before:before.high,after:after.high,peakBefore:before.maxStretch,peakAfter:after.maxStretch,finite:after.finite};
}

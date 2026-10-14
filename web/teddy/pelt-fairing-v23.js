// V23 production bind-pose geometric fairing: Taubin two-pass, bounded
// displacement, strictly within each existing anatomical pelt component.
// Refines marching-tetra facets WITHOUT fusing arm↔torso or altering the rig.
export const PELT_FAIRING_V23=Object.freeze({
  version:23, iterations:2, lambda:.32, mu:-.34, displacementCap:.018,
  targetRegions:Object.freeze(['trunk','armL','armR','legL','legR']),
  maximumVolumeChange:.045
});
const length3=(a,b,c)=>Math.hypot(a,b,c);
function adjacency(mesh){
  const neighbors=Array.from({length:mesh.p.length/3},()=>new Set());
  const index=mesh.i;
  for(let k=0;k<index.length;k+=3){
    const a=index[k],b=index[k+1],c=index[k+2];
    if(a===b||b===c||a===c)throw Error('degenerate indexed triangle in pelt fairing');
    neighbors[a].add(b);neighbors[a].add(c);
    neighbors[b].add(a);neighbors[b].add(c);
    neighbors[c].add(a);neighbors[c].add(b);
  }
  return neighbors.map(s=>Uint32Array.from(s));
}
function laplaceEnergy(p,graph,start,end){
  let sum=0,n=0;
  for(let v=start;v<end;v++){
    const near=graph[v];if(!near?.length)continue;
    let x=0,y=0,z=0;
    for(const u of near){x+=p[3*u];y+=p[3*u+1];z+=p[3*u+2]}
    const k=1/near.length,dx=p[3*v]-x*k,dy=p[3*v+1]-y*k,dz=p[3*v+2]-z*k;
    sum+=dx*dx+dy*dy+dz*dz;n++;
  }
  return n?sum/n:0;
}
function signedVolume(p,i,start,end){
  let total=0;
  for(let j=0;j<i.length;j+=3){
    const a=i[j],b=i[j+1],c=i[j+2];
    if(a<start||a>=end)continue;
    const A=3*a,B=3*b,C=3*c;
    total+=p[A]*(p[B+1]*p[C+2]-p[B+2]*p[C+1])+
      p[A+1]*(p[B+2]*p[C]-p[B]*p[C+2])+
      p[A+2]*(p[B]*p[C+1]-p[B+1]*p[C]);
  }
  return Math.abs(total/6);
}
function fairStep(p,graph,start,end,rate,original,cap){
  const next=new Float32Array(p);
  for(let v=start;v<end;v++){
    const near=graph[v];if(!near?.length)continue;
    let x=0,y=0,z=0;for(const u of near){x+=p[3*u];y+=p[3*u+1];z+=p[3*u+2]}
    const inv=1/near.length,b=3*v;
    let tx=p[b]+rate*(x*inv-p[b]),ty=p[b+1]+rate*(y*inv-p[b+1]),tz=p[b+2]+rate*(z*inv-p[b+2]);
    const dx=tx-original[b],dy=ty-original[b+1],dz=tz-original[b+2],
      drift=length3(dx,dy,dz);
    if(drift>cap){const f=cap/drift;tx=original[b]+dx*f;ty=original[b+1]+dy*f;tz=original[b+2]+dz*f}
    next[b]=tx;next[b+1]=ty;next[b+2]=tz;
  }
  p.set(next);
}
export function validFairingParameters(opts){
  return Number.isInteger(opts.iterations)&&opts.iterations>=1&&opts.iterations<=3&&
    Number.isFinite(opts.lambda)&&opts.lambda>=.15&&opts.lambda<=.44&&
    Number.isFinite(opts.mu)&&opts.mu<=-.15&&opts.mu>=-.48&&
    Number.isFinite(opts.displacementCap)&&opts.displacementCap>=.005&&opts.displacementCap<=.03;
}
export function fairAnatomicalPelt(composite,params={}){
  const opts={...PELT_FAIRING_V23,...params};
  if(!validFairingParameters(opts))throw Error('outside V23 bounded fairing contract');
  if(!composite?.mesh?.p||!composite.mesh.i||!Array.isArray(composite.blocks))
    throw Error('missing real anatomical regions for fairing');
  const mesh=composite.mesh,graph=adjacency(mesh),rest=new Float32Array(mesh.p),
    targetSet=new Set(opts.targetRegions),regions=[];
  let changed=0,peakDisplacement=0;
  for(const b of composite.blocks){
    const start=b.start,end=start+b.count;
    const before=laplaceEnergy(mesh.p,graph,start,end);
    const v0=signedVolume(mesh.p,mesh.i,start,end);
    if(targetSet.has(b.name)){
      for(let iteration=0;iteration<opts.iterations;iteration++){
        fairStep(mesh.p,graph,start,end,opts.lambda,rest,opts.displacementCap);
        fairStep(mesh.p,graph,start,end,opts.mu,rest,opts.displacementCap);
      }
    }
    let localPeak=0,moved=0;
    for(let v=start;v<end;v++){
      const a=3*v,d=length3(mesh.p[a]-rest[a],mesh.p[a+1]-rest[a+1],mesh.p[a+2]-rest[a+2]);
      if(d>1e-6)moved++;localPeak=Math.max(localPeak,d);
      if(!Number.isFinite(d)||d>opts.displacementCap+1e-5)throw Error('fairing displaced anatomy too far '+b.name);
    }
    const after=laplaceEnergy(mesh.p,graph,start,end),v1=signedVolume(mesh.p,mesh.i,start,end);
    const relativeVolume=Math.abs(v1-v0)/Math.max(v0,1e-8);
    if(!Number.isFinite(after)||!Number.isFinite(v1)||relativeVolume>opts.maximumVolumeChange)
      throw Error('nonphysical fairing volume/curvature '+b.name+' '+JSON.stringify({v0,v1,before,after}));
    if(targetSet.has(b.name)&&!(after<before))
      throw Error('fairing did not improve regional mesh quality '+b.name+' '+JSON.stringify({before,after}));
    if(!targetSet.has(b.name)&&moved!==0)throw Error('untargeted facial region modified '+b.name);
    changed+=moved;peakDisplacement=Math.max(peakDisplacement,localPeak);
    regions.push({name:b.name,vertices:b.count,curvatureBefore:before,curvatureAfter:after,
      curvatureReduction:before?1-after/before:0,relativeVolume,peakDisplacement:localPeak,moved});
  }
  return {pass:changed>300&&regions.every(r=>Number.isFinite(r.curvatureReduction)),
    changed,peakDisplacement,regions,contract:'V23 bounded nonshrinking intra-region fairing'};
}

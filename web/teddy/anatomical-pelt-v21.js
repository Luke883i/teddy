// V21 anatomical pelt: independently CLOSED plush regions in one GPU indexed draw.
// This intentionally replaces V19 boolean underarm slots and V20 shoulder cross-body
// constraints in the VISUAL path. It does not remove the legacy proof surfaces.
import {extractImplicitMesh,meshTopology,primitiveDistance,vertexNormals} from './implicit-skin-v16.js';
import {buildTeddyArchetype} from './model.js';
const PELT=Object.freeze({
  trunk:['pelvisMass','torso','chest','neckRoll','tail'],
  head:['headShell','browPadL','browPadR','cheekL','cheekR','jawFillL','jawFillR','snoutRoot','earL','earR'],
  armL:['shoulderSocketL','upperArmL','elbowPadL','forearmL','wristPadL','pawL'],
  armR:['shoulderSocketR','upperArmR','elbowPadR','forearmR','wristPadR','pawR'],
  legL:['hipSocketL','thighL','kneePadL','shinL','anklePadL','footL'],
  legR:['hipSocketR','thighR','kneePadR','shinR','anklePadR','footR']
});
export const ANATOMICAL_PELT_V21=Object.freeze({version:21,regions:Object.keys(PELT),voxel:.060,smoothing:.145,roundingMode:'independent-closed-sdf-regions',singleGPUBuffer:true,reason:'no arm-to-torso triangles, no V19 box cutters'});
const parent=Object.fromEntries(Object.entries(buildTeddyArchetype().groups).map(([id,g])=>[id,g.parent]));
const finite=x=>Number.isFinite(x);
export function regionOfPart(part){
  if(!part||part.material==='other')return null;
  return Object.keys(PELT).find(name=>PELT[name].includes(part.id))||null;
}
export function selectAnatomicalPelt(primitives){
  const output={};
  const seen=new Set();
  for(const name of ANATOMICAL_PELT_V21.regions){
    output[name]=primitives.filter(p=>PELT[name].includes(p.id));
    for(const p of output[name]){
      if(seen.has(p.id))throw Error('duplicated anatomical fur primitive '+p.id);
      seen.add(p.id);
    }
    if(!output[name].length)throw Error('missing anatomical fur region '+name);
  }
  const lost=primitives.filter(p=>!seen.has(p.id));
  if(lost.length)throw Error('unclassified fur geometry '+lost.map(x=>x.id).join(','));
  return output;
}
export function assemblePeltRegions(primitives,{voxel=ANATOMICAL_PELT_V21.voxel,smoothing=ANATOMICAL_PELT_V21.smoothing}={}){
  if(!finite(voxel)||voxel<.050||voxel>.095||!finite(smoothing)||smoothing<.095||smoothing>.19)
    throw Error('out-of-contract pelt extraction');
  const grouped=selectAnatomicalPelt(primitives),blocks=[],summaries=[];
  let offset=0;
  for(const [name,partList] of Object.entries(grouped)){
    // V19 cutter intentionally disabled: removes square, dark box walls.
    const roundedParts=partList.map(p=>({...p,power:Math.min(p.power,2.2)}));
    const mesh=extractImplicitMesh(roundedParts,{voxel,smoothing,underarmRelief:false});
    const topology=meshTopology(mesh);
    if(!topology.closed||topology.components!==1)
      throw Error('not a closed individual region: '+name+' '+JSON.stringify(topology));
    blocks.push({name,mesh,primitives:roundedParts,start:offset,count:mesh.p.length/3});
    summaries.push({name,...topology,start:offset});
    offset+=mesh.p.length/3;
  }
  const vertexCount=offset,triangles=blocks.reduce((n,x)=>n+x.mesh.i.length,0);
  const p=new Float32Array(vertexCount*3),i=new Uint32Array(triangles);
  let at=0,ix=0;
  for(const b of blocks){
    p.set(b.mesh.p,3*at);
    for(const n of b.mesh.i)i[ix++]=n+at;
    at+=b.count;
  }
  const combined={p,i,n:vertexNormals(p,i)};
  const topology=meshTopology(combined);
  if(!topology.closed||topology.components!==blocks.length)
    throw Error('composite pelt topology unsafe '+JSON.stringify(topology));
  return {mesh:combined,blocks,topology,regions:summaries,mode:'anatomical-pelt-v21'};
}
function invRigid(m,M4){
  const out=M4.identity();
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)out[4*col+row]=m[4*row+col];
  for(let row=0;row<3;row++)out[12+row]=-(out[row]*m[12]+out[4+row]*m[13]+out[8+row]*m[14]);
  return out;
}
function groupRegion(group){
  if(/^(shoulder|elbow|wrist)L$/.test(group))return 'armL';
  if(/^(shoulder|elbow|wrist)R$/.test(group))return 'armR';
  if(/^(hip|knee|ankle)L$/.test(group))return 'legL';
  if(/^(hip|knee|ankle)R$/.test(group))return 'legR';
  if(/^(head|earL|earR)$/.test(group))return 'head';
  return 'trunk';
}
export function bindPeltRegions(composite,groups,M4){
  const names=Object.keys(groups),ids=new Map(names.map((n,i)=>[n,i]));
  const groupIds=new Uint16Array(composite.mesh.p.length/3*4),weights=new Float32Array(groupIds.length);
  const bindInverse=names.map(n=>invRigid(groups[n],M4));
  const audit={crossRegionLinks:0,invalidWeights:0,vertices:composite.mesh.p.length/3,weightsByRegion:{}};
  for(const block of composite.blocks){
    let localCount=0;
    for(let v=block.start;v<block.start+block.count;v++){
      const pos=[composite.mesh.p[3*v],composite.mesh.p[3*v+1],composite.mesh.p[3*v+2]];
      // Distances compete only INSIDE one anatomical region. Smoothly blend
      // neighboring bone transforms at joints instead of hard ownership jumps.
      const byJoint=new Map();
      for(const primitive of block.primitives){
        const distance=Math.abs(primitiveDistance(pos,primitive));
        byJoint.set(primitive.parent,Math.min(distance,byJoint.get(primitive.parent)??Infinity));
      }
      const ranked=[...byJoint.entries()].sort((a,b)=>a[1]-b[1]).slice(0,4);
      const nearest=ranked[0][1],band=.17;
      const scores=ranked.map(([_,distance])=>Math.exp(-(((distance-nearest)/band)**2)));
      const norm=scores.reduce((a,b)=>a+b,0);
      const index=4*v;
      let total=0;
      ranked.forEach(([joint],k)=>{
        const w=scores[k]/norm;
        groupIds[index+k]=ids.get(joint);weights[index+k]=w;total+=w;
        if(groupRegion(joint)!==block.name)audit.crossRegionLinks++;
      });
      if(!finite(total)||Math.abs(total-1)>1e-6)audit.invalidWeights++;
      localCount++;
    }
    audit.weightsByRegion[block.name]=localCount;
  }
  if(audit.crossRegionLinks||audit.invalidWeights)throw Error('invalid anatomical pelt bind '+JSON.stringify(audit));
  return {groupNames:names,groupIds,weights,bindInverse,audit};
}
export function crossingTriangles(composite){
  const ownership=new Uint8Array(composite.mesh.p.length/3);
  composite.blocks.forEach((b,n)=>ownership.fill(n,b.start,b.start+b.count));
  let crosses=0;
  const ix=composite.mesh.i;
  for(let k=0;k<ix.length;k+=3)
    if(ownership[ix[k]]!==ownership[ix[k+1]]||ownership[ix[k]]!==ownership[ix[k+2]])crosses++;
  return crosses;
}
export function peltPoseQuality(composite,positions){
  if(positions.length!==composite.mesh.p.length||!positions.every(Number.isFinite))
    return {pass:false,reason:'nonfinite or mismatched vertex positions'};
  const p=composite.mesh.p,ix=composite.mesh.i;
  let maxEdgeStretch=0,degenerated=0,edges=0;
  for(let t=0;t<ix.length;t+=9){
    for(const [a,b] of [[ix[t],ix[t+1]],[ix[t+1],ix[t+2]],[ix[t+2],ix[t]]]){
      const A=3*a,B=3*b,rest=Math.hypot(p[A]-p[B],p[A+1]-p[B+1],p[A+2]-p[B+2]);
      if(rest<1e-7)continue;
      const curr=Math.hypot(positions[A]-positions[B],positions[A+1]-positions[B+1],positions[A+2]-positions[B+2]);
      const ratio=curr/rest;maxEdgeStretch=Math.max(maxEdgeStretch,ratio);edges++;
      if(ratio<.08)degenerated++;
    }
  }
  return {pass:degenerated===0&&maxEdgeStretch<7,edges,maxEdgeStretch,degenerated,zeroCrossRegionTriangles:crossingTriangles(composite)===0};
}

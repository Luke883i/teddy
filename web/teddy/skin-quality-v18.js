// V18 anatomical skin weighting and deformation diagnostics.
// glTF-style normalized joint weights and inverse-bind transforms; no unrelated-limb blending.
import {buildTeddyArchetype} from './model.js';
import {primitiveDistance} from './implicit-skin-v16.js';
const groups=buildTeddyArchetype().groups;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const VISUAL_SKIN_V18=Object.freeze({version:18,maxInfluences:4,minimumDominance:.55,nearJointBlend:.20,stretchAlert:3.5});
export function anatomyFamily(group){
  if(/^(shoulder|elbow|wrist)L$/.test(group))return 'armL';
  if(/^(shoulder|elbow|wrist)R$/.test(group))return 'armR';
  if(/^(hip|knee|ankle)L$/.test(group))return 'legL';
  if(/^(hip|knee|ankle)R$/.test(group))return 'legR';
  if(/^(head|jaw|neck|neckBase|earL|earR)$/.test(group))return 'head';
  return 'trunk';
}
function nearestPrimitive(point,primitives){
  let nearest=null,best=Infinity;
  for(const part of primitives){
    const d=Math.abs(primitiveDistance(point,part));
    if(d<best){best=d;nearest=part}
  }
  return nearest;
}
function parentJoint(group){
  const p=groups[group]?.parent;
  return p&&p!=='root'?p:null;
}
export function allowableSkinPair(owner,secondary){return owner===secondary||parentJoint(owner)===secondary}
export function anatomicalInfluences(point,primitives,groupIndex){
  const owner=nearestPrimitive(point,primitives);
  if(!owner||!groupIndex.has(owner.parent))throw Error('skin vertex has no anatomical owner');
  const family=anatomyFamily(owner.parent);
  // Only owner + direct parent and grandparent may bind; no contralateral / foreign chains.
  const weights=[{group:owner.parent,weight:1}],parent=parentJoint(owner.parent);
  if(parent&&groupIndex.has(parent)){
    const pivot=groups[owner.parent]?.pos||[0,0,0];
    // Parent influence remains small and finite even for overlapping sockets;
    // never admit independently moving opposite limbs.
    const blend=VISUAL_SKIN_V18.nearJointBlend;
    weights[0].weight=1-blend;weights.push({group:parent,weight:blend});
  }
  if(family==='trunk'&&owner.parent==='pelvis')weights.splice(1);
  return weights;
}
export function bindingSafety(bind){
  const {groupNames,groupIds,weights}=bind,vertices=weights.length/4;
  let maxError=0,badFamily=0,nonfinite=0,minDominance=1;
  for(let i=0;i<vertices;i++){
    let sum=0,dominance=0;
    const families=new Set();
    for(let k=0;k<4;k++){
      const w=weights[4*i+k];if(!Number.isFinite(w)||w<0)nonfinite++;
      if(w>0){
        const name=groupNames[groupIds[4*i+k]],family=anatomyFamily(name);
        if(['armL','armR','legL','legR'].includes(family))families.add(family);
        dominance=Math.max(dominance,w);
      }
      sum+=w;
    }
    if(families.size>1)badFamily++;
    maxError=Math.max(maxError,Math.abs(sum-1));
    minDominance=Math.min(minDominance,dominance);
  }
  return {vertices,nonfinite,badFamily,maxWeightError:maxError,minDominance,
    pass:nonfinite===0&&badFamily===0&&maxError<1e-4&&minDominance>=VISUAL_SKIN_V18.minimumDominance};
}
export function deformationQuality(rest,posed,indices,{stride=7}={}){
  let sampled=0,finite=true,degenerated=0,maxStretch=0,highStretch=0,signFlips=0;
  const area=(p,a,b,c)=>{
    const u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]];
    const v=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    return cross;
  };
  for(let t=0;t<indices.length;t+=Math.max(1,stride)*3){
    const a=indices[t]*3,b=indices[t+1]*3,c=indices[t+2]*3;
    const normalRest=area(rest,a,b,c),normalNow=area(posed,a,b,c);
    const old=Math.hypot(...normalRest),now=Math.hypot(...normalNow);
    if(!Number.isFinite(now)){finite=false;continue}
    if(old<1e-11)continue;
    const ratio=now/old;
    if(ratio<.06)degenerated++;
    if(ratio>VISUAL_SKIN_V18.stretchAlert)highStretch++;
    maxStretch=Math.max(maxStretch,ratio);
    // Orientation against global normal cannot certify inversion under arbitrary bone rotation:
    // collect indicative flips, but never equate them to a physics proof.
    if(normalRest.reduce((s,x,j)=>s+x*normalNow[j],0)<-.15*old*now)signFlips++;
    sampled++;
  }
  return {sampled,finite,degenerated,highStretch,maxStretch,orientationWarnings:signFlips,
    pass:finite&&degenerated===0};
}

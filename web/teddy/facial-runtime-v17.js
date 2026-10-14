// V17: standalone accessories + face-specific skin micro-morph, fully integrated
// with existing ExpressionRig, V16 unified fur body and both render backends.
import {TeddyRenderer} from './render.js';
import {facialMicroPose,facialPartDeltas} from './facial-contract-v17.js';
import {M4} from './math.js';
import {cinematicPart} from './cinematic-v11.js';
import {refinePartV71} from './refinement-v7.js';
const accessory=(id,geometry,parent,pos,scale,material,roughness=.7)=>({id,geometry,parent,pos,scale,material,roughness,rot:[0,0,0],faceAccessory:true});
const parts=Object.freeze([
  accessory('scleraL','sphere','head',[-.205,.108,.595],[.084,.092,.049],'sclera',.28),
  accessory('scleraR','sphere','head',[.205,.108,.595],[.084,.092,.049],'sclera',.28),
  accessory('irisL','sphere','head',[-.205,.108,.628],[.057,.072,.036],'iris',.16),
  accessory('irisR','sphere','head',[.205,.108,.628],[.057,.072,.036],'iris',.16),
  accessory('lidL','sphere','head',[-.205,.192,.682],[.095,.020,.017],'faceFur',.92),
  accessory('lidR','sphere','head',[.205,.192,.682],[.095,.020,.017],'faceFur',.92),
  accessory('cheekDimpleL','sphere','head',[-.405,-.172,.555],[.088,.046,.010],'cheekTint',.93),
  accessory('cheekDimpleR','sphere','head',[.405,-.172,.555],[.088,.046,.010],'cheekTint',.93)
]);
export const FACIAL_ACCESSORIES_V17=parts;
function customize(part){
  const p={...part,pos:[...part.pos],scale:[...part.scale],rot:[...(part.rot||[0,0,0])]};
  if(/^eye[LR]$/.test(p.id)){p.pos[2]=.645;p.scale=[.033,.052,.030];p.roughness=.08;}
  if(/^catch[LR]$/.test(p.id)){p.pos[2]=.685;p.scale=[.013,.019,.009];}
  if(p.id==='nose'){p.material='noseVelvet';p.geometry='sphere';p.roughness=.62;p.scale=[.114,.076,.083];}
  if(/^brow[LR]$/.test(p.id)){p.scale=[.072,.017,.018];p.roughness=.91;}
  if(p.id==='noseBridge'){p.material='muzzleDark';}
  return p;
}
export function buildFacialPartsV17(original){
  if(!Array.isArray(original))throw Error('missing Teddy archetype');
  if(original.some(x=>x.id==='irisL'))return original;
  return [...original.map(customize),...parts.map(p=>({...p,pos:[...p.pos],scale:[...p.scale],rot:[...p.rot]}))];
}
function lookAtFace(renderer,sec,pose){
  return facialMicroPose(pose,sec,{
    reducedMotion:!!renderer.reduced,
    routine:renderer.__motionEngine?.last?.routine?.name||null,
    routinePhase:renderer.__motionEngine?.last?.routine?.phase??0
  });
}
function faceDetails(part,state){
  let p=facialPartDeltas(part,state);
  if(/^eye[LR]$/.test(part.id)){p.pos[2]=.652;p.scale=[.035,.054*Math.max(.31,1-state.lidClose*.74),.031];}
  if(/^catch[LR]$/.test(part.id)){p.pos[2]=.701;}
  if(/^lid[LR]$/.test(part.id)){
    p.pos[1]-=state.lidClose*.084;
    p.scale[1]*=1+state.lidClose*2.9;
  }
  if(/^cheekDimple[LR]$/.test(part.id)){
    const level=part.id.endsWith('L')?state.cheekL:state.cheekR;
    p.pos[1]+=level*.024;p.pos[2]+=level*.013;
    p.scale[0]*=.73+level*.52;p.scale[1]*=.70+level*.66;
  }
  return p;
}
export function deformFacialSkinV17(positions,headMatrix,state){
  if(!positions||!headMatrix||!state)return positions;
  const m=headMatrix,origin=[m[12],m[13],m[14]];
  for(let i=0;i<positions.length;i+=3){
    const d=[positions[i]-origin[0],positions[i+1]-origin[1],positions[i+2]-origin[2]];
    const lx=d[0]*m[0]+d[1]*m[1]+d[2]*m[2],
      ly=d[0]*m[4]+d[1]*m[5]+d[2]*m[6],
      lz=d[0]*m[8]+d[1]*m[9]+d[2]*m[10];
    // Compact support around cheek surface (head-local), with zero displacement
    // outside that region. No new detached cheek geometry in the V16 body.
    const cheek=(side,amount)=>{
      const dx=(lx-side*.37)/.245,dy=(ly+.14)/.195,dz=(lz-.52)/.26;
      const weight=Math.exp(-2.2*(dx*dx+dy*dy+dz*dz));
      const puff=amount*weight;
      return [puff*.28*side,puff*.48,puff];
    };
    const a=cheek(-1,state.cheekLiftL),b=cheek(1,state.cheekLiftR);
    // V22: the integrated muzzle remains softly expressive as skin rather than
    // pushing three independent cream ellipsoids through the side profile.
    const dx=lx/.32,dy=(ly+.205)/.235,dz=(lz-.64)/.26;
    const snoutWeight=Math.exp(-2.6*(dx*dx+dy*dy+dz*dz));
    const local=[a[0]+b[0],a[1]+b[1],a[2]+b[2]+state.muzzlePuff*.65*snoutWeight];
    positions[i]+=m[0]*local[0]+m[4]*local[1]+m[8]*local[2];
    positions[i+1]+=m[1]*local[0]+m[5]*local[1]+m[9]*local[2];
    positions[i+2]+=m[2]*local[0]+m[6]*local[1]+m[10]*local[2];
  }
  return positions;
}
export function installFacialV17(){
  if(TeddyRenderer.prototype.__facialV17)return;
  TeddyRenderer.prototype.__facialV17=true;
  const init=TeddyRenderer.prototype.init;
  TeddyRenderer.prototype.init=function(){
    this.model.parts=buildFacialPartsV17(this.model.parts);
    return init.call(this);
  };
  const palette=TeddyRenderer.prototype.paletteBuild;
  TeddyRenderer.prototype.paletteBuild=function(){
    palette.call(this);
    const fur=this.palette.fur,muzzle=this.palette.muzzle,eye=this.palette.eyes;
    this.palette.sclera=[.86,.755,.605]; // warm low-contrast eye whites: plush, not human
    this.palette.iris=[.32,.18,.11];
    this.palette.noseVelvet=[.105,.064,.061];
    this.palette.faceFur=[...fur];
    this.palette.cheekTint=muzzle.map((v,i)=>Math.min(.94,.70*v+(i===0?.23:i===1?.10:.075)));
  };
  TeddyRenderer.prototype.faceMicroAt=function(seconds,pose=this.pose){
    return lookAtFace(this,seconds,pose);
  };
  TeddyRenderer.prototype.morphImplicitFace=function(positions,groups,seconds,pose=this.pose){
    return deformFacialSkinV17(positions,groups.head,this.faceMicroAt(seconds,pose));
  };
  const originalTransform=TeddyRenderer.prototype.partTransform;
  TeddyRenderer.prototype.partTransform=function(part,groups,seconds,pose){
    // Apply the facial delta AFTER the inherited V11 cinematic override and V7
    // refinement; otherwise these overrides silently erase pupil/brow movement.
    const base=originalTransform.call(this,part,groups,seconds,pose),
      effective=cinematicPart(refinePartV71(part)),
      altered=faceDetails(effective,this.faceMicroAt(seconds,pose)),
      parent=groups[part.parent]||groups.root,
      pos=altered.pos.map((v,i)=>v-effective.pos[i]);
    const result=new Float32Array(base);
    for(let i=0;i<3;i++)
      result[12+i]+=parent[i]*pos[0]+parent[4+i]*pos[1]+parent[8+i]*pos[2];
    const scale=altered.scale.map((v,i)=>v/Math.max(.0001,effective.scale[i]));
    for(let k=0;k<3;k++)for(let i=0;i<3;i++)result[k*4+i]*=scale[k];
    const roll=(altered.rot[2]||0)-(effective.rot[2]||0);
    if(Math.abs(roll)>1e-8){
      const rotated=M4.mul(result,M4.rotZ(roll));return rotated;
    }
    return result;
  };
  TeddyRenderer.prototype.faceStatus=function(seconds=this.lastPose||0){
    return this.faceMicroAt(seconds,this.pose);
  };
  // One observational receipt per displayed frame, never a second face state bus.
  for(const backend of ['frameGL','frame2d']){
    const original=TeddyRenderer.prototype[backend];
    TeddyRenderer.prototype[backend]=function(...args){
      const result=original.apply(this,args);
      if(typeof window!=='undefined'&&typeof CustomEvent==='function'){
        window.dispatchEvent(new CustomEvent('teddy:face-frame',{
          detail:this.faceStatus(this.lastPose||0)
        }));
      }
      return result;
    };
  }
}

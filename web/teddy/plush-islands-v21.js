// V21 render-first anatomical pelt: three CLOSED, separately rigged SDF islands.
// A globally stitched bind surface cannot open a shoulder gap under rotation without
// heavy per-pose remeshing. We explicitly declassify "one global mesh" to achieve
// natural arm separation without LBS accordion triangles or long subtractive slots.
import {TeddyRenderer} from './render.js';
import {M4} from './math.js';
import {extractImplicitMesh,furPrimitive,meshTopology,vertexNormals} from './implicit-skin-v16.js';
import {anatomicalInfluences,deformationQuality} from './skin-quality-v18.js';

export const PLUSH_V21=Object.freeze({
  mode:'anatomical-islands',version:21,smoothingCore:.10465,smoothingArm:.08473,
  armPower:2.36118,bodyVoxel:.06690,armVoxel:.06719,maxStartupMs:12000
});
const armGroup=name=>/^(shoulder|elbow|wrist)[LR]$/.test(name);
export function islandOf(part){
  if(part?.material!=='fur')return null;
  if(!armGroup(part.parent))return 'core';
  return part.parent.endsWith('L')?'armL':'armR';
}
export function anatomicalIslandPrimitives(renderer,groups,seconds,options=PLUSH_V21){
  const partitions={core:[],armL:[],armR:[]};
  for(const part of renderer.model.parts){
    const island=islandOf(part);
    if(!island)continue;
    const primitive=furPrimitive(part,renderer.partTransform(part,groups,seconds,renderer.pose));
    if(!primitive)throw Error('missing transformed pelt primitive '+part.id);
    // The old p=4 superellipse produced box-like arm walls; use round plush limbs.
    if(part.geometry==='capsule')primitive.power=island==='core'?2.65:options.armPower;
    partitions[island].push(primitive);
  }
  for(const [key,arr] of Object.entries(partitions))if(arr.length<4)
    throw Error('missing anatomical pelt island '+key);
  return partitions;
}
function inverseRigid(m){
  const out=M4.identity();
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)out[4*col+row]=m[4*row+col];
  for(let row=0;row<3;row++)out[12+row]=-(out[row]*m[12]+out[4+row]*m[13]+out[8+row]*m[14]);
  return out;
}
export function bindIsland(mesh,parts,groups,name){
  const groupNames=Object.keys(groups),index=new Map(groupNames.map((key,i)=>[key,i]));
  const ids=new Uint16Array(mesh.p.length/3*4),weights=new Float32Array(ids.length);
  const inverse=groupNames.map(key=>inverseRigid(groups[key]));
  let nonFinite=0,crossArm=0;
  for(let v=0;v<mesh.p.length/3;v++){
    const point=Array.from(mesh.p.subarray(3*v,3*v+3)),influences=anatomicalInfluences(point,parts,index);
    for(let k=0;k<influences.length;k++){
      const item=influences[k],group=item.group;
      if(name==='core'&&armGroup(group))crossArm++;
      if(name==='armL'&&/^(shoulder|elbow|wrist)R$/.test(group))crossArm++;
      if(name==='armR'&&/^(shoulder|elbow|wrist)L$/.test(group))crossArm++;
      ids[v*4+k]=index.get(group);weights[v*4+k]=item.weight;
      if(!Number.isFinite(item.weight))nonFinite++;
    }
  }
  if(nonFinite||crossArm)throw Error('invalid anatomical island influence '+JSON.stringify({name,nonFinite,crossArm}));
  return {groupNames,groupIds:ids,weights,bindInverse:inverse};
}
export function poseIsland(mesh,bind,groups,target=new Float32Array(mesh.p.length)){
  const transformations=bind.groupNames.map((n,i)=>M4.mul(groups[n],bind.bindInverse[i]));
  for(let v=0;v<mesh.p.length/3;v++){
    const idx=3*v,x=mesh.p[idx],y=mesh.p[idx+1],z=mesh.p[idx+2];
    let X=0,Y=0,Z=0;
    for(let k=0;k<4;k++){
      const w=bind.weights[4*v+k];if(!w)continue;
      const m=transformations[bind.groupIds[4*v+k]];
      X+=w*(m[0]*x+m[4]*y+m[8]*z+m[12]);
      Y+=w*(m[1]*x+m[5]*y+m[9]*z+m[13]);
      Z+=w*(m[2]*x+m[6]*y+m[10]*z+m[14]);
    }
    target[idx]=X;target[idx+1]=Y;target[idx+2]=Z;
  }
  return target;
}
function meshGPU(renderer,surface){
  const gl=renderer.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);
  function attr(name,content,usage){
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,content,usage);
    const slot=gl.getAttribLocation(renderer.p,name);
    if(slot>=0){gl.enableVertexAttribArray(slot);gl.vertexAttribPointer(slot,3,gl.FLOAT,false,0,0)}
    return buffer;
  }
  const positionBuffer=attr('aPos',surface.p,gl.DYNAMIC_DRAW);
  const normalBuffer=attr('aNormal',surface.n,gl.DYNAMIC_DRAW);
  attr('aRest',surface.p,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,surface.i,gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return {vao,indexed:true,indexType:gl.UNSIGNED_INT,count:surface.i.length,
    positionBuffer,normalBuffer,restTexture:true};
}
function emit(name,detail){
  if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')
    window.dispatchEvent(new CustomEvent(name,{detail}));
}
export function buildAnatomicalPelt(renderer,groups,seconds,options=PLUSH_V21){
  const input=anatomicalIslandPrimitives(renderer,groups,seconds,options),islands=[];
  let vertices=0,triangles=0,openEdges=0,nonmanifoldEdges=0;
  for(const name of ['core','armL','armR']){
    const mesh=extractImplicitMesh(input[name],{underarmRelief:false,
      smoothing:name==='core'?options.smoothingCore:options.smoothingArm,
      voxel:name==='core'?options.bodyVoxel:options.armVoxel});
    const topology=meshTopology(mesh);
    if(!topology.closed||topology.components!==1)
      throw Error('island not closed or connected: '+name+' '+JSON.stringify(topology));
    const bind=bindIsland(mesh,input[name],groups,name);
    vertices+=topology.vertices;triangles+=topology.triangles;
    openEdges+=topology.openEdges;nonmanifoldEdges+=topology.nonmanifoldEdges;
    islands.push({name,mesh,topology,bind,
      positions:new Float32Array(mesh.p.length),normals:new Float32Array(mesh.p.length),
      gpu:null,frames:0});
  }
  return {mode:PLUSH_V21.mode,islands,vertices,triangles,openEdges,nonmanifoldEdges,
    components:3,closed:openEdges===0&&nonmanifoldEdges===0,
    noCrossArmTriangles:true,globalWatertight:false};
}
function drawPelt(renderer,groups,seconds,projection,view,camera){
  if(!renderer.gl||renderer.__plushError)return false;
  try{
    if(!renderer.__plushV21){
      const began=typeof performance==='undefined'?0:performance.now();
      const state=buildAnatomicalPelt(renderer,groups,seconds);
      for(const island of state.islands){
        island.gpu=meshGPU(renderer,island.mesh);
        renderer.meshes['plushV21_'+island.name]=island.gpu;
      }
      state.startupMs=(typeof performance==='undefined'?0:performance.now())-began;
      renderer.__plushV21=state;
      emit('teddy:implicit-skin-ready',{active:true,mode:state.mode,parts:state.islands.map(x=>({name:x.name,...x.topology})),
        components:state.components,closed:state.closed,openEdges:state.openEdges,
        nonmanifoldEdges:state.nonmanifoldEdges,noCrossArmTriangles:true,globalWatertight:false,
        vertices:state.vertices,triangles:state.triangles,startupMs:state.startupMs});
    }
    const state=renderer.__plushV21,gl=renderer.gl;
    const beganFrame=typeof performance==='undefined'?0:performance.now();
    let highStretch=0,maxStretch=0;
    for(const island of state.islands){
      poseIsland(island.mesh,island.bind,groups,island.positions);
      if(island.name==='core')
        renderer.morphImplicitFace?.(island.positions,groups,seconds,renderer.pose);
      if((island.frames++%45)===0){
        const q=deformationQuality(island.mesh.p,island.positions,island.mesh.i);
        if(!q.finite)throw Error('nonfinite '+island.name+' surface');
        island.quality=q;
      }
      highStretch+=island.quality?.highStretch||0;
      maxStretch=Math.max(maxStretch,island.quality?.maxStretch||0);
      island.normals.set(vertexNormals(island.positions,island.mesh.i));
      gl.bindBuffer(gl.ARRAY_BUFFER,island.gpu.positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,island.positions);
      gl.bindBuffer(gl.ARRAY_BUFFER,island.gpu.normalBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,island.normals);
      renderer.draw(M4.identity(),M4.mul(projection,view),
        {geometry:'plushV21_'+island.name,material:'fur',roughness:.99},camera,1);
    }
    state.quality={highStretch,maxStretch,finite:true,parts:3};
    state.paintedFrames=(state.paintedFrames||0)+1;
    state.lastDrawMs=(typeof performance==='undefined'?0:performance.now())-beganFrame;
    state.drawEwmaMs=state.drawEwmaMs===undefined?state.lastDrawMs:
      state.drawEwmaMs*.85+state.lastDrawMs*.15;
    const renderedRoutine=renderer.motionStatus?.().routine||null;
    state.lastPaintedRoutine=renderedRoutine;
    // Opt-in forensic receipt is emitted only AFTER all three indexed GPU draws.
    // MotionEngine events occur earlier and cannot alone prove pixels were updated.
    if(typeof window!=='undefined'&&window.__teddyVisualProof===true)
      emit('teddy:plush-frame',{frame:state.paintedFrames,draws:3,
        routine:renderedRoutine,drawMs:state.lastDrawMs,quality:state.quality});
    if((state.islands[0].frames%45)===1)
      emit('teddy:visual-quality',{detail:null,skin:state.mode,quality:state.quality,islands:3});
    return true;
  }catch(error){
    renderer.__plushError=String(error?.message||error);
    emit('teddy:implicit-skin-error',{message:renderer.__plushError});
    console.warn('Teddy V21 anatomical plush fallback',error);
    return false;
  }
}
export function installPlushV21(){
  if(TeddyRenderer.prototype.__plushV21Installed)return;
  TeddyRenderer.prototype.__plushV21Installed=true;
  // Keep the belly patch integrated instead of a thick foreground disc.
  const inheritedTransform=TeddyRenderer.prototype.partTransform;
  TeddyRenderer.prototype.partTransform=function(part,...args){
    const model=inheritedTransform.call(this,part,...args);
    if(part.id==='belly'){
      const scaled=new Float32Array(model);
      scaled[12]-=model[8]*.065;
      scaled[13]-=model[9]*.065;
      scaled[14]-=model[10]*.065;
      for(let j=8;j<11;j++)scaled[j]*=.6233;
      return scaled;
    }
    return model;
  };
  TeddyRenderer.prototype.drawImplicitSkin=function(...args){return drawPelt(this,...args)};
  TeddyRenderer.prototype.implicitSkinStatus=function(){
    const state=this.__plushV21;
    return {active:!!state,mode:state?.mode||PLUSH_V21.mode,
      backend:this.backend,closed:state?.closed??false,components:state?.components??null,
      noCrossArmTriangles:state?.noCrossArmTriangles??null,globalWatertight:false,
      topology:state?{vertices:state.vertices,triangles:state.triangles,components:state.components,
        closed:state.closed,openEdges:state.openEdges,nonmanifoldEdges:state.nonmanifoldEdges}:null,
      quality:state?.quality||null,startupMs:state?.startupMs??null,
      paintedFrames:state?.paintedFrames||0,lastDrawMs:state?.lastDrawMs??null,
      drawEwmaMs:state?.drawEwmaMs??null,lastPaintedRoutine:state?.lastPaintedRoutine||null,
      fallbackReason:this.__plushError||null};
  };
}

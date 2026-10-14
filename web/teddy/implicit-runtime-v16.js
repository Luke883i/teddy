import {softenShoulderBind,seamEdgeGraph,seamStretch,constrainShoulderStretch} from './skin-seam-v20.js';
import {underarmCutters,reliefProbe} from './underarm-relief-v19.js';
import {anatomicalInfluences,bindingSafety,deformationQuality} from './skin-quality-v18.js';
// V16 runtime bridge: one bind-pose implicit plush surface, skinned by the existing
// anatomical group hierarchy, not by a new animation engine. No per-frame remeshing.
import {TeddyRenderer} from './render.js';
import {M4} from './math.js';
import {extractImplicitMesh,furPrimitive,primitiveDistance,meshTopology,vertexNormals,skinField} from './implicit-skin-v16.js';

function inverseRigid(m){
  const out=M4.identity();
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)out[4*col+row]=m[4*row+col];
  for(let row=0;row<3;row++)out[12+row]=-(out[row]*m[12]+out[4+row]*m[13]+out[8+row]*m[14]);
  return out;
}
export function skinBindings(mesh,primitives,groups){
  const groupNames=Object.keys(groups),groupIndex=new Map(groupNames.map((name,i)=>[name,i]));
  const groupIds=new Uint16Array(mesh.p.length/3*4),weights=new Float32Array(groupIds.length);
  const bindInverse=groupNames.map(name=>inverseRigid(groups[name]));
  for(let v=0;v<mesh.p.length/3;v++){
    const point=[mesh.p[v*3],mesh.p[v*3+1],mesh.p[v*3+2]];
    const influences=anatomicalInfluences(point,primitives,groupIndex);
    for(let k=0;k<influences.length;k++){
      groupIds[v*4+k]=groupIndex.get(influences[k].group);
      weights[v*4+k]=influences[k].weight;
    }
  }
  const seamWeights=softenShoulderBind(mesh,{groupNames,groupIds,weights},groups);
  const safety=bindingSafety({groupNames,groupIds,weights});
  if(!safety.pass)throw Error('unsafe anatomical skin weights '+JSON.stringify(safety));
  return {groupNames,groupIds,weights,bindInverse,seamWeights};
}
export function deformImplicitMesh(mesh,bind,groups,target=new Float32Array(mesh.p.length)){
  const transforms=bind.groupNames.map((name,i)=>M4.mul(groups[name],bind.bindInverse[i]));
  for(let v=0;v<mesh.p.length/3;v++){
    const base=3*v,x=mesh.p[base],y=mesh.p[base+1],z=mesh.p[base+2];
    let X=0,Y=0,Z=0;
    for(let k=0;k<4;k++){
      const w=bind.weights[v*4+k];if(!w)continue;
      const m=transforms[bind.groupIds[v*4+k]];
      X+=w*(m[0]*x+m[4]*y+m[8]*z+m[12]);
      Y+=w*(m[1]*x+m[5]*y+m[9]*z+m[13]);
      Z+=w*(m[2]*x+m[6]*y+m[10]*z+m[14]);
    }
    target[base]=X;target[base+1]=Y;target[base+2]=Z;
  }
  return target;
}
function gpuMesh(renderer,surface){
  const gl=renderer.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);
  function attribute(name,bufferData,usage){
    const location=gl.getAttribLocation(renderer.p,name);
    if(location<0)return null;
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,bufferData,usage);
    gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
    return buffer;
  }
  const positionBuffer=attribute('aPos',surface.p,gl.DYNAMIC_DRAW);
  const normalBuffer=attribute('aNormal',surface.n,gl.DYNAMIC_DRAW);
  attribute('aRest',surface.p,gl.STATIC_DRAW);
  if(surface.face)attribute('aFace',surface.face,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,surface.i,gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return {vao,indexed:true,indexType:gl.UNSIGNED_INT,count:surface.i.length,positionBuffer,normalBuffer,restTexture:true};
}
function drawImplicit(renderer,groups,seconds,projection,view,camera){
  if(!renderer.gl)return false;
  if(renderer.__implicitSkinError)return false;
  try{
    if(!renderer.__implicitSkin){
      const startup=typeof performance!=='undefined'?performance.now():0;
      const primitives=renderer.model.parts.filter(p=>p.material==='fur')
        .map(part=>furPrimitive(part,renderer.partTransform(part,groups,seconds,renderer.pose))).filter(Boolean);
      const cutters=underarmCutters(primitives);
      const underarms=reliefProbe(cutters,p=>skinField(p,primitives,undefined,cutters));
      if(!underarms.pass)throw Error('underarm space not open: '+JSON.stringify(underarms));
      const mesh=extractImplicitMesh(primitives);
      const topology=meshTopology(mesh);
      if(!topology.closed||topology.components!==1)throw Error('non-watertight/disconnected implicit mesh: '+JSON.stringify(topology));
      const bindings=skinBindings(mesh,primitives,groups),gpu=gpuMesh(renderer,mesh);
      const seamEdges=seamEdgeGraph(mesh,groups);
      if(seamEdges.length<80)throw Error('missing connected shoulder edge constraints: '+seamEdges.length);
      renderer.__implicitSkin={mesh,topology,bindings,gpu,underarms,seamEdges,seamQuality:null,quality:null,frameCount:0,
        startupMs:(typeof performance!=='undefined'?performance.now():0)-startup,
        positions:new Float32Array(mesh.p.length),normals:new Float32Array(mesh.p.length)};
      renderer.meshes.implicitSkin=gpu;
      if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('teddy:implicit-skin-ready',{detail:{...topology,underarms,seamEdges:seamEdges.length,seamWeights:bindings.seamWeights,active:true}}));
    }
    const state=renderer.__implicitSkin,gl=renderer.gl;
    deformImplicitMesh(state.mesh,state.bindings,groups,state.positions);
    // Face micro-deformation is in the SAME watertight indexed skin, not detached cheeks.
    renderer.morphImplicitFace?.(state.positions,groups,seconds,renderer.pose);
    // Limit only anomalous axillary edge stretch; never split or remesh the unified pelt.
    state.seamQuality=constrainShoulderStretch(state.positions,state.seamEdges);
    if(!state.seamQuality.finite)throw Error('nonfinite shoulder seam correction');
    // Sample animated surface health without expensive full scans each frame.
    if((state.frameCount++%45)===0){
      state.quality=deformationQuality(state.mesh.p,state.positions,state.mesh.i);
      if(!state.quality.finite)throw Error('nonfinite skinned fur surface');
      if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')
        window.dispatchEvent(new CustomEvent('teddy:visual-quality',{detail:{...state.quality,seam:state.seamQuality,skin:'fused'}}));
    }
    state.normals.set(vertexNormals(state.positions,state.mesh.i));
    gl.bindBuffer(gl.ARRAY_BUFFER,state.gpu.positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,state.positions);
    gl.bindBuffer(gl.ARRAY_BUFFER,state.gpu.normalBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,state.normals);
    renderer.draw(M4.identity(),M4.mul(projection,view),
      {geometry:'implicitSkin',material:'fur',roughness:.97},camera,1);
    return true;
  }catch(error){
    renderer.__implicitSkinError=String(error?.message||error);
    if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('teddy:implicit-skin-error',{detail:{message:renderer.__implicitSkinError}}));
    console.warn('Teddy watertight skin fallback',error);
    return false; // Existing segmented WebGL meshes remain safe fallback.
  }
}
export function installImplicitSkinV16(){
  if(TeddyRenderer.prototype.__implicitSkinV16)return;
  TeddyRenderer.prototype.__implicitSkinV16=true;
  TeddyRenderer.prototype.drawImplicitSkin=function(...args){return drawImplicit(this,...args)};
  TeddyRenderer.prototype.implicitSkinStatus=function(){
    return {active:!!this.__implicitSkin,backend:this.backend,
      topology:this.__implicitSkin?.topology||null,
      underarms:this.__implicitSkin?.underarms||null,
      quality:this.__implicitSkin?.quality||null,
      seam:this.__implicitSkin?.seamQuality||null,
      seamWeights:this.__implicitSkin?.bindings?.seamWeights||null,
      startupMs:this.__implicitSkin?.startupMs??null,
      fallbackReason:this.__implicitSkinError||null};
  };
}

export {gpuMesh};

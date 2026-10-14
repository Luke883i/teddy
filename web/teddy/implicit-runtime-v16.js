// V16 runtime bridge: one bind-pose implicit plush surface, skinned by the existing
// anatomical group hierarchy, not by a new animation engine. No per-frame remeshing.
import {TeddyRenderer} from './render.js';
import {M4} from './math.js';
import {extractImplicitMesh,furPrimitive,primitiveDistance,meshTopology,vertexNormals} from './implicit-skin-v16.js';

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
    const point=[mesh.p[v*3],mesh.p[v*3+1],mesh.p[v*3+2]],closest=[];
    for(const part of primitives){
      const d=primitiveDistance(point,part),group=groupIndex.get(part.parent);
      if(group===undefined)continue;
      const score=Math.max(0,d+.07);
      if(closest.length<4){closest.push({score,group});closest.sort((a,b)=>a.score-b.score)}
      else if(score<closest[3].score){closest[3]={score,group};closest.sort((a,b)=>a.score-b.score)}
    }
    if(!closest.length)throw Error('implicit skin missing anatomical binding');
    let sum=0;
    for(let k=0;k<closest.length;k++){
      // Broad overlapping influences preserve softness across welded joints.
      const w=1/(.09+closest[k].score)**3;
      groupIds[v*4+k]=closest[k].group;weights[v*4+k]=w;sum+=w;
    }
    for(let k=0;k<4;k++)weights[v*4+k]/=sum;
  }
  return {groupNames,groupIds,weights,bindInverse};
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
      const primitives=renderer.model.parts.filter(p=>p.material==='fur')
        .map(part=>furPrimitive(part,renderer.partTransform(part,groups,seconds,renderer.pose))).filter(Boolean);
      const mesh=extractImplicitMesh(primitives);
      const topology=meshTopology(mesh);
      if(!topology.closed||topology.components!==1)throw Error('non-watertight/disconnected implicit mesh: '+JSON.stringify(topology));
      const bindings=skinBindings(mesh,primitives,groups),gpu=gpuMesh(renderer,mesh);
      renderer.__implicitSkin={mesh,topology,bindings,gpu,
        positions:new Float32Array(mesh.p.length),normals:new Float32Array(mesh.p.length)};
      renderer.meshes.implicitSkin=gpu;
      if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('teddy:implicit-skin-ready',{detail:{...topology,active:true}}));
    }
    const state=renderer.__implicitSkin,gl=renderer.gl;
    deformImplicitMesh(state.mesh,state.bindings,groups,state.positions);
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
      fallbackReason:this.__implicitSkinError||null};
  };
}

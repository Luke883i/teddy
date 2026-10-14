import {restFacialCoordinates,facialAnatomyReport} from './facial-volume-v22.js';
import {cinematicPart} from './cinematic-v11.js';
// V21 live compositor: anatomical independent closed pelts, batched as one WebGL2 draw.
// V16 extractor/legacy tests remain accessible; production path explicitly opts into V21.
import {TeddyRenderer} from './render.js';
import {M4} from './math.js';
import {furPrimitive,vertexNormals} from './implicit-skin-v16.js';
import {deformImplicitMesh,gpuMesh} from './implicit-runtime-v16.js';
import {assemblePeltRegions,bindPeltRegions,peltPoseQuality,crossingTriangles} from './anatomical-pelt-v21.js';
export function installAnatomicalPeltV21(){
  if(TeddyRenderer.prototype.__anatomicalPeltV21)return;
  TeddyRenderer.prototype.__anatomicalPeltV21=true;
  TeddyRenderer.prototype.drawImplicitSkin=function(groups,seconds,projection,view,camera){
    if(!this.gl||this.__anatomicalPeltError)return false;
    try{
      if(!this.__anatomicalPelt){
        const start=typeof performance!=='undefined'?performance.now():0;
        const parts=this.model.parts.filter(part=>part.material==='fur')
          .map(part=>furPrimitive(part,this.partTransform(part,groups,seconds,this.pose))).filter(Boolean);
        const composite=assemblePeltRegions(parts),bindings=bindPeltRegions(composite,groups,M4);
        const faceGeometry=facialAnatomyReport(this.model.parts.map(cinematicPart));
        if(!faceGeometry.pass)throw Error('unphysical muzzle geometry: '+JSON.stringify(faceGeometry));
        composite.mesh.face=restFacialCoordinates(composite,groups);
        if(crossingTriangles(composite)!==0)throw Error('arm-to-body triangles not eliminated');
        const gpu=gpuMesh(this,composite.mesh);
        this.__anatomicalPelt={composite,bindings,gpu,faceGeometry,
          positions:new Float32Array(composite.mesh.p.length),normals:new Float32Array(composite.mesh.p.length),
          quality:null,frames:0,startupMs:(typeof performance!=='undefined'?performance.now():0)-start};
        this.meshes.implicitSkin=gpu;
        if(typeof window!=='undefined'&&typeof CustomEvent==='function')
          window.dispatchEvent(new CustomEvent('teddy:implicit-skin-ready',{detail:{
            ...composite.topology,active:true,mode:composite.mode,regions:composite.regions,
            zeroCrossRegionTriangles:crossingTriangles(composite)===0,
            crossRegionWeights:bindings.audit.crossRegionLinks,faceGeometry,skinVersion:22
          }}));
      }
      const state=this.__anatomicalPelt,gl=this.gl;
      deformImplicitMesh(state.composite.mesh,state.bindings,groups,state.positions);
      // Cheeks remain inside V17 head region, downstream of the original ExpressionRig.
      this.morphImplicitFace?.(state.positions,groups,seconds,this.pose);
      if((state.frames++%30)===0){
        state.quality=peltPoseQuality(state.composite,state.positions);
        if(!state.quality.pass)throw Error('unsafe region pelt deformation '+JSON.stringify(state.quality));
        if(typeof window!=='undefined'&&typeof CustomEvent==='function')
          window.dispatchEvent(new CustomEvent('teddy:visual-quality',{detail:{
            ...state.quality,skin:state.composite.mode,regions:state.composite.regions.length
          }}));
      }
      state.normals.set(vertexNormals(state.positions,state.composite.mesh.i));
      gl.bindBuffer(gl.ARRAY_BUFFER,state.gpu.positionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,state.positions);
      gl.bindBuffer(gl.ARRAY_BUFFER,state.gpu.normalBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,state.normals);
      this.draw(M4.identity(),M4.mul(projection,view),
        {geometry:'implicitSkin',material:'fur',roughness:.97},camera,1);
      return true;
    }catch(e){
      this.__anatomicalPeltError=String(e?.message||e);
      if(typeof window!=='undefined'&&typeof CustomEvent==='function')
        window.dispatchEvent(new CustomEvent('teddy:implicit-skin-error',{
          detail:{message:this.__anatomicalPeltError,mode:'anatomical-pelt-v21'}
        }));
      console.warn('Teddy V21 anatomical pelt fallback to existing independent primitives',e);
      return false;
    }
  };
  TeddyRenderer.prototype.implicitSkinStatus=function(){
    const a=this.__anatomicalPelt;
    return {active:!!a,backend:this.backend,mode:a?.composite.mode||'anatomical-pelt-v21',
      topology:a?.composite.topology||null,regions:a?.composite.regions||[],
      crossRegionTriangles:a?crossingTriangles(a.composite):null,
      crossRegionWeights:a?.bindings.audit.crossRegionLinks??null,
      quality:a?.quality||null,faceGeometry:a?.faceGeometry||null,startupMs:a?.startupMs??null,
      fallbackReason:this.__anatomicalPeltError||null};
  };
}

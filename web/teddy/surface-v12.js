import {M4} from './math.js';
import {TeddyRenderer} from './render.js';
import {refinePartV71} from './refinement-v7.js';
import {cinematicPart,cinematicStageMatrices} from './cinematic-v11.js';
import {buildSurfaceMeshesV12} from './surface-geometry-v12.js';

const clone=p=>({...p,pos:[...(p.pos||[0,0,0])],scale:[...(p.scale||[1,1,1])],rot:[...(p.rot||[0,0,0])]});
const HIDDEN=new Set([
  'pelvisMass','chest','neckRoll','belly',
  'shoulderSocketL','shoulderSocketR','elbowPadL','elbowPadR','wristPadL','wristPadR',
  'hipSocketL','hipSocketR','kneePadL','kneePadR','anklePadL','anklePadR',
  'footPadL','footPadR','toeL1','toeL2','toeL3','toeR1','toeR2','toeR3'
]);
const OVERRIDE=Object.freeze({
  torso:{geometry:'bodyV12',pos:[0,.015,-.07],scale:[.72,.93,.63]},
  upperArmL:{geometry:'limbV12',pos:[0,-.245,.015],scale:[.190,.365,.198]},upperArmR:{geometry:'limbV12',pos:[0,-.245,.015],scale:[.190,.365,.198]},
  forearmL:{geometry:'limbV12',pos:[0,-.195,.055],scale:[.170,.315,.180]},forearmR:{geometry:'limbV12',pos:[0,-.195,.055],scale:[.170,.315,.180]},
  pawL:{geometry:'footV12',pos:[0,-.052,.085],scale:[.170,.195,.190]},pawR:{geometry:'footV12',pos:[0,-.052,.085],scale:[.170,.195,.190]},
  thighL:{geometry:'limbV12',pos:[0,-.175,.020],scale:[.235,.345,.248]},thighR:{geometry:'limbV12',pos:[0,-.175,.020],scale:[.235,.345,.248]},
  shinL:{geometry:'limbV12',pos:[0,-.165,.060],scale:[.188,.300,.205]},shinR:{geometry:'limbV12',pos:[0,-.165,.060],scale:[.188,.300,.205]},
  footL:{geometry:'footV12',pos:[-.012,-.05,.295],scale:[.28,.17,.35],rot:[.075,-.055,-.035]},footR:{geometry:'footV12',pos:[.012,-.05,.295],scale:[.28,.17,.35],rot:[.075,.055,.035]}
});
export const SURFACE_V12=Object.freeze({version:12,objective:'continuous plush read over the existing articulated rig',ownership:'one resolver replaces stacked visual monkey patches'});
export function resolvePartV12(input){const p=clone(cinematicPart(refinePartV71(input)));if(HIDDEN.has(p.id)){p.geometry='hiddenV12';return p;}const o=OVERRIDE[p.id];if(o){if(o.geometry)p.geometry=o.geometry;if(o.pos)p.pos=[...o.pos];if(o.scale)p.scale=[...o.scale];if(o.rot)p.rot=[...o.rot];}return p;}
export function surfaceStageMatricesV12(base){const out=cinematicStageMatrices(base);const apply=(names,d)=>{for(const n of names)if(out[n])out[n]=M4.mul(d,out[n]);};apply(['shoulderL','elbowL','wristL'],M4.translate(-.035,.012,-.025));apply(['shoulderR','elbowR','wristR'],M4.translate(.035,.012,-.025));apply(['elbowL','wristL'],M4.translate(.006,.050,.012));apply(['elbowR','wristR'],M4.translate(-.006,.050,.012));apply(['wristL'],M4.translate(.004,.045,.016));apply(['wristR'],M4.translate(-.004,.045,.016));apply(['hipL','kneeL','ankleL'],M4.translate(.012,.012,-.028));apply(['hipR','kneeR','ankleR'],M4.translate(-.012,.012,-.028));apply(['kneeL','ankleL'],M4.translate(.006,.034,.018));apply(['kneeR','ankleR'],M4.translate(-.006,.034,.018));return out;}
function uploadMesh(gl,program,g){const vao=gl.createVertexArray();gl.bindVertexArray(vao);for(const [name,data] of [['aPos',g.p],['aNormal',g.n]]){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);}if(g.i){const b=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.i,gl.STATIC_DRAW);}return{vao,indexed:!!g.i,count:g.i?g.i.length:g.p.length/3};}
export function installSurfaceV12(){if(TeddyRenderer.prototype.__surfaceV12)return;TeddyRenderer.prototype.__surfaceV12=true;const init=TeddyRenderer.prototype.init;TeddyRenderer.prototype.init=function(){const r=init.call(this);if(this.gl&&this.p&&this.meshes)for(const [name,g] of Object.entries(buildSurfaceMeshesV12()))this.meshes[name]=uploadMesh(this.gl,this.p,g);return r;};const part=TeddyRenderer.prototype.partTransform;TeddyRenderer.prototype.partTransform=function(p,g,s,e){return part.call(this,resolvePartV12(p),g,s,e);};const groups=TeddyRenderer.prototype.groupMatrices;TeddyRenderer.prototype.groupMatrices=function(s,p){return surfaceStageMatricesV12(groups.call(this,s,p));};}

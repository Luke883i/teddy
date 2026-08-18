import {M4,compose} from './math.js';
import {TeddyRenderer} from './render.js';
import {refinePartV71} from './refinement-v7.js';
import {cinematicPart,cinematicStageMatrices} from './cinematic-v11.js';
import {buildSurfaceMeshesV12} from './surface-geometry-v12.js';

const clone=p=>({...p,pos:[...(p.pos||[0,0,0])],scale:[...(p.scale||[1,1,1])],rot:[...(p.rot||[0,0,0])]});
const HIDDEN=new Set([
  'pelvisMass','chest','neckRoll','belly','browPadL','browPadR','cheekL','cheekR','muzzleL','muzzleR','noseBridge',
  'shoulderSocketL','shoulderSocketR','elbowPadL','elbowPadR','wristPadL','wristPadR',
  'hipSocketL','hipSocketR','kneePadL','kneePadR','anklePadL','anklePadR',
  'footPadL','footPadR','toeL1','toeL2','toeL3','toeR1','toeR2','toeR3'
]);

const OVERRIDE=Object.freeze({
  torso:{geometry:'bodyV12',pos:[0,.015,-.07],scale:[.72,.93,.63]},
  headShell:{geometry:'skullV12',pos:[0,.018,-.055],scale:[.73,.69,.66]},
  earL:{geometry:'earV12',scale:[.245,.265,.16]},earR:{geometry:'earV12',scale:[.245,.265,.16]},
  innerEarL:{geometry:'earDishV12',pos:[0,-.006,.104],scale:[.142,.154,.035]},
  innerEarR:{geometry:'earDishV12',pos:[0,-.006,.104],scale:[.142,.154,.035]},
  muzzlePad:{geometry:'muzzleV12',pos:[0,-.198,.552],scale:[.365,.238,.205]},
  nose:{geometry:'sphere',pos:[0,-.168,.765],scale:[.112,.078,.077],rot:[.02,0,0]},
  eyeL:{geometry:'sphere',pos:[-.205,.122,.568],scale:[.077,.094,.056]},
  eyeR:{geometry:'sphere',pos:[.205,.122,.568],scale:[.077,.094,.056]},
  catchL:{geometry:'sphere',pos:[-.182,.159,.618],scale:[.014,.017,.009]},
  catchR:{geometry:'sphere',pos:[.228,.159,.618],scale:[.014,.017,.009]},
  browL:{geometry:'capsule',pos:[-.205,.255,.578],scale:[.067,.009,.012]},
  browR:{geometry:'capsule',pos:[.205,.255,.578],scale:[.067,.009,.012]},
  noseStem:{geometry:'capsule',pos:[0,-.282,.785],scale:[.008,.035,.008]},
  upperLipL:{geometry:'capsule',pos:[-.043,-.322,.792],scale:[.046,.005,.008]},
  upperLipR:{geometry:'capsule',pos:[.043,-.322,.792],scale:[.046,.005,.008]},
  mouthCavity:{geometry:'sphere',pos:[0,.010,.018],scale:[.112,.015,.022]},
  lowerLip:{geometry:'capsule',pos:[0,-.004,.026],scale:[.084,.005,.009]},
  tongue:{geometry:'sphere',pos:[0,.004,.030],scale:[.052,.004,.009]},
  upperArmL:{geometry:'limbV12',pos:[0,-.245,.015],scale:[.190,.365,.198]},
  upperArmR:{geometry:'limbV12',pos:[0,-.245,.015],scale:[.190,.365,.198]},
  forearmL:{geometry:'limbV12',pos:[0,-.195,.055],scale:[.170,.315,.180]},
  forearmR:{geometry:'limbV12',pos:[0,-.195,.055],scale:[.170,.315,.180]},
  pawL:{geometry:'footV12',pos:[0,-.052,.085],scale:[.170,.195,.190]},
  pawR:{geometry:'footV12',pos:[0,-.052,.085],scale:[.170,.195,.190]},
  thighL:{geometry:'limbV12',pos:[0,-.175,.020],scale:[.235,.345,.248]},
  thighR:{geometry:'limbV12',pos:[0,-.175,.020],scale:[.235,.345,.248]},
  shinL:{geometry:'limbV12',pos:[0,-.165,.060],scale:[.188,.300,.205]},
  shinR:{geometry:'limbV12',pos:[0,-.165,.060],scale:[.188,.300,.205]},
  footL:{geometry:'footV12',pos:[-.012,-.05,.295],scale:[.28,.17,.35],rot:[.075,-.055,-.035]},
  footR:{geometry:'footV12',pos:[.012,-.05,.295],scale:[.28,.17,.35],rot:[.075,.055,.035]}
});

export const SURFACE_V12=Object.freeze({
  version:12,
  objective:'continuous plush read over the existing articulated rig',
  ownership:'one resolver: v7/v11 remain pure inputs, not stacked runtime monkey patches',
  hiddenConnectors:Object.freeze([...HIDDEN]),
  faceModel:'sculpted skull + single bilobed muzzle + embedded eyes + surface ear dishes',
  limbModel:'tapered overlapping skin segments with connector spheres removed from the visible pass'
});

export function resolvePartV12(input){
  const p=clone(cinematicPart(refinePartV71(input)));
  if(HIDDEN.has(p.id)){p.geometry='hiddenV12';return p;}
  const o=OVERRIDE[p.id];
  if(o){if(o.geometry)p.geometry=o.geometry;if(o.pos)p.pos=[...o.pos];if(o.scale)p.scale=[...o.scale];if(o.rot)p.rot=[...o.rot];}
  return p;
}

const pivot=m=>[m?.[12]||0,m?.[13]||0,m?.[14]||0];
const deltaAt=(m,translation=[0,0,0],rotation=[0,0,0])=>{const p=pivot(m);return compose(M4.translate(...translation),M4.translate(...p),M4.rotZ(rotation[2]||0),M4.rotY(rotation[1]||0),M4.rotX(rotation[0]||0),M4.translate(-p[0],-p[1],-p[2]));};
const apply=(out,names,d)=>{for(const n of names)if(out[n])out[n]=M4.mul(d,out[n]);};

export function surfaceStageMatricesV12(base){
  const out=cinematicStageMatrices(base);
  apply(out,['earL'],deltaAt(out.earL,[.015,-.005,-.055],[.02,.18,-.025]));
  apply(out,['earR'],deltaAt(out.earR,[-.015,-.005,-.055],[.02,-.18,.025]));
  apply(out,['shoulderL','elbowL','wristL'],M4.translate(-.035,.012,-.025));
  apply(out,['shoulderR','elbowR','wristR'],M4.translate(.035,.012,-.025));
  apply(out,['elbowL','wristL'],M4.translate(.006,.050,.012));
  apply(out,['elbowR','wristR'],M4.translate(-.006,.050,.012));
  apply(out,['wristL'],M4.translate(.004,.045,.016));
  apply(out,['wristR'],M4.translate(-.004,.045,.016));
  apply(out,['hipL','kneeL','ankleL'],M4.translate(.012,.012,-.028));
  apply(out,['hipR','kneeR','ankleR'],M4.translate(-.012,.012,-.028));
  apply(out,['kneeL','ankleL'],M4.translate(.006,.034,.018));
  apply(out,['kneeR','ankleR'],M4.translate(-.006,.034,.018));
  return out;
}

function uploadMesh(gl,program,g){
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  for(const [name,data] of [['aPos',g.p],['aNormal',g.n]]){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);}
  if(g.i){const b=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.i,gl.STATIC_DRAW);}
  return {vao,indexed:!!g.i,count:g.i?g.i.length:g.p.length/3};
}

const tone=(hex,k)=>{const s=String(hex||'#000000').replace('#','').padEnd(6,'0'),n=parseInt(s.slice(0,6),16),f=c=>Math.max(0,Math.min(255,Math.round(c+(k>=0?(255-c):c)*k))),r=f((n>>16)&255),g=f((n>>8)&255),b=f(n&255);return `rgb(${r},${g},${b})`;};
function fallbackV12(renderer){
  const c=renderer.ctx;if(!c)return;const w=renderer.canvas.width,h=renderer.canvas.height,s=Math.min(w*.285,h*.215),cx=w*.50,cy=h*.55,fur=renderer.config.appearance.fur,muz=renderer.config.appearance.muzzle,eyes=renderer.config.appearance.eyes,inner=tone(muz,-.06),hx=(renderer.pose?.headYaw||0)*.055,hy=-(renderer.pose?.headPitch||0)*.045;
  const ell=(x,y,rx,ry,fill,rot=0,depth=.16)=>{const X=cx+x*s,Y=cy-y*s,RX=rx*s,RY=ry*s;c.save();c.translate(X,Y);c.rotate(rot);const g=c.createRadialGradient(-RX*.24,-RY*.30,Math.max(1,RX*.05),0,0,Math.max(RX,RY));g.addColorStop(0,tone(fill,.18));g.addColorStop(.60,fill);g.addColorStop(1,tone(fill,-depth));c.fillStyle=g;c.beginPath();c.ellipse(0,0,RX,RY,0,0,Math.PI*2);c.fill();c.restore();};
  c.clearRect(0,0,w,h);c.fillStyle=renderer.config.appearance.background;c.fillRect(0,0,w,h);c.save();c.globalAlpha=.25;c.fillStyle='#000';c.beginPath();c.ellipse(cx,cy+1.38*s,.68*s,.065*s,0,0,Math.PI*2);c.fill();c.restore();
  // Far limbs, then one body skin: no connector balls and no stacked chest/pelvis masses.
  ell(-.52,.12,.17,.60,fur,-.045,.22);ell(.50,.12,.17,.60,fur,.035,.18);ell(-.31,-.83,.23,.47,fur,-.018,.20);ell(.31,-.83,.23,.47,fur,.018,.17);
  ell(0,.10,.69,1.01,fur,0,.17);ell(0,.08,.36,.48,tone(muz,-.03),0,.08);
  ell(-.56+hx,1.47+hy,.245,.265,fur,-.10,.20);ell(.56+hx,1.47+hy,.245,.265,fur,.10,.17);ell(-.56+hx,1.47+hy,.14,.15,inner,-.10,.08);ell(.56+hx,1.47+hy,.14,.15,inner,.10,.07);
  ell(hx,1.06+hy,.73,.69,fur,0,.16);ell(hx,.86+hy,.36,.235,muz,0,.08);
  const open=Math.max(.05,1-(renderer.pose?.blink||0)*.94-(renderer.pose?.squint||0)*.12);ell(-.205+hx,1.17+hy,.077,.094*open,eyes,0,.04);ell(.205+hx,1.17+hy,.077,.094*open,eyes,0,.04);if(open>.14){ell(-.184+hx,1.20+hy,.014,.017,'#fff8e6',0,.02);ell(.228+hx,1.20+hy,.014,.017,'#fff8e6',0,.02);}
  ell(hx,.80+hy,.112,.078,eyes,.01,.05);const jaw=renderer.pose?.jaw||0;if(jaw>.025)ell(hx,.70-jaw*.04+hy,.105,.010+.052*jaw,tone(eyes,-.05),0,.02);
  ell(-.31,-1.18,.28,.17,fur,-.055,.18);ell(.31,-1.18,.28,.17,fur,.055,.15);
}

export function installSurfaceV12(){
  if(TeddyRenderer.prototype.__surfaceV12)return;
  TeddyRenderer.prototype.__surfaceV12=true;
  const originalInit=TeddyRenderer.prototype.init;
  TeddyRenderer.prototype.init=function(){const r=originalInit.call(this);if(this.gl&&this.p&&this.meshes){for(const [name,g] of Object.entries(buildSurfaceMeshesV12()))this.meshes[name]=uploadMesh(this.gl,this.p,g);}return r;};
  const originalPart=TeddyRenderer.prototype.partTransform;
  TeddyRenderer.prototype.partTransform=function(part,g,sec,p){return originalPart.call(this,resolvePartV12(part),g,sec,p);};
  const originalGroups=TeddyRenderer.prototype.groupMatrices;
  TeddyRenderer.prototype.groupMatrices=function(sec,p){return surfaceStageMatricesV12(originalGroups.call(this,sec,p));};
  TeddyRenderer.prototype.frame2d=function(){return fallbackV12(this);};
}

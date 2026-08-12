import {M4,compose} from './math.js';
import {buildTeddyArchetype,cameraPlan} from './model.js';

const VS=`#version 300 es
in vec3 aPos;
in vec3 aNormal;
uniform mat4 uMVP;
uniform mat4 uModel;
uniform mat3 uNormal;
out vec3 vN;
out vec3 vP;
void main(){
  vec4 world=uModel*vec4(aPos,1.0);
  vP=world.xyz;
  vN=normalize(uNormal*aNormal);
  gl_Position=uMVP*vec4(aPos,1.0);
}`;

const FS=`#version 300 es
precision highp float;
in vec3 vN;
in vec3 vP;
uniform vec3 uColor;
uniform float uRough;
uniform float uExposure;
uniform float uFuzz;
out vec4 outColor;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 n=normalize(vN);
  vec3 keyDir=normalize(vec3(-.55,.85,.72));
  vec3 fillDir=normalize(vec3(.72,.25,.42));
  vec3 viewDir=normalize(vec3(0.0,.45,7.0)-vP);
  float key=max(dot(n,keyDir),0.0);
  float fill=max(dot(n,fillDir),0.0);
  float hemi=n.y*.5+.5;
  float rim=pow(1.0-max(dot(n,viewDir),0.0),2.6);
  float gloss=mix(72.0,10.0,uRough);
  float spec=pow(max(dot(reflect(-keyDir,n),viewDir),0.0),gloss)*(1.0-uRough*.72);
  vec3 ambient=mix(vec3(.055,.045,.050),vec3(.24,.19,.16),hemi);
  vec3 light=ambient+vec3(1.0,.78,.62)*key*.82+vec3(.30,.37,.54)*fill*.18;
  float grain=(hash31(floor(vP*31.0))-.5)*.075*uFuzz;
  vec3 c=uColor*(light+grain)+vec3(.22,.16,.15)*rim*.28+vec3(1.0,.86,.72)*spec*.55;
  c*=uExposure;
  c=c/(c+vec3(1.0));
  c=pow(max(c,0.0),vec3(1.0/2.2));
  outColor=vec4(c,1.0);
}`;

function shader(gl,type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader compile failed');
  return s;
}
function program(gl){
  const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'program link failed');
  return p;
}

function sphere(lat=24,lon=34){
  const p=[],n=[],i=[];
  for(let y=0;y<=lat;y++){
    const v=y/lat,ph=v*Math.PI;
    for(let x=0;x<=lon;x++){
      const u=x/lon,th=u*Math.PI*2,s=Math.sin(ph),a=[Math.cos(th)*s,Math.cos(ph),Math.sin(th)*s];
      p.push(...a);n.push(...a);
    }
  }
  for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
    const a=y*(lon+1)+x,b=a+lon+1;i.push(a,b,a+1,b,b+1,a+1);
  }
  return {p:new Float32Array(p),n:new Float32Array(n),i:new Uint16Array(i)};
}

function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function normalize(v){const d=Math.hypot(...v)||1;return v.map(x=>x/d)}
function flatGeometry(triangles){
  const p=[],n=[];
  for(const tri of triangles){
    const nn=normalize(cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])));
    for(const v of tri){p.push(...v);n.push(...nn)}
  }
  return {p:new Float32Array(p),n:new Float32Array(n),i:null};
}
function box(){
  const v={nbl:[-1,-1,-1],nbr:[1,-1,-1],ntl:[-1,1,-1],ntr:[1,1,-1],fbl:[-1,-1,1],fbr:[1,-1,1],ftl:[-1,1,1],ftr:[1,1,1]};
  return flatGeometry([
    [v.ftl,v.fbl,v.fbr],[v.ftl,v.fbr,v.ftr],
    [v.ntr,v.nbr,v.nbl],[v.ntr,v.nbl,v.ntl],
    [v.ntl,v.nbl,v.fbl],[v.ntl,v.fbl,v.ftl],
    [v.ftr,v.fbr,v.nbr],[v.ftr,v.nbr,v.ntr],
    [v.ntl,v.ftl,v.ftr],[v.ntl,v.ftr,v.ntr],
    [v.fbl,v.nbl,v.nbr],[v.fbl,v.nbr,v.fbr]
  ]);
}
function prism(){
  const a=[-1,-.68,1],b=[1,-.68,1],c=[0,.82,1],A=[-.78,-.54,-1],B=[.78,-.54,-1],C=[0,.62,-1];
  return flatGeometry([
    [a,b,c],[C,B,A],
    [a,A,B],[a,B,b],
    [b,B,C],[b,C,c],
    [c,C,A],[c,A,a]
  ]);
}

function makeMesh(gl,p,geo){
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const bp=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bp);gl.bufferData(gl.ARRAY_BUFFER,geo.p,gl.STATIC_DRAW);
  const ap=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);
  const bn=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bn);gl.bufferData(gl.ARRAY_BUFFER,geo.n,gl.STATIC_DRAW);
  const an=gl.getAttribLocation(p,'aNormal');gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);
  if(geo.i){const bi=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bi);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geo.i,gl.STATIC_DRAW)}
  return {vao,indexed:!!geo.i,count:geo.i?geo.i.length:geo.p.length/3};
}

function hexToRgb(hex){
  const s=String(hex||'#000000').replace('#','');
  return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255);
}
function mix(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
function shade(a,k){return a.map(v=>Math.max(0,Math.min(1,v*k)))}
function normal3(m){
  const a00=m[0],a01=m[4],a02=m[8],a10=m[1],a11=m[5],a12=m[9],a20=m[2],a21=m[6],a22=m[10];
  const b01=a22*a11-a12*a21,b11=-a22*a10+a12*a20,b21=a21*a10-a11*a20;
  let det=a00*b01+a01*b11+a02*b21;if(!det)return new Float32Array([1,0,0,0,1,0,0,0,1]);det=1/det;
  const inv=[b01*det,(-a22*a01+a02*a21)*det,(a12*a01-a02*a11)*det,b11*det,(a22*a00-a02*a20)*det,(-a12*a00+a02*a10)*det,b21*det,(-a21*a00+a01*a20)*det,(a11*a00-a01*a10)*det];
  return new Float32Array([inv[0],inv[3],inv[6],inv[1],inv[4],inv[7],inv[2],inv[5],inv[8]]);
}
function localTransform(pos,rot,scale){
  return compose(M4.translate(...pos),M4.rotZ(rot?.[2]||0),M4.rotY(rot?.[1]||0),M4.rotX(rot?.[0]||0),M4.scale(...scale));
}

export class TeddyRenderer{
  constructor(canvas,config){
    this.canvas=canvas;this.config=config;this.model=buildTeddyArchetype();this.speech=0;this.listening=0;this.pointer={x:0,y:0};this.reduced=matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;this.last=0;this.backend='canvas2d';
    this.init();
    window.addEventListener('pointermove',e=>{this.pointer.x=(e.clientX/innerWidth-.5)*2;this.pointer.y=(e.clientY/innerHeight-.5)*2});
    addEventListener('resize',()=>this.resize());this.applyAppearance();
  }
  init(){
    const gl=this.canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance'});
    if(!gl){this.ctx=this.canvas.getContext('2d');this.backend='canvas2d';this.resize();return}
    this.gl=gl;this.backend='webgl2';this.p=program(gl);
    this.meshes={sphere:makeMesh(gl,this.p,sphere()),box:makeMesh(gl,this.p,box()),prism:makeMesh(gl,this.p,prism())};
    this.u={mvp:gl.getUniformLocation(this.p,'uMVP'),model:gl.getUniformLocation(this.p,'uModel'),normal:gl.getUniformLocation(this.p,'uNormal'),color:gl.getUniformLocation(this.p,'uColor'),rough:gl.getUniformLocation(this.p,'uRough'),exposure:gl.getUniformLocation(this.p,'uExposure'),fuzz:gl.getUniformLocation(this.p,'uFuzz')};
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);this.resize();
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.switchTo2d()},{once:true});
  }
  switchTo2d(){
    const next=document.createElement('canvas');next.id=this.canvas.id;next.setAttribute('aria-label','Teddy 2D fallback');this.canvas.replaceWith(next);this.canvas=next;this.gl=null;this.ctx=next.getContext('2d');this.backend='canvas2d';this.resize();
  }
  applyAppearance(){document.documentElement.style.setProperty('--teddy-bg',this.config.appearance.background)}
  setConfig(c){this.config=c;this.applyAppearance()}
  setSpeech(v){this.speech=Math.max(0,Math.min(1,Number(v)||0))}
  setListening(v){this.listening=v?1:0}
  resize(){
    const d=Math.min(this.config.render.maxPixelRatio||1.75,devicePixelRatio||1),w=Math.max(1,Math.floor(innerWidth*d)),h=Math.max(1,Math.floor(innerHeight*d));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;if(this.gl)this.gl.viewport(0,0,w,h)}
  }
  material(name){
    const fur=hexToRgb(this.config.appearance.fur),muzzle=hexToRgb(this.config.appearance.muzzle),eyes=hexToRgb(this.config.appearance.eyes);
    const palette={fur,muzzle,eyes,innerEar:mix(fur,muzzle,.68),belly:mix(fur,muzzle,.48),paw:mix(fur,muzzle,.74),highlight:[1,.965,.86],mouth:shade(eyes,.72)};
    return palette[name]||fur;
  }
  groupMatrices(sec){
    const motion=this.reduced?.16:1;
    const root=M4.identity();
    const headSway=Math.sin(sec*.71)*.035*motion+this.pointer.x*.055*motion;
    const headPitch=this.pointer.y*-.032*motion+this.listening*.022;
    const head=compose(root,M4.translate(0,1.24,.01),M4.rotY(headSway),M4.rotX(headPitch),M4.rotZ(Math.sin(sec*.43)*.012*motion));
    const gesture=this.speech*motion;
    const armL=compose(root,M4.translate(-.74,.28,.01),M4.rotZ(-.24-.10*gesture*Math.sin(sec*5.0)));
    const armR=compose(root,M4.translate(.74,.28,.01),M4.rotZ(.24+.11*gesture*Math.cos(sec*4.6)));
    return {root,head,armL,armR};
  }
  partTransform(part,groups,sec){
    let pos=[...part.pos],scale=[...part.scale],rot=[...part.rot],motion=this.reduced?.16:1;
    if(part.id==='torso')scale[1]*=1+Math.sin(sec*2.05)*.015*motion;
    if(part.id==='headShell')scale[1]*=1+this.listening*.012;
    if(part.id.startsWith('eye')){const blink=this.reduced?0:Math.pow(Math.max(0,Math.sin(sec*.59+1.2)),42);scale[1]*=1-blink*.91}
    if(part.id==='browL'){pos[1]+=this.listening*.035+this.speech*.014;rot[2]+=-this.config.persona.irritability*.10}
    if(part.id==='browR'){pos[1]+=this.listening*.015-this.speech*.008;rot[2]+=this.config.persona.irritability*.12}
    if(part.mouth){const open=this.speech*.18;pos[1]-=open*.18;rot[2]+=(part.id==='mouthL'?-1:1)*open}
    return compose(groups[part.parent]||groups.root,localTransform(pos,rot,scale));
  }
  frame(t){
    const target=1000/Math.max(24,this.config.render.targetFps||60);if(t-this.last<target*.82){requestAnimationFrame(x=>this.frame(x));return}this.last=t;this.resize();if(this.gl)this.frameGL(t);else this.frame2d(t);requestAnimationFrame(x=>this.frame(x));
  }
  frameGL(t){
    const gl=this.gl,sec=t/1000;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.p);gl.uniform1f(this.u.exposure,this.config.appearance.exposure||1);
    const plan=cameraPlan(this.canvas.width,this.canvas.height),proj=M4.perspective(plan.fov,plan.aspect,.1,100),view=M4.translate(0,-plan.centerY,-plan.distance),groups=this.groupMatrices(sec);
    for(const part of this.model.parts){
      const model=this.partTransform(part,groups,sec),mvp=compose(proj,view,model),mesh=this.meshes[part.geometry];
      gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(this.u.model,false,model);gl.uniformMatrix4fv(this.u.mvp,false,mvp);gl.uniformMatrix3fv(this.u.normal,false,normal3(model));gl.uniform3fv(this.u.color,this.material(part.material));gl.uniform1f(this.u.rough,part.roughness);gl.uniform1f(this.u.fuzz,part.material==='fur'?.95:part.material==='belly'||part.material==='paw'?.38:0);
      if(mesh.indexed)gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);else gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
  }
  frame2d(t){
    const c=this.ctx;if(!c)return;const sec=t/1000,w=this.canvas.width,h=this.canvas.height,plan=cameraPlan(w,h),span=plan.fill*h,s=span/(this.model.bounds.max[1]-this.model.bounds.min[1]),cx=w/2,cy=h*.50,fur=this.config.appearance.fur,muz=this.config.appearance.muzzle,eyes=this.config.appearance.eyes;
    const toCss=(v)=>`rgb(${v.map(x=>Math.round(x*255)).join(' ')})`;const furRgb=hexToRgb(fur),muzRgb=hexToRgb(muz),inner=toCss(mix(furRgb,muzRgb,.68)),paw=toCss(mix(furRgb,muzRgb,.74));
    const ellipse=(x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(cx+x*s,cy-y*s,rx*s,ry*s,0,0,Math.PI*2);c.fillStyle=fill;c.fill()};
    c.clearRect(0,0,w,h);c.save();c.shadowColor='#0008';c.shadowBlur=30*s;ellipse(0,-1.19,.74,.11,'#0005');c.restore();
    const motion=this.reduced?.16:1,breathe=1+Math.sin(sec*2.05)*.015*motion;
    ellipse(0,-.03,.83,1.00*breathe,fur);ellipse(0,-.10,.51,.65,toCss(mix(furRgb,muzRgb,.48)));
    ellipse(-.37,-.91,.40,.47,fur);ellipse(.37,-.91,.40,.47,fur);ellipse(-.37,-.91,.23,.19,paw);ellipse(.37,-.91,.23,.19,paw);
    ellipse(-.80,.02,.30,.67,fur);ellipse(.80,.02,.30,.67,fur);ellipse(-.86,-.42,.25,.25,fur);ellipse(.86,-.42,.25,.25,fur);ellipse(-.86,-.42,.14,.13,paw);ellipse(.86,-.42,.14,.13,paw);
    const hx=this.pointer.x*.025*motion,hy=this.pointer.y*.012*motion;
    ellipse(-.59+hx,1.75+hy,.31,.32,fur);ellipse(.59+hx,1.75+hy,.31,.32,fur);ellipse(-.59+hx,1.75+hy,.17,.18,inner);ellipse(.59+hx,1.75+hy,.17,.18,inner);ellipse(hx,1.24+hy,.84,.74,fur);ellipse(hx,1.04+hy,.49,.31,muz);
    const blink=this.reduced?0:Math.pow(Math.max(0,Math.sin(sec*.59+1.2)),42),ey=.105*(1-blink*.91);
    ellipse(-.275+hx,1.315+hy,.083,ey,eyes);ellipse(.275+hx,1.315+hy,.083,ey,eyes);ellipse(-.248+hx,1.35+hy,.018,.023,'#fff7df');ellipse(.302+hx,1.35+hy,.018,.023,'#fff7df');
    c.fillStyle=eyes;c.beginPath();c.moveTo(cx+(-.17+hx)*s,cy-(1.135+hy)*s);c.lineTo(cx+(.17+hx)*s,cy-(1.135+hy)*s);c.lineTo(cx+hx*s,cy-(1.01+hy)*s);c.closePath();c.fill();
    c.lineCap='round';c.strokeStyle=eyes;c.lineWidth=Math.max(2,.035*s);const browY=1.50+this.listening*.035;c.beginPath();c.moveTo(cx+(-.50+hx)*s,cy-(browY+hy)*s);c.lineTo(cx+(-.12+hx)*s,cy-(browY+.04+hy)*s);c.moveTo(cx+(.12+hx)*s,cy-(browY+.04+hy)*s);c.lineTo(cx+(.50+hx)*s,cy-(browY+hy)*s);c.stroke();
    c.lineWidth=Math.max(2,.028*s);c.beginPath();const mouthY=0.88-this.speech*.03;c.moveTo(cx+hx*s,cy-(.99+hy)*s);c.lineTo(cx+(-.13+hx)*s,cy-(mouthY+hy)*s);c.moveTo(cx+hx*s,cy-(.99+hy)*s);c.lineTo(cx+(.13+hx)*s,cy-(mouthY+hy)*s);c.stroke();
  }
  start(){requestAnimationFrame(x=>this.frame(x))}
}

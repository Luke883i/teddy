import {M4,compose} from './math.js';
import {buildTeddyArchetype,cameraPlan,FLOOR_Y} from './model.js';
import {ExpressionRig,sanitizeVoiceFrame} from './rig.js';
import {kinematicTargets} from './kinematics.js';

const VS=`#version 300 es
in vec3 aPos;in vec3 aNormal;
uniform mat4 uMVP;uniform mat4 uModel;uniform mat3 uNormal;
uniform float uFuzz;uniform float uKind;
out vec3 vN;out vec3 vP;out vec3 vLocal;
float hash13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
void main(){
  float furMask=step(uKind,.49);
  float fuzz=(hash13(aPos*37.0)-.5)*.018*uFuzz*furMask;
  vec3 local=aPos+aNormal*fuzz;
  vec4 world=uModel*vec4(local,1.0);
  vP=world.xyz;vLocal=aPos/vec3(1.0);vN=normalize(uNormal*aNormal);gl_Position=uMVP*vec4(local,1.0);
}`;
const FS=`#version 300 es
precision highp float;
in vec3 vN;in vec3 vP;in vec3 vLocal;
uniform vec3 uColor;uniform vec3 uCamera;uniform float uRough;uniform float uExposure;uniform float uFuzz;uniform float uSheen;uniform float uAlpha;uniform float uKind;out vec4 outColor;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),g=hash31(i+vec3(1,0,1)),h=hash31(i+vec3(0,1,1)),j=hash31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,j,f.x),f.y),f.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){
  vec3 n=normalize(vN),v=normalize(uCamera-vP),keyDir=normalize(vec3(-.44,.84,.58)),fillDir=normalize(vec3(.68,.24,.48));
  float ndk=dot(n,keyDir),wrap=clamp((ndk+.52)/1.52,0.0,1.0),key=max(ndk,0.0),fill=max(dot(n,fillDir),0.0),hemi=n.y*.5+.5;
  float fres=pow(1.0-max(dot(n,v),0.0),2.55),micro=noise3(vLocal*18.0)*.62+noise3(vLocal*43.0)*.38;
  float rough=clamp(uRough,.05,1.0),gloss=mix(128.0,7.0,rough),spec=pow(max(dot(reflect(-keyDir,n),v),0.0),gloss);
  vec3 ambient=mix(vec3(.030,.030,.038),vec3(.215,.178,.145),hemi);
  vec3 light=ambient+vec3(1.02,.79,.60)*(key*.48+wrap*.28)+vec3(.24,.31,.46)*fill*.18;
  float furLift=(micro-.5)*uFuzz*.050;
  float eyeBoost=step(.5,uKind);
  vec3 c=uColor*(light+furLift)+uColor*fres*uSheen*(.07+.10*uFuzz);
  c+=vec3(1.0,.88,.72)*spec*mix(.08,.78,eyeBoost)*(1.0-rough*.55);
  c=aces(max(c*uExposure,0.0));c=pow(c,vec3(1.0/2.2));outColor=vec4(c,uAlpha);
}`;

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader compile failed');return s}
function program(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'program link failed');return p}
function sphere(lat=30,lon=44){const p=[],n=[],i=[];for(let y=0;y<=lat;y++){const v=y/lat,ph=v*Math.PI;for(let x=0;x<=lon;x++){const u=x/lon,th=u*Math.PI*2,s=Math.sin(ph),a=[Math.cos(th)*s,Math.cos(ph),Math.sin(th)*s];p.push(...a);n.push(...a)}}for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;i.push(a,b,a+1,b,b+1,a+1)}return{p:new Float32Array(p),n:new Float32Array(n),i:new Uint16Array(i)}}
function capsule(radial=34,hemi=9,half=.55){const rings=[];for(let r=0;r<=hemi;r++){const a=-Math.PI/2+(Math.PI/2)*(r/hemi);rings.push({y:-half+Math.sin(a),q:Math.cos(a)})}rings.push({y:half,q:1});for(let r=1;r<=hemi;r++){const a=(Math.PI/2)*(r/hemi);rings.push({y:half+Math.sin(a),q:Math.cos(a)})}const p=[],n=[],i=[];for(const ring of rings){for(let x=0;x<=radial;x++){const th=x/radial*Math.PI*2,cs=Math.cos(th),sn=Math.sin(th);p.push(cs*ring.q,ring.y,sn*ring.q);let ny=0;if(ring.y<-half)ny=ring.y+half;else if(ring.y>half)ny=ring.y-half;const d=Math.hypot(ring.q,ny)||1;n.push(cs*ring.q/d,ny/d,sn*ring.q/d)}}for(let y=0;y<rings.length-1;y++)for(let x=0;x<radial;x++){const a=y*(radial+1)+x,b=a+radial+1;i.push(a,b,a+1,b,b+1,a+1)}return{p:new Float32Array(p),n:new Float32Array(n),i:new Uint16Array(i)}}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function normalize(v){const d=Math.hypot(...v)||1;return v.map(x=>x/d)}
function flatGeometry(tris){const p=[],n=[];for(const tri of tris){const nn=normalize(cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])));for(const v of tri){p.push(...v);n.push(...nn)}}return{p:new Float32Array(p),n:new Float32Array(n),i:null}}
function prism(){const a=[-1,-.60,1],b=[1,-.60,1],c=[0,.75,1],A=[-.72,-.45,-1],B=[.72,-.45,-1],C=[0,.54,-1];return flatGeometry([[a,b,c],[C,B,A],[a,A,B],[a,B,b],[b,B,C],[b,C,c],[c,C,A],[c,A,a]])}
function plane(){return flatGeometry([[[-1,0,-1],[1,0,-1],[1,0,1]],[[-1,0,-1],[1,0,1],[-1,0,1]]])}
function makeMesh(gl,p,geo){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const bp=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bp);gl.bufferData(gl.ARRAY_BUFFER,geo.p,gl.STATIC_DRAW);const ap=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);const bn=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bn);gl.bufferData(gl.ARRAY_BUFFER,geo.n,gl.STATIC_DRAW);const an=gl.getAttribLocation(p,'aNormal');gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);if(geo.i){const bi=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bi);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geo.i,gl.STATIC_DRAW)}return{vao,indexed:!!geo.i,count:geo.i?geo.i.length:geo.p.length/3}}
function hexToRgb(hex){const s=String(hex||'#000000').replace('#','');return[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)}
function mix(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
function normal3(m){const a00=m[0],a01=m[4],a02=m[8],a10=m[1],a11=m[5],a12=m[9],a20=m[2],a21=m[6],a22=m[10],b01=a22*a11-a12*a21,b11=-a22*a10+a12*a20,b21=a21*a10-a11*a20;let det=a00*b01+a01*b11+a02*b21;if(!det)return new Float32Array([1,0,0,0,1,0,0,0,1]);det=1/det;const inv=[b01*det,(-a22*a01+a02*a21)*det,(a12*a01-a02*a11)*det,b11*det,(a22*a00-a02*a20)*det,(-a12*a00+a02*a10)*det,b21*det,(-a21*a00+a01*a20)*det,(a11*a00-a01*a10)*det];return new Float32Array([inv[0],inv[3],inv[6],inv[1],inv[4],inv[7],inv[2],inv[5],inv[8]])}
function localTransform(pos,rot=[0,0,0],scale=[1,1,1]){return compose(M4.translate(...pos),M4.rotZ(rot[2]||0),M4.rotY(rot[1]||0),M4.rotX(rot[0]||0),M4.scale(...scale))}

export class TeddyRenderer{
  constructor(canvas,config){
    this.canvas=canvas;this.config=config;this.model=buildTeddyArchetype();this.pointer={x:0,y:0};
    this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
    this.rig=new ExpressionRig({reducedMotion:this.reduced,persona:config.persona});this.pose=this.rig.step(0,0,this.pointer);
    this.locomotion={speed:0,direction:1};this.last=0;this.lastPose=0;this.backend='canvas2d';this.lastRichVoiceAt=-Infinity;
    this.rebuildPalette();this.init();
    globalThis.window?.addEventListener('pointermove',e=>{const iw=Math.max(1,innerWidth),ih=Math.max(1,innerHeight);this.pointer.x=clamp(e.clientX/iw*2-1,-1,1);this.pointer.y=clamp(e.clientY/ih*2-1,-1,1)});
    globalThis.window?.addEventListener('teddy:voice',e=>this.setVoice(e.detail));globalThis.addEventListener?.('resize',()=>this.resize());this.applyAppearance()
  }
 init(){try{const gl=this.canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance',premultipliedAlpha:true});if(!gl)return this.init2d();this.gl=gl;this.backend='webgl2';this.p=program(gl);const q=this.config.render?.quality,sd=q==='low'?[18,26]:q==='high'?[36,52]:[30,44],cd=q==='low'?[22,6]:q==='high'?[40,10]:[34,9];this.meshes={sphere:makeMesh(gl,this.p,sphere(...sd)),capsule:makeMesh(gl,this.p,capsule(...cd)),prism:makeMesh(gl,this.p,prism()),plane:makeMesh(gl,this.p,plane())};this.u={mv
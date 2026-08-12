export const VS=`#version 300 es
in vec3 aPos;in vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;uniform mat3 uNormal;out vec3 vN;out vec3 vP;out vec3 vLocal;
void main(){vec4 world=uModel*vec4(aPos,1.0);vP=world.xyz;vLocal=aPos;vN=normalize(uNormal*aNormal);gl_Position=uMVP*vec4(aPos,1.0);}`;

export const FS=`#version 300 es
precision highp float;in vec3 vN;in vec3 vP;in vec3 vLocal;uniform vec3 uColor;uniform vec3 uCamera;uniform float uRough;uniform float uExposure;uniform float uFuzz;uniform float uSheen;uniform float uAlpha;out vec4 outColor;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float n000=hash31(i),n100=hash31(i+vec3(1,0,0)),n010=hash31(i+vec3(0,1,0)),n110=hash31(i+vec3(1,1,0)),n001=hash31(i+vec3(0,0,1)),n101=hash31(i+vec3(1,0,1)),n011=hash31(i+vec3(0,1,1)),n111=hash31(i+vec3(1,1,1));return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){
 vec3 n=normalize(vN);vec3 micro=vec3(noise3(vLocal*37.0+vec3(2.1,0,0)),noise3(vLocal*41.0+vec3(0,7.3,0)),noise3(vLocal*43.0+vec3(0,0,11.7)))-.5;n=normalize(n+micro*.045*uFuzz);
 vec3 v=normalize(uCamera-vP),keyDir=normalize(vec3(-.55,.80,.72)),fillDir=normalize(vec3(.66,.22,.54));float ndk=dot(n,keyDir),key=max(ndk,0.0),wrap=clamp((ndk+.38)/1.38,0.0,1.0),fill=max(dot(n,fillDir),0.0),hemi=n.y*.5+.5;
 float fres=pow(1.0-max(dot(n,v),0.0),2.2),gloss=mix(96.0,12.0,uRough),spec=pow(max(dot(reflect(-keyDir,n),v),0.0),gloss)*(1.0-uRough*.72);float fur=(noise3(vLocal*13.0)*.68+noise3(vLocal*31.0)*.32-.5)*uFuzz;
 vec3 ambient=mix(vec3(.038,.035,.047),vec3(.240,.180,.140),hemi);vec3 light=ambient+vec3(1.0,.74,.55)*(key*.62+wrap*.22)+vec3(.27,.34,.50)*fill*.19;vec3 c=uColor*(light+fur*.07)+uColor*fres*(.10+.16*uSheen)+vec3(1.0,.84,.66)*spec*(.43+.18*uSheen);c=aces(max(c*uExposure,0.0));c=pow(c,vec3(1.0/2.2));outColor=vec4(c,uAlpha);
}`;

export const M4={
  identity:()=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  mul:(a,b)=>{const o=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
  translate:(x,y,z)=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]),
  scale:(x,y,z)=>new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]),
  rotX:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1])},
  rotY:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1])},
  rotZ:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1])},
  perspective:(fov,asp,n,f)=>{const t=1/Math.tan(fov/2),nf=1/(n-f);return new Float32Array([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*nf,-1, 0,0,2*f*n*nf,0])},
  lookAt:(eye,target,up=[0,1,0])=>{
    const norm=v=>{const d=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/d,v[1]/d,v[2]/d]};
    const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);
    return new Float32Array([
      x[0],y[0],z[0],0,
      x[1],y[1],z[1],0,
      x[2],y[2],z[2],0,
      -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),
      -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),
      -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1
    ])
  }
};
export const compose=(...m)=>m.reduce((a,b)=>M4.mul(a,b),M4.identity());
export function transformPoint(m,p){const [x,y,z,w=1]=p;return [m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w];}

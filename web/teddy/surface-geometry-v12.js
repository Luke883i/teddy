const TAU=Math.PI*2;
const clamp=(v,a=-Infinity,b=Infinity)=>Math.max(a,Math.min(b,v));

function finalize(positions,indices){
  const normals=new Float32Array(positions.length);
  for(let t=0;t<indices.length;t+=3){
    const ia=indices[t]*3,ib=indices[t+1]*3,ic=indices[t+2]*3;
    const ax=positions[ia],ay=positions[ia+1],az=positions[ia+2];
    const bx=positions[ib],by=positions[ib+1],bz=positions[ib+2];
    const cx=positions[ic],cy=positions[ic+1],cz=positions[ic+2];
    const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for(const i of [ia,ib,ic]){normals[i]+=nx;normals[i+1]+=ny;normals[i+2]+=nz;}
  }
  for(let i=0;i<normals.length;i+=3){const d=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=d;normals[i+1]/=d;normals[i+2]/=d;}
  const maxIndex=Math.max(...indices);
  return {p:new Float32Array(positions),n:normals,i:maxIndex>65535?new Uint32Array(indices):new Uint16Array(indices)};
}

function sphereWarp(lat,lon,warp){
  const p=[],idx=[];
  for(let y=0;y<=lat;y++){
    const ph=y/lat*Math.PI,s=Math.sin(ph),cy=Math.cos(ph);
    for(let x=0;x<=lon;x++){
      const th=x/lon*TAU;
      const q=warp([Math.cos(th)*s,cy,Math.sin(th)*s]);
      p.push(q[0],q[1],q[2]);
    }
  }
  for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
    const a=y*(lon+1)+x,b=a+lon+1;idx.push(a,b,a+1,b,b+1,a+1);
  }
  return finalize(p,idx);
}

function lathe(profile,radial=48){
  const p=[],idx=[];
  for(let y=0;y<profile.length;y++){
    const [py,r,front=1]=profile[y];
    for(let x=0;x<=radial;x++){
      const th=x/radial*TAU,cs=Math.cos(th),sn=Math.sin(th);
      const depth=1+(front-1)*Math.max(0,sn);
      p.push(cs*r,py,sn*r*depth);
    }
  }
  for(let y=0;y<profile.length-1;y++)for(let x=0;x<radial;x++){
    const a=y*(radial+1)+x,b=a+radial+1;idx.push(a,b,a+1,b,b+1,a+1);
  }
  return finalize(p,idx);
}

function polarPatch(rings=18,segments=56,depth=.12,rim=.02){
  const p=[0,0,-depth],idx=[];
  for(let r=1;r<=rings;r++){
    const u=r/rings,z=-depth*(1-u*u)+rim*u*u;
    for(let s=0;s<segments;s++){
      const th=s/segments*TAU;p.push(Math.cos(th)*u,Math.sin(th)*u,z);
    }
  }
  for(let s=0;s<segments;s++)idx.push(0,1+s,1+((s+1)%segments));
  for(let r=1;r<rings;r++){
    const a0=1+(r-1)*segments,b0=1+r*segments;
    for(let s=0;s<segments;s++){
      const sn=(s+1)%segments,a=a0+s,an=a0+sn,b=b0+s,bn=b0+sn;
      idx.push(a,b,an,an,b,bn);
    }
  }
  return finalize(p,idx);
}

const skullWarp=([x,y,z])=>{
  const mid=1-y*y,lower=clamp(-y,0,1),upper=clamp(y,0,1);
  const side=1+.075*mid+.045*lower-.025*upper;
  return [x*side,y*(.985-.025*mid),z*(.94+.07*mid+.035*lower)];
};

const bodyWarp=([x,y,z])=>{
  const lower=clamp(-y,0,1),upper=clamp(y,0,1),mid=1-y*y;
  return [x*(.91+.12*mid+.09*lower-.12*upper),y,z*(.94+.08*mid+.05*lower)];
};

const muzzleWarp=([x,y,z])=>{
  const ax=Math.abs(x),lobe=Math.exp(-Math.pow((ax-.42)/.28,2))*Math.exp(-Math.pow((y+.12)/.68,2));
  const centerSoft=1-.08*Math.exp(-Math.pow(x/.20,2))*Math.exp(-Math.pow((y+.02)/.45,2));
  return [x*(1+.10*(1-y*y)),y*(.92+.04*(1-x*x)),z*(.82+.22*lobe+.08*(1-y*y))*centerSoft];
};

const earWarp=([x,y,z])=>{
  const r2=x*x+y*y,edge=clamp(r2,0,1);
  return [x,y,z*(.62+.18*edge)+.035*(1-edge)];
};

const footWarp=([x,y,z])=>{
  const front=clamp(z,0,1),back=clamp(-z,0,1);
  const yy=y<-.68?-1+(y+1)*.94:y;
  return [x*(.96+.06*front),yy,z*(1+.10*front-.03*back)];
};

export const LIMB_PROFILE_V12=Object.freeze([
  [-1,.69,.98],[-.82,.82,1.00],[-.42,.96,1.02],[0,1,1.04],[.42,.94,1.03],[.82,.80,1.00],[1,.68,.98]
]);

export function buildSurfaceMeshesV12(){
  return {
    bodyV12:sphereWarp(38,52,bodyWarp),
    skullV12:sphereWarp(40,56,skullWarp),
    muzzleV12:sphereWarp(34,52,muzzleWarp),
    earV12:sphereWarp(30,44,earWarp),
    earDishV12:polarPatch(18,56,.20,.015),
    bellyPatchV12:polarPatch(20,64,-.15,0),
    limbV12:lathe(LIMB_PROFILE_V12,48),
    footV12:sphereWarp(28,44,footWarp)
  };
}

export function surfaceMeshMetricsV12(meshes=buildSurfaceMeshesV12()){
  const metric={};
  for(const [name,m] of Object.entries(meshes)){
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for(let i=0;i<m.p.length;i+=3){const x=m.p[i],y=m.p[i+1],z=m.p[i+2];minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
    metric[name]={vertices:m.p.length/3,triangles:m.i.length/3,bounds:{min:[minX,minY,minZ],max:[maxX,maxY,maxZ]}};
  }
  return metric;
}

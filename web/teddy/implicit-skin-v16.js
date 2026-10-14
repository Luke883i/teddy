import {underarmCutters,applyUnderarmRelief} from './underarm-relief-v19.js';
// V16: closed indexed isosurface from smooth union of the actual posed plush volumes.
// Extract once in the bind pose. Vertex topology stays identical during skeleton skinning.
const finite=v=>Number.isFinite(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const IMPLICIT_SKIN_V16=Object.freeze({voxel:.075,smoothness:.12,maxCells:180000,maxVertices:120000,version:16});
const FUR='fur';
export function furPrimitive(part,m){
  if(part?.material!==FUR||!m||m.length!==16)return null;
  const c=[m[12],m[13],m[14]],axes=[],r=[];
  for(let j=0;j<3;j++){
    const x=m[4*j],y=m[4*j+1],z=m[4*j+2],len=Math.hypot(x,y,z);
    if(!finite(len)||len<=1e-5)return null;
    r.push(len);axes.push([x/len,y/len,z/len]);
  }
  return {id:part.id,parent:part.parent,c,axes,r,power:part.geometry==='capsule'?4:2};
}
export function primitiveDistance(p,s){
  let sum=0;
  for(let j=0;j<3;j++){
    const d=((p[0]-s.c[0])*s.axes[j][0]+(p[1]-s.c[1])*s.axes[j][1]+(p[2]-s.c[2])*s.axes[j][2])/s.r[j];
    sum+=Math.abs(d)**s.power;
  }
  return (sum**(1/s.power)-1)*Math.min(...s.r);
}
export function smoothUnion(a,b,k){
  const h=clamp(.5+.5*(b-a)/k,0,1);
  return b+(a-b)*h-k*h*(1-h);
}
export function skinField(p,primitives,smoothing=IMPLICIT_SKIN_V16.smoothness,cutters=null){
  let result=Infinity;
  for(const part of primitives){
    const v=primitiveDistance(p,part);
    result=finite(result)?smoothUnion(result,v,smoothing):v;
  }
  return applyUnderarmRelief(p,result,cutters??underarmCutters(primitives));
}
function bounds(primitives,k){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const s of primitives)for(let i=0;i<3;i++){
    const bound=s.r.reduce((sum,r,j)=>sum+Math.abs(s.axes[j][i])*r,0)+k+.11;
    lo[i]=Math.min(lo[i],s.c[i]-bound);
    hi[i]=Math.max(hi[i],s.c[i]+bound);
  }
  return {lo,hi};
}
const SUBTETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const CUBE=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function extractImplicitMesh(primitives,options={}){
  if(!Array.isArray(primitives)||!primitives.length)throw Error('no fur volumes for implicit skin');
  const voxel=clamp(Number(options.voxel)||IMPLICIT_SKIN_V16.voxel,.045,.13);
  const smoothing=clamp(Number(options.smoothing)||IMPLICIT_SKIN_V16.smoothness,.045,.24);
  const {lo,hi}=bounds(primitives,smoothing),dim=lo.map((x,i)=>Math.ceil((hi[i]-x)/voxel)+1);
  const [nx,ny,nz]=dim,cells=(nx-1)*(ny-1)*(nz-1);
  if(cells>IMPLICIT_SKIN_V16.maxCells)throw Error('implicit skin cell budget exceeded');
  const id=(x,y,z)=>(z*ny+y)*nx+x,nodes=nx*ny*nz;
  const field=new Float32Array(nodes),positions=new Float32Array(nodes*3);
  const cutters=options.underarmRelief===false?[]:underarmCutters(primitives,options);
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const i=id(x,y,z),p=[lo[0]+x*voxel,lo[1]+y*voxel,lo[2]+z*voxel];
    positions.set(p,i*3);field[i]=skinField(p,primitives,smoothing,cutters);
  }
  // Shared lattice edge IDs: no neighboring tetra may create duplicate seam vertices.
  const edgeMap=new Map(),verts=[],faces=[];
  function vertex(a,b){
    const key=a<b?a+','+b:b+','+a;
    const cached=edgeMap.get(key);if(cached!==undefined)return cached;
    const d0=field[a],d1=field[b],t=clamp(d0/(d0-d1),0,1),idx=verts.length/3;
    for(let j=0;j<3;j++)verts.push(positions[a*3+j]+(positions[b*3+j]-positions[a*3+j])*t);
    edgeMap.set(key,idx);
    if(idx>IMPLICIT_SKIN_V16.maxVertices)throw Error('implicit skin vertex budget exceeded');
    return idx;
  }
  function tri(a,b,c,inside,outside){
    if(a===b||b===c||a===c)return;
    const A=verts.slice(a*3,a*3+3),B=verts.slice(b*3,b*3+3),C=verts.slice(c*3,c*3+3);
    const normal=cross(B.map((v,i)=>v-A[i]),C.map((v,i)=>v-A[i]));
    const travel=outside.map((v,i)=>v-inside[i]);
    if(normal[0]*travel[0]+normal[1]*travel[1]+normal[2]*travel[2]<0)faces.push(a,c,b);
    else faces.push(a,b,c);
  }
  const gp=i=>Array.from(positions.slice(3*i,3*i+3));
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const cube=CUBE.map(([dx,dy,dz])=>id(x+dx,y+dy,z+dz));
    const ds=cube.map(i=>field[i]);
    if(ds.every(v=>v>=0)||ds.every(v=>v<0))continue;
    for(const tet of SUBTETS){
      const ii=tet.map(i=>cube[i]),inside=ii.filter(i=>field[i]<0),outside=ii.filter(i=>field[i]>=0);
      if(inside.length===0||inside.length===4)continue;
      const avg=list=>[0,1,2].map(k=>list.reduce((s,id)=>s+positions[3*id+k],0)/list.length);
      const P=avg(inside),Q=avg(outside);
      if(inside.length===1){
        tri(...outside.map(o=>vertex(inside[0],o)),P,Q);
      }else if(outside.length===1){
        tri(...inside.map(i=>vertex(i,outside[0])),P,Q);
      }else{
        const [a,b]=inside,[c,d]=outside;
        const ac=vertex(a,c),ad=vertex(a,d),bc=vertex(b,c),bd=vertex(b,d);
        tri(ac,ad,bc,P,Q);tri(ad,bd,bc,P,Q);
      }
    }
  }
  if(!faces.length)throw Error('empty implicit surface');
  const geometry={p:new Float32Array(verts),i:new Uint32Array(faces)};
  geometry.n=vertexNormals(geometry.p,geometry.i);
  return geometry;
}
export function vertexNormals(p,indices){
  const out=new Float32Array(p.length);
  for(let t=0;t<indices.length;t+=3){
    const a=indices[t]*3,b=indices[t+1]*3,c=indices[t+2]*3;
    const u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]];
    const v=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
    const n=cross(u,v);
    for(const j of [a,b,c])for(let k=0;k<3;k++)out[j+k]+=n[k];
  }
  for(let i=0;i<out.length;i+=3){
    const mag=Math.hypot(out[i],out[i+1],out[i+2])||1;
    for(let j=0;j<3;j++)out[i+j]/=mag;
  }
  return out;
}
export function meshTopology(geometry){
  const edges=new Map(),i=geometry.i,p=geometry.p;
  for(let t=0;t<i.length;t+=3)for(const [a,b] of [[i[t],i[t+1]],[i[t+1],i[t+2]],[i[t+2],i[t]]]){
    const key=a<b?a+','+b:b+','+a;edges.set(key,(edges.get(key)||0)+1);
  }
  const roots=Int32Array.from({length:p.length/3},(_,i)=>i);
  function find(x){while(roots[x]!==x){roots[x]=roots[roots[x]];x=roots[x]}return x}
  for(let t=0;t<i.length;t+=3){const a=find(i[t]),b=find(i[t+1]),c=find(i[t+2]);roots[b]=a;roots[c]=a}
  const components=new Set();for(const v of i)components.add(find(v));
  let open=0,nonmanifold=0;
  for(const count of edges.values()){if(count===1)open++;if(count!==2)nonmanifold++}
  return {vertices:p.length/3,triangles:i.length/3,edges:edges.size,openEdges:open,nonmanifoldEdges:nonmanifold,components:components.size,euler:p.length/3-edges.size+i.length/3,closed:open===0&&nonmanifold===0&&i.length>0};
}

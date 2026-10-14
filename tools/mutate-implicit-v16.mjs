// Mutation evidence: exactly 1,000,000 deterministic local/intermediate/global probes.
// Small subset re-extracts topology; this is NOT one million expensive full meshing runs.
import {furPrimitive,primitiveDistance,smoothUnion,skinField,extractImplicitMesh,meshTopology} from '../web/teddy/implicit-skin-v16.js';
const N=1_000_000,valid=new Uint32Array(3),invalid=new Uint32Array(3);
let failures=0,sdfFinite=0,checksum=2166136261,topological=0;
const basis=[[1,0,0],[0,1,0],[0,0,1]];
const sphere=(x,y,z,r,parent='root')=>({id:'s',parent,c:[x,y,z],axes:basis,r:[r,r,r],power:2});
for(let i=0;i<N;i++){
  const h=Math.imul((i^0x54454459)>>>0,0x9e3779b1)>>>0;
  const layer=i%3,deliberatelyInvalid=i%2===1,amount=(h&65535)/65535;
  const rad=layer===0?.26+amount*.18:layer===1?.38+amount*.1:.45+amount*.15;
  const distance=deliberatelyInvalid?NaN:layer===0?.22+amount*.19:layer===1?.30+amount*.26:.44+amount*.22;
  const parts=[sphere(0,0,0,rad),sphere(distance,0,0,rad)];
  const accepted=parts.every(p=>p.r.every(r=>Number.isFinite(r)&&r>.08)&&p.c.every(Number.isFinite));
  if(accepted===deliberatelyInvalid)failures++;
  if(accepted){
    valid[layer]++;
    const p=[(h>>>16)/65535-.5,0,(h&255)/512-.25];
    const d=skinField(p,parts,.12);
    const ds=smoothUnion(primitiveDistance(p,parts[0]),primitiveDistance(p,parts[1]),.12);
    if(!Number.isFinite(d)||Math.abs(d-ds)>1e-9)failures++;
    sdfFinite++;
  }else invalid[layer]++;
  checksum=Math.imul(checksum^(h+Number(accepted)+layer),16777619)>>>0;
  if(i%20000===0){
    const merged=[sphere(0,0,0,rad),sphere(rad*.9,0,0,rad)];
    const geometry=extractImplicitMesh(merged,{voxel:.13,smoothing:.12});
    const topology=meshTopology(geometry);
    if(!topology.closed||topology.components!==1||topology.openEdges||topology.nonmanifoldEdges)failures++;
    topological++;
  }
}
const counts=a=>[...a].reduce((x,y)=>x+y,0);
const receipt={version:16,candidates:N,seed:'0x54454459',tiers:['local','intermediate','global'],accepted:counts(valid),rejected:counts(invalid),validByTier:[...valid],invalidByTier:[...invalid],sdfFinite,topologicalReconstructions:topological,failures,checksum:checksum.toString(16).padStart(8,'0'),epistemicLimit:'1M SDF/parameter mutants + 50 actual topological re-extractions, not 1M meshes or rendered animations'};
console.log('TEDDY_V16_MUTATION_RECEIPT',JSON.stringify(receipt));
if(failures||receipt.accepted!==500000||receipt.rejected!==500000||topological!==50||Math.min(...valid)===0)process.exitCode=1;

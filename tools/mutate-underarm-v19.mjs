// V19 proof ledger: exact 1,000,000 deterministic parameter falsifications, plus
// 12 *real* isosurface re-extractions of the actual Teddy archetype. No mock pixels.
import {validReliefWidth,ARM_RELIEF_V19,underarmCutters,reliefProbe,roundedSlotDistance} from '../web/teddy/underarm-relief-v19.js';
import {TeddyRenderer} from '../web/teddy/render.js';
import {installCinematicV11} from '../web/teddy/cinematic-v11.js';
import {installTeddyRefinement} from '../web/teddy/refinement-v7.js';
import {installMovementEngine} from '../web/teddy/movement-v8.js';
import {installCanvasMotionV13} from '../web/teddy/canvas-motion-v13.js';
import {furPrimitive,skinField,meshTopology,extractImplicitMesh} from '../web/teddy/implicit-skin-v16.js';
const N=1_000_000;let killed=0,accepted=0,survivors=0,checksum=2166136261,slotChecks=0;
for(let i=0;i<N;i++){
  const seed=Math.imul((i^0x54454459)>>>0,0x9e3779b1)>>>0;
  const good=(i&1)===0;
  const candidate=good ? (.056+((seed&65535)/65535)*.051) :
    ((i%3)===1?NaN:(i%3)===0?-.7:.2);
  const valid=validReliefWidth(candidate);
  if(valid!==good)survivors++;
  if(valid){
    accepted++;
    const width=candidate,y=(seed>>>12)/65535-.5;
    const slot={x:.43,top:.22,bottom:-.72,z:0,halfWidth:width,halfDepth:.85,rounding:.018};
    if(roundedSlotDistance([slot.x,-.2,y*.3],slot)>=0)survivors++;
    slotChecks++;
  }else killed++;
  checksum=Math.imul(checksum^(seed+(valid?1:3)),16777619)>>>0;
}
installCinematicV11();installTeddyRefinement();installMovementEngine();installCanvasMotionV13();
globalThis.innerWidth=900;globalThis.innerHeight=700;globalThis.document={documentElement:{style:{setProperty(){}}}};
const r=new TeddyRenderer({width:900,height:700,getContext:t=>t==='2d'?{}:null},
  {persona:{warmth:.5,wit:.5,irritability:.5},appearance:{fur:'#8a5a3b',muzzle:'#d1a173',eyes:'#17100d',background:'#0b0c10',exposure:1.1,furEnabled:true},render:{targetFps:60,maxPixelRatio:1}});
const groups=r.groupMatrices(0,r.pose);
const parts=r.model.parts.filter(p=>p.material==='fur')
  .map(p=>furPrimitive(p,r.partTransform(p,groups,0,r.pose))).filter(Boolean);
let meshes=0,minVertices=Infinity,maxVertices=0;
for(let n=0;n<12;n++){
  const width=.056+n*.0043;
  const slots=underarmCutters(parts,{halfWidth:width});
  const probe=reliefProbe(slots,p=>skinField(p,parts,.12,slots));
  if(!probe.pass)throw Error('V19 underarm mutant has closed gap: '+JSON.stringify({width,probe}));
  const geometry=extractImplicitMesh(parts,{halfWidth:width});
  const t=meshTopology(geometry);
  if(!t.closed||t.components!==1||t.openEdges!==0||t.nonmanifoldEdges!==0)
    throw Error('V19 topology mutant violates watertightness: '+JSON.stringify({width,t}));
  meshes++;minVertices=Math.min(minVertices,t.vertices);maxVertices=Math.max(maxVertices,t.vertices);
}
const receipt={version:19,candidates:N,seed:'0x54454459',accepted,killed,survivors,
  individualSlotChecks:slotChecks,actualTeddyMeshExtractions:meshes,minVertices,maxVertices,
  checksum:checksum.toString(16).padStart(8,'0'),
  caveat:'1M scalar mutation checks and 12 real Teddy topologies; not 1M screenshot or pose samples'};
console.log('TEDDY_V19_UNDERARM_MUTATION_RECEIPT',JSON.stringify(receipt));
if(survivors!==0||accepted!==500000||killed!==500000||meshes!==12)process.exitCode=1;

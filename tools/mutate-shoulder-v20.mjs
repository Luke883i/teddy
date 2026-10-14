// V20 reproducible *numeric* shoulder-collar metamorphic test, 1M values.
// Separately tests the real Teddy mesh and animation in skin-seam-v20.test.mjs.
import {shoulderBand,constrainShoulderStretch,seamStretch} from '../web/teddy/skin-seam-v20.js';
const shoulderL=new Float32Array(16),shoulderR=new Float32Array(16);
shoulderL[12]=-.57;shoulderR[12]=.57;shoulderL[13]=shoulderR[13]=.41;
let checksum=2166136261,valid=0,outside=0,failures=0,maxMirror=0,maxStep=0;
const N=1000000;
for(let i=0;i<N;i++){
  const h=Math.imul((i^0x54454459)>>>0,0x9e3779b1)>>>0;
  const x=-1.1+(h&1023)/1023*2.2,
    y=-.65+((h>>>10)&1023)/1023*1.85,
    z=-.80+((h>>>20)&1023)/1023*1.6;
  const left=shoulderBand([x,y,z],shoulderL);
  const mirrored=shoulderBand([-x,y,z],shoulderR);
  const next=shoulderBand([x+.0001,y,z],shoulderL);
  if(!Number.isFinite(left)||left<0||left>1||Math.abs(left-mirrored)>1e-9)failures++;
  if(Math.abs(next-left)>.002)failures++;
  maxMirror=Math.max(maxMirror,Math.abs(left-mirrored));
  maxStep=Math.max(maxStep,Math.abs(next-left));
  if(left>.00001)valid++;else outside++;
  checksum=Math.imul(checksum^(h+(left*1e6|0)),16777619)>>>0;
}
const distorted=new Float32Array([0,0,0,3,0,0,0,.20,0,3,.20,0]);
const graph=[{a:0,b:1,rest:1,band:1},{a:2,b:3,rest:1,band:1}];
const before=seamStretch(distorted,graph),correction=constrainShoulderStretch(distorted,graph,{passes:10,maxStep:.09}),after=seamStretch(distorted,graph);
if(after.maxStretch>=before.maxStretch)failures++;
const receipt={version:20,seed:'0x54454459',numericMutations:N,inside:valid,outside,mirrorMaxError:maxMirror,
 maxAdjacentStep:maxStep,contraction:{before:before.maxStretch,after:after.maxStretch,correction},
 failures,checksum:checksum.toString(16).padStart(8,'0'),
 caveat:'One million scalar continuous-collar probes and a synthetic stretch falsifier. Real poses and actual indexed meshes are separately tested; not 1M visually approved frames.'};
console.log('TEDDY_V20_SEAM_MUTATION_RECEIPT',JSON.stringify(receipt));
if(failures!==0||valid<10000||outside<10000)process.exitCode=1;

// V22 1,000,000 seeded *semantic shading-space* probes (not a million renders).
// Independent real-head mesh and browser proofs live in facial-volume-v22.test.mjs.
import {facePigmentWeight,FACIAL_VOLUME_V22} from '../web/teddy/facial-volume-v22.js';
const N=1_000_000;
let failures=0,active=0,masked=0,largestStep=0,largestMirror=0,checksum=2166136261;
for(let i=0;i<N;i++){
  const h=Math.imul((i^0x4d555a5a)>>>0,0x9e3779b1)>>>0;
  const x=(((h>>>2)&1023)/1023-.5)*1.20;
  const y=-.65+((h>>>12)&1023)/1023*.90;
  const z=.10+((h>>>22)&1023)/1023*.82;
  const w=facePigmentWeight([x,y,z]),mirror=facePigmentWeight([-x,y,z]),
    next=facePigmentWeight([x+.0001,y,z]);
  const dm=Math.abs(mirror-w),step=Math.abs(next-w);
  if(!Number.isFinite(w)||w<0||w>1||dm>1e-9||step>.004)failures++;
  if(w>.02)active++;else masked++;
  largestStep=Math.max(largestStep,step);largestMirror=Math.max(largestMirror,dm);
  checksum=Math.imul(checksum^(h+(Math.round(w*65535)>>>0)),16777619)>>>0;
}
const ledger={version:22,candidates:N,seed:'0x4d555a5a',
  insideFacialPigment:active,outside:masked,failures,
  maxSymmetryError:largestMirror,maxLocalGradientStep:largestStep,
  checksum:checksum.toString(16).padStart(8,'0'),
  epistemicLimit:'1M analytic material-coordinate probes; full 3D pelt/pose and Chromium screenshot tests are separate'};
console.log('TEDDY_V22_FACIAL_PROFILE_MUTATION_RECEIPT',JSON.stringify(ledger));
if(failures||active<10000||masked<10000)process.exitCode=1;

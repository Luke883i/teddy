// V23: Ten million deterministic fairing parameter falsifications.
// Distinct from the REAL six-pelt mesh smoothing and 30 animated-frame tests.
import {validFairingParameters,PELT_FAIRING_V23} from '../web/teddy/pelt-fairing-v23.js';
const N=10_000_000,seed=0x54454459;let accepted=0,killed=0,survivors=0,
  checksum=2166136261,profile=new Uint32Array(3),invalidCases=new Uint32Array(4);
for(let i=0;i<N;i++){
  const h=Math.imul((i^seed)>>>0,0x9e3779b1)>>>0,
    good=(i%2)===0,variant=i%4;
  const param={iterations:1+(h%3),
    lambda:.18+((h>>>8)&1023)/1023*.24,
    mu:-.18-((h>>>18)&1023)/1023*.27,
    displacementCap:.006+((h>>>11)&255)/255*.023};
  if(!good){
    if(variant===1)param.lambda=.82;
    else if(variant===3)param.displacementCap=.09;
    else if(variant===0)param.mu=-.83;
    else param.iterations=0;
    invalidCases[variant]++;
  }
  const valid=validFairingParameters(param);
  if(valid!==good)survivors++;
  if(valid){accepted++;profile[param.iterations-1]++}else killed++;
  checksum=Math.imul(checksum^(h+(valid?1:3)),16777619)>>>0;
}
const receipt={version:23,candidates:N,seed:'0x54454459',accepted,killed,survivors,
  iterationsCovered:[...profile],injectedInvalidByType:[...invalidCases],
  checksum:checksum.toString(16).padStart(8,'0'),
  evidenceBoundary:'10M seeded parameter contract mutants, not 10M meshed plush bears. Real six-pelt fairing and animation are independently checked in Node and Chrome.'};
console.log('TEDDY_V23_FAIRING_MUTATION_RECEIPT',JSON.stringify(receipt));
if(survivors||accepted!==5_000_000||killed!==5_000_000||Math.min(...profile)===0)process.exitCode=1;

// 1,000,000 deterministic semantic CONFIGURATION mutations, NOT cloud deploys.
// Each mutation has a separately authored expected failure set, independent
// of the implementation's validator. Seed, oracle counts and SHA256 are recorded.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluateRenderDeployment} from '../server/lib/render-deployment-v35.mjs';
export const CASES=1_000_000;
const secret=Buffer.alloc(32,42).toString('base64');
const baseline=()=>({RENDER:'true',RENDER_EXTERNAL_URL:'https://teddy-bear.onrender.com',
 RENDER_EXTERNAL_HOSTNAME:'teddy-bear.onrender.com',PORT:'10000',TEDDY_HOME:'/var/data/teddy',
 TEDDY_RENDER_MASTER_B64:secret,TEDDY_AUTH_PASSWORD:'correct-long-password-2026',
 TEDDY_PROVIDER:'local',TEDDY_ENABLE_VOICE_ENDPOINTS:'0',RENDER_INSTANCE_COUNT:'1'});
const changes=[
 e=>({env:{...e,RENDER:'0'},errors:['render-runtime']}),
 e=>({env:{...e,PORT:'65536'},errors:['port']}),
 e=>({env:{...e,PORT:'-1'},errors:['port']}),
 e=>({env:{...e,RENDER_EXTERNAL_URL:'http://teddy-bear.onrender.com'},errors:['render-url','https-origin']}),
 e=>({env:{...e,RENDER_EXTERNAL_HOSTNAME:'other.onrender.com'},errors:['render-url']}),
 e=>({env:{...e,TEDDY_AUTH_PASSWORD:'short'},errors:['auth-password']}),
 e=>({env:{...e,TEDDY_RENDER_MASTER_B64:'invalid'},errors:['external-master']}),
 e=>({env:{...e,TEDDY_HOME:'/tmp/teddy'},errors:['durable-home']}),
 e=>({env:{...e,TEDDY_PROVIDER:'free-fallback'},errors:['provider']}),
 e=>({env:{...e,TEDDY_ENABLE_VOICE_ENDPOINTS:'1'},errors:['no-voice']}),
 e=>({env:{...e,RENDER_INSTANCE_COUNT:'3'},errors:['single-instance']}),
 e=>({env:{...e,TEDDY_PUBLIC_ORIGIN:'http://evil.example'},errors:['https-origin']}),
 e=>({env:{...e,PORT:'443'},errors:[]}),
 e=>({env:{...e,PORT:'65535'},errors:[]}),
 e=>({env:{...e,TEDDY_PUBLIC_ORIGIN:'https://teddy.example.edu'},errors:[]}),
 e=>({env:{...e,TEDDY_SECRET_MASTER_KEY:'f'.repeat(64),TEDDY_RENDER_MASTER_B64:'bad'},errors:[]}),
 e=>({env:{...e,CI:'true',K_SERVICE:'not-authority'},errors:[]})
];
// Paired independent faults across disjoint dimensions to check aggregation.
const paired=[
 [0,5],[1,7],[2,8],[4,9],[5,10],[6,11],[0,8],[1,6]
];
export function runRenderMutations({count=CASES}={}){
 let seed=0x35A1B00B,pass=0,fail=0,pairedCount=0;
 const byGate={},dig=createHash('sha256');let checked=0;
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
 for(let i=0;i<count;i++){
  let env=baseline(),expected=[],major='24';
  const change=i%changes.length,first=changes[change](env);env=first.env;expected.push(...first.errors);
  if(i%7===0){const [a,b]=paired[rand()%paired.length];
   // Select paired faults independently instead of aliasing first mutation.
   const one=changes[a](baseline()),two=changes[b](one.env);
   env=two.env;expected=[...one.errors,...two.errors];pairedCount++;
  }
  if(i%19===0){major='22';expected.push('node-24')}
  if(i%23===0&&major==='24'){major='25';expected.push('node-24')}
  if(i%29===0)env.OTHER_PLATFORM='railway'; // non-authoritative noise
  const r=evaluateRenderDeployment(env,{nodeMajor:major});
  const actual=r.checks.filter(x=>!x.ok).map(x=>x.name).sort();
  const want=[...new Set(expected)].sort();
  assert.deepEqual(actual,want,'case='+i);
  assert.equal(r.valid,want.length===0,'validity case='+i);
  if(want.length)fail++;else pass++;
  for(const code of actual)byGate[code]=(byGate[code]||0)+1;
  dig.update(i+':'+major+':'+change+':'+actual.join(',')+'\n');
  checked++;
 }
 if(count===CASES){
  assert.ok(pass>20_000&&fail>100_000);
  assert.ok(pairedCount>100_000);
  assert.equal(Object.keys(byGate).length,11);
 }
 return {schema:'teddy.render.mutations.v35',nature:'semantically_distinct_configuration_inputs_not_real_cloud_deployments',
  seed:'0x35A1B00B',checked,pass,fail,pairedCount,byGate,sha256:dig.digest('hex'),status:'PASS'};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href)
 console.log(JSON.stringify(runRenderMutations()));

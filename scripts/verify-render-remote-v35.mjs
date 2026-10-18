// Post-deployment remote proof adapted from Lumen. No cloud deployment is performed here.
// Usage: TEDDY_AUTH_PASSWORD=... EXPECTED_SHA=<git SHA> node scripts/verify-render-remote-v35.mjs https://teddy-bear.onrender.com
const origin=process.argv[2],sha=process.env.EXPECTED_SHA,password=process.env.TEDDY_AUTH_PASSWORD||'';
if(!origin||!/^https:\/\/[a-z0-9.-]+$/i.test(origin)||!sha||!/^[0-9a-f]{40}$/i.test(sha)||password.length<16)
 throw Error('usage: EXPECTED_SHA 40hex + TEDDY_AUTH_PASSWORD + https origin');
const report={schema:'teddy.render.remote.v35',origin,checks:[],status:'FAIL'};
const add=(name,ok,detail)=>report.checks.push({name,status:ok?'PASS':'FAIL',detail});
async function get(route,{authenticated=true}={}){
 const headers=authenticated?{authorization:'Basic '+Buffer.from('teddy:'+password).toString('base64')}:{};
 const r=await fetch(origin+route,{headers,redirect:'error',signal:AbortSignal.timeout(7000)});
 return {status:r.status,payload:await r.json()};
}
try{
 const health=await get('/api/health',{authenticated:false});
 add('liveness',health.status===200&&health.payload?.service==='teddy'&&health.payload?.liveness==='up','Node HTTP healthy (not GGUF ready)');
 const version=await get('/api/version');
 add('revision',version.status===200&&version.payload?.revision===sha,'deployed revision matches requested commit');
 const ready=await get('/api/ready');
 add('model-readiness',ready.status===200||ready.status===503,'model status is explicitly distinguishable from liveness');
 const auth=await get('/api/version',{authenticated:false});
 add('authentication',auth.status===401,'public version requires authentication');
 if(process.env.REQUIRE_MODEL_READY==='1')add('model-actually-ready',ready.status===200,'GGUF (or configured provider) must be ready');
}catch(e){add('network',false,e?.code||e?.name||'network_error')}
report.status=report.checks.every(x=>x.status==='PASS')?'PASS':'FAIL';
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;

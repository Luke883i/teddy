import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateRenderDeployment,resolveRenderEnvironment} from '../server/lib/render-deployment-v35.mjs';
import {deploymentPolicy,guardRequest} from '../server/lib/security.mjs';
import {validExternalMasterKey} from '../server/lib/secrets.mjs';
const base=()=>({RENDER:'true',RENDER_EXTERNAL_URL:'https://teddy-bear.onrender.com',
 RENDER_EXTERNAL_HOSTNAME:'teddy-bear.onrender.com',PORT:'10000',
 TEDDY_HOME:'/var/data/teddy',TEDDY_RENDER_MASTER_B64:Buffer.alloc(32,42).toString('base64'),
 TEDDY_AUTH_PASSWORD:'strong-private-password-456',TEDDY_PROVIDER:'local',TEDDY_ENABLE_VOICE_ENDPOINTS:'0'});
test('Render generated secret is recognized without storing or logging it',()=>{
 const env=base(),report=evaluateRenderDeployment(env,{nodeMajor:24});
 assert.equal(report.valid,true,JSON.stringify(report));assert.equal(JSON.stringify(report).includes(env.TEDDY_AUTH_PASSWORD),false);
 assert.equal(JSON.stringify(report).includes(env.TEDDY_RENDER_MASTER_B64),false);
 const resolved=resolveRenderEnvironment(env,{nodeMajor:24});
 assert.equal(resolved.TEDDY_HOST,'0.0.0.0');assert.equal(resolved.TEDDY_PORT,'10000');
 assert.equal(resolved.TEDDY_HOME,'/var/data/teddy');assert.equal(resolved.TEDDY_PUBLIC_ORIGIN,env.RENDER_EXTERNAL_URL);
 assert.equal(resolved.TEDDY_PROVIDER,'local');assert.equal(resolved.TEDDY_ENABLE_VOICE_ENDPOINTS,'0');
 assert.equal(validExternalMasterKey(resolved.TEDDY_SECRET_MASTER_KEY),true);
 assert.equal(deploymentPolicy({listenHost:resolved.TEDDY_HOST,publicOrigin:resolved.TEDDY_PUBLIC_ORIGIN,
  authPassword:env.TEDDY_AUTH_PASSWORD,secretMasterKey:resolved.TEDDY_SECRET_MASTER_KEY}).ok,true);
});
test('Render HTTP host policy blocks attacker origins, enforces basic auth and keeps health public',()=>{
 const v=resolveRenderEnvironment(base(),{nodeMajor:24});
 const args={listenHost:v.TEDDY_HOST,publicOrigin:v.TEDDY_PUBLIC_ORIGIN,authPassword:base().TEDDY_AUTH_PASSWORD};
 const mock=(host,url,authorization,origin)=>({headers:{host,authorization,...(origin?{origin}:{})},url,method:'POST',socket:{}});
 assert.equal(guardRequest(mock('evil.tld','/api/text/turn',''),args).status,421);
 assert.equal(guardRequest(mock('teddy-bear.onrender.com','/api/text/turn',''),args).status,401);
 const basic='Basic '+Buffer.from('teddy:'+base().TEDDY_AUTH_PASSWORD).toString('base64');
 assert.equal(guardRequest(mock('teddy-bear.onrender.com','/api/text/turn',basic,'https://evil.tld'),args).status,403);
 assert.equal(guardRequest(mock('teddy-bear.onrender.com','/api/text/turn',basic,'https://teddy-bear.onrender.com'),args).ok,true);
 assert.equal(guardRequest({headers:{host:'teddy-bear.onrender.com'},url:'/api/health',method:'GET'},args).ok,true);
});
test('preflight rejects missing master or password and forged Render marker',()=>{
 for(const [field,value] of [['TEDDY_AUTH_PASSWORD','short'],['TEDDY_RENDER_MASTER_B64','broken'],['RENDER','false'],['TEDDY_HOME','/tmp/teddy'],['TEDDY_PROVIDER','unknown'],['PORT','0'],['TEDDY_ENABLE_VOICE_ENDPOINTS','1']]){
  const env={...base(),[field]:value};assert.equal(evaluateRenderDeployment(env,{nodeMajor:'24'}).valid,false,field);
  assert.throws(()=>resolveRenderEnvironment(env,{nodeMajor:'24'}),/TEDDY_RENDER_PREFLIGHT_FAILED/);
 }
});
test('production explicit secret overrides generated secret, never silently downgrades',()=>{
 const env={...base(),TEDDY_RENDER_MASTER_B64:'invalid',TEDDY_SECRET_MASTER_KEY:'f'.repeat(64)};
 assert.equal(evaluateRenderDeployment(env,{nodeMajor:'24'}).valid,true);
 assert.equal(resolveRenderEnvironment(env,{nodeMajor:'24'}).TEDDY_SECRET_MASTER_KEY,'f'.repeat(64));
});
test('probe environment never makes evidence of model readiness or disk durability',()=>{
 const r=evaluateRenderDeployment(base(),{nodeMajor:'24'});
 assert.equal(r.mode,'single_instance_persistent');
 assert.equal(r.readyMeaning,'separate_from_http_liveness');
 assert.equal(Object.hasOwn(r,'actualModelReady'),false);
});

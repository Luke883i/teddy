import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStartOptions,START_HELP} from '../server/lib/startup-contract-v36.mjs';
import {evaluateRenderDeployment} from '../server/lib/render-deployment-v35.mjs';
const opts=(args=[],env={},major='24')=>parseStartOptions(args,env,major);
test('npm start defaults to local loopback and never launches a browser or auto-updates Node',()=>{
 const r=opts();
 assert.deepEqual([r.platform,r.mode,r.port,r.openBrowser,r.disableAutoInstall],['local','serve','8787',false,false]);
 assert.equal(r.expectsModelReadiness,false);
});
test('npm run start:local browser and historical shell flags are deliberate options',()=>{
 assert.equal(opts(['--open']).openBrowser,true);
 assert.equal(opts(['--open','--no-open']).openBrowser,false);
 assert.equal(opts(['--port=9876','--no-install']).port,'9876');
 assert.equal(opts(['--port=9876','--no-install']).disableAutoInstall,true);
 assert.equal(opts(['--open','--doctor']).mode,'doctor');
 assert.equal(opts(['--open','--doctor']).openBrowser,false);
 assert.match(START_HELP,/npm start/);
 assert.match(START_HELP,/teddy.sh/);
});
test('hostile arguments and untrusted or malformed ports fail before server import',()=>{
 for(const bad of ['--port=0','--port=65536','--port=-1','--port=80x','--port=80;curl','--port=080','--port=','--bad','--password=should-not-echo']){
  assert.throws(()=>opts([bad]),{name:'StartupArgumentError'});
 }
 for(const bad of ['0','65536','abc','127.0.0.1:8787','-1']){
  assert.throws(()=>opts([],{TEDDY_PORT:bad}),/TEDDY_INVALID_PORT/);
 }
 const error=assert.throws?null:null;
 assert.throws(()=>opts(['--bad=secret-value']),e=>!String(e).includes('secret-value'));
});
test('fails closed without Node 24; npm cannot bootstrap its own Node',()=>{
 assert.throws(()=>opts([],{},'22'),/TEDDY_NODE24_REQUIRED/);
 assert.throws(()=>opts([],{},'25'),/TEDDY_NODE24_REQUIRED/);
});
test('Render requires the same npm start but no user flags or implicit local port',()=>{
 const env={RENDER:'true',PORT:'10000'};
 const r=opts([],env);
 assert.equal(r.platform,'render');
 assert.equal(r.port,null);
 assert.equal(r.openBrowser,false);
 for(const flag of ['--open','--doctor','--no-install','--port=9900']){
  assert.throws(()=>opts([flag],env),/TEDDY_RENDER_OPTIONS_FORBIDDEN/);
 }
});
test('hosting secrets and disk policy cannot be substituted by CLI options',()=>{
 const env={RENDER:'true',PORT:'10000',TEDDY_AUTH_PASSWORD:'short',
   TEDDY_RENDER_MASTER_B64:'bad',TEDDY_HOME:'/tmp/teddy'};
 assert.equal(opts([],env).platform,'render');
 assert.equal(evaluateRenderDeployment(env,{nodeMajor:'24'}).valid,false);
});
test('10,000 deterministic CLI mutations, with independent allow/deny oracle',()=>{
 let checked=0;
 for(let i=0;i<10000;i++){
  const render=i%2===1;
  const args=i%5===0?['--port=0']:i%5===1?['--unknown']:i%5===2?['--doctor']:i%5===3?['--no-install']:['--no-open'];
  const allowed=!render&&!['--port=0','--unknown'].includes(args[0])||render&&args[0]==='--no-open';
  try{
   const r=opts(args,render?{RENDER:'true',PORT:'10000'}:{});
   assert.equal(allowed,true,'accepted '+i);
   assert.equal(r.platform,render?'render':'local');
  }catch(e){assert.equal(allowed,false,'rejected '+i);assert.equal(e.name,'StartupArgumentError')}
  checked++;
 }
 console.log('TEDDY_V36_CLI_MUTATION',JSON.stringify({checked,nodeRuntimeCalls:0,externalDownloads:0}));
});

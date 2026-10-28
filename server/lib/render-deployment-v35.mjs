// v35 - LUMEN-inspired, narrow Render adapter. Pure, no filesystem or network.
// Render markers are routing hints, NOT authentication or evidence of data durability.
import {validExternalMasterKey} from './secrets.mjs';
const PORT=/^(?:[1-9][0-9]{0,4})$/;
const ORIGIN=/^https:\/\/[a-z0-9.-]+(?::443)?$/i;
const HOST=/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i;
const p64=x=>typeof x==='string'&&/^[A-Za-z0-9+/]{43}=$/.test(x)&&
  Buffer.from(x,'base64').length===32&&Buffer.from(x,'base64').toString('base64')===x;
const inside=(p)=>p==='/var/data/teddy'; // Render disk only: avoid accidental ephemeral state.
export function evaluateRenderDeployment(env={},opts={}){
 const checks=[],add=(name,ok)=>checks.push({name,ok:Boolean(ok)});
 const nodeMajor=String(opts.nodeMajor??process.versions.node.split('.')[0]);
 const isRender=env.RENDER==='true';
 const url=String(env.RENDER_EXTERNAL_URL||'');
 const host=String(env.RENDER_EXTERNAL_HOSTNAME||'').toLowerCase();
 const renderUrlValid=ORIGIN.test(url)&&HOST.test(host)&&host.endsWith('.onrender.com')&&
  url.toLowerCase()==='https://'+host;
 const custom=env.TEDDY_PUBLIC_ORIGIN;
 const publicOrigin=custom||url;
 const safeOrigin=typeof publicOrigin==='string'&&ORIGIN.test(publicOrigin);
 const provider=env.TEDDY_PROVIDER||'local';
 const port=String(env.PORT||'10000');
 const masterExplicit=String(env.TEDDY_SECRET_MASTER_KEY||'');
 const masterGenerated=String(env.TEDDY_RENDER_MASTER_B64||'');
 const masterKey=masterExplicit||(p64(masterGenerated)?'base64:'+masterGenerated:'');
 add('render-runtime',isRender);
 add('node-24',nodeMajor==='24');
 add('render-url',renderUrlValid);
 add('https-origin',safeOrigin);
 add('port',PORT.test(port)&&Number(port)<=65535);
 add('auth-password',typeof env.TEDDY_AUTH_PASSWORD==='string'&&env.TEDDY_AUTH_PASSWORD.length>=16&&!/[\r\n]/.test(env.TEDDY_AUTH_PASSWORD));
 add('external-master',validExternalMasterKey(masterKey));
 add('durable-home',inside(env.TEDDY_HOME||'/var/data/teddy'));
 add('provider',['local','openai','vireonix'].includes(provider));
 add('no-voice',env.TEDDY_ENABLE_VOICE_ENDPOINTS!=='1');
 add('single-instance',!env.RENDER_INSTANCE_COUNT||env.RENDER_INSTANCE_COUNT==='1');
 const result={schema:'teddy.render.v35',valid:checks.every(x=>x.ok),checks,
  mode:'single_instance_persistent',provider,readyMeaning:'separate_from_http_liveness'};
 // No password, master bytes, key suffix or other user data in result.
 return result;
}
export function resolveRenderEnvironment(env=process.env,opts={}){
 const result=evaluateRenderDeployment(env,opts);
 if(!result.valid){
  const error=new Error('TEDDY_RENDER_PREFLIGHT_FAILED:'+result.checks.filter(x=>!x.ok).map(x=>x.name).join(','));
  error.code='TEDDY_RENDER_PREFLIGHT_FAILED';throw error;
 }
 const port=String(env.PORT||'10000');
 return Object.freeze({
  TEDDY_HOST:'0.0.0.0',TEDDY_PORT:port,
  TEDDY_HOME:'/var/data/teddy',
  TEDDY_PUBLIC_ORIGIN:env.TEDDY_PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL,
  TEDDY_SECRET_MASTER_KEY:env.TEDDY_SECRET_MASTER_KEY||'base64:'+env.TEDDY_RENDER_MASTER_B64,
  TEDDY_TEXT_ONLY:'1',TEDDY_RUNTIME_AUTOINSTALL:env.TEDDY_RUNTIME_AUTOINSTALL==='0'?'0':'1',
  TEDDY_ENABLE_VOICE_ENDPOINTS:'0',TEDDY_RENDER_HEALTH_PROBE:'1',TEDDY_PROVIDER:env.TEDDY_PROVIDER||'local'
 });
}

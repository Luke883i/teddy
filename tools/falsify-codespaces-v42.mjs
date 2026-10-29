// 100,000 executed deterministic security-boundary mutations, no LLM calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {guardRequest} from '../server/lib/security.mjs';
const families=['valid_proxy','wrong_token','wrong_codespace','wrong_port','wrong_scheme','wrong_suffix','wrong_origin_port','cross_site','wrong_host','navigation'];
let state=0x290a2026;const rnd=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
const histogram=Object.fromEntries(families.map(k=>[k,0])),failures=[];
const traces=crypto.createHash('sha256');
for(let i=0;i<100000;i++){
 const family=families[i%families.length];
 const port=10000+(rnd()%35000),codespace='workspace-'+rnd().toString(36),token='token-'+rnd().toString(36)+'-this-is-only-a-test-secret';
 const normal='https://'+codespace+'-'+port+'.app.github.dev';
 const headers={host:'127.0.0.1:'+port,origin:normal,
  'sec-fetch-site':'same-origin','sec-fetch-mode':'cors','sec-fetch-dest':'empty','x-teddy-csrf':token};
 if(family==='wrong_token')headers['x-teddy-csrf']='mismatch';
 if(family==='wrong_codespace')headers.origin='https://another-workspace-'+port+'.app.github.dev';
 if(family==='wrong_port')headers.origin='https://'+codespace+'-'+(port+1)+'.app.github.dev';
 if(family==='wrong_scheme')headers.origin='http://'+codespace+'-'+port+'.app.github.dev';
 if(family==='wrong_suffix')headers.origin=normal+'.evil.example';
 if(family==='wrong_origin_port')headers.origin=normal+':444';
 if(family==='cross_site')headers['sec-fetch-site']='cross-site';
 if(family==='wrong_host')headers.host='attacker.example:'+port;
 if(family==='navigation')headers['sec-fetch-mode']='navigate';
 const result=guardRequest({method:i%2?'PUT':'POST',url:i%2?'/api/provider':'/api/text/turn',headers,socket:{encrypted:false}},
  {listenHost:'127.0.0.1',listenPort:port,codespaceName:codespace,csrfToken:token});
 histogram[family]++;
 const expected=family==='valid_proxy';
 if(Boolean(result.ok)!==expected&&failures.length<10)failures.push({i,family,result});
 if((i&1023)===0)traces.update([i,family,port,codespace,result.status||200].join(':'));
}
assert.equal(Object.values(histogram).reduce((a,b)=>a+b,0),100000);
assert.equal(failures.length,0,JSON.stringify(failures));
console.log('TEDDY_CODESPACES_V42_MUTATION',JSON.stringify({seed:'0x290a2026',cases:100000,
 executedRealGuard:true,families:histogram,criticalSurvivors:failures.length,
 sha256:traces.digest('hex'),mode:'contract_mutations_not_real_browser_sessions'}));

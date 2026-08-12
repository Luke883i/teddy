import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { deploymentPolicy } from './lib/security.mjs';
import { validExternalMasterKey } from './lib/secrets.mjs';

const home=process.env.TEDDY_HOME||path.join(process.env.HOME||process.cwd(),'.teddy'),host=process.env.TEDDY_HOST||'127.0.0.1';
const policy=deploymentPolicy({listenHost:host,publicOrigin:process.env.TEDDY_PUBLIC_ORIGIN||'',authPassword:process.env.TEDDY_AUTH_PASSWORD||'',secretMasterKey:process.env.TEDDY_SECRET_MASTER_KEY||''});
const homeMode=()=>{try{fs.mkdirSync(home,{recursive:true,mode:0o700});fs.chmodSync(home,0o700);const m=fs.statSync(home).mode&0o777;return (m&0o077)===0}catch{return false}};
const dbCheck=()=>{try{const file=path.join(home,'data','teddy.sqlite');if(!fs.existsSync(file)){const d=new DatabaseSync(':memory:');const ok=d.prepare('PRAGMA quick_check').get().quick_check==='ok';d.close();return ok}const d=new DatabaseSync(file,{readOnly:true});const ok=d.prepare('PRAGMA quick_check').get().quick_check==='ok';d.close();return ok}catch{return false}};
const checks=[
  ['node 24.x',Number(process.versions.node.split('.')[0])===24],
  ['fetch/FormData',typeof fetch==='function'&&typeof FormData==='function'],
  ['AbortSignal.timeout',typeof AbortSignal.timeout==='function'],
  ['home private+writable',(()=>{try{fs.mkdirSync(home,{recursive:true});fs.accessSync(home,fs.constants.W_OK);return homeMode()}catch{return false}})()],
  ['sqlite quick_check',dbCheck()],
  ['webcrypto',!!globalThis.crypto],
  ['deployment policy',policy.ok],
  ['external master when remote',policy.mode==='loopback'||validExternalMasterKey(process.env.TEDDY_SECRET_MASTER_KEY||'')]
];
for(const[name,ok]of checks)console.log(`${ok?'OK':'FAIL'}  ${name}`);if(policy.ok)console.log(`OK  security mode=${policy.mode}`);else console.log(`FAIL  ${policy.error}`);process.exit(checks.every(x=>x[1])?0:1);

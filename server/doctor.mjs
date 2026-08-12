import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const home=process.env.TEDDY_HOME||path.join(process.env.HOME||process.cwd(),'.teddy');
const checks=[
  ['node>=24',Number(process.versions.node.split('.')[0])>=24],
  ['fetch/FormData',typeof fetch==='function'&&typeof FormData==='function'],
  ['AbortSignal.timeout',typeof AbortSignal.timeout==='function'],
  ['home writable',(()=>{try{fs.mkdirSync(home,{recursive:true});fs.accessSync(home,fs.constants.W_OK);return true}catch{return false}})()],
  ['sqlite',(()=>{try{const d=new DatabaseSync(':memory:');d.exec('select 1');d.close();return true}catch{return false}})()],
  ['webcrypto',!!globalThis.crypto]
];
for(const[name,ok]of checks)console.log(`${ok?'OK':'FAIL'}  ${name}`);process.exit(checks.every(x=>x[1])?0:1);

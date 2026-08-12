import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const port=18791,home=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-sec-http-')),password='ci-security-password-strong',master='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',host='teddy.example.invalid';
const child=spawn(process.execPath,['server/main.mjs'],{cwd:process.cwd(),env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'0.0.0.0',TEDDY_PORT:String(port),TEDDY_PUBLIC_ORIGIN:'https://teddy.example.invalid',TEDDY_AUTH_PASSWORD:password,TEDDY_SECRET_MASTER_KEY:master},stdio:['ignore','pipe','pipe']});
const auth='Basic '+Buffer.from(`teddy:${password}`).toString('base64');
const request=({path='/',method='GET',headers={},body=''}={})=>new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path,method,headers:{Host:host,...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString()}))});r.on('error',reject);if(body)r.write(body);r.end()});
try{
  let healthy=false;for(let i=0;i<80;i++){try{const r=await request({path:'/api/health'});if(r.status===200){healthy=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}assert.equal(healthy,true);
  assert.equal((await request({path:'/api/bootstrap'})).status,401);
  const boot=await request({path:'/api/bootstrap',headers:{Authorization:auth}});assert.equal(boot.status,200);assert.match(boot.text,/authenticated-proxy/);
  assert.equal((await request({path:'/api/config',method:'PUT',headers:{Authorization:auth,Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await request({path:'/api/memories',method:'POST',headers:{Authorization:auth,Origin:'https://teddy.example.invalid','Content-Type':'text/plain'},body:'{}'})).status,415);
  assert.equal((await request({path:'/api/config',method:'PUT',headers:{Authorization:auth,Origin:'https://teddy.example.invalid','Content-Type':'application/json'},body:'{}'})).status,200);
  assert.equal(boot.headers['x-frame-options'],'DENY');
  console.log('security HTTP smoke OK');
}finally{child.kill('SIGTERM');await new Promise(r=>{child.once('exit',r);setTimeout(r,2000)});fs.rmSync(home,{recursive:true,force:true})}

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const password='proxy-password-for-route-regression-tests';
const auth='Basic '+Buffer.from('teddy:'+password).toString('base64');
const host='teddy-pr51.onrender.com';
const origin='https://'+host;
async function ephemeralPort(){const server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const port=server.address().port;await new Promise(ok=>server.close(ok));return port}
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
test('real Teddy HTTP: HTTPS proxy, authorized provider PUT, denial, SQLite survival', {timeout:25000},async()=>{
  const port=await ephemeralPort(),home=mkdtempSync(join(tmpdir(),'teddy-v38-http-'));
  let child=null,stderr='';
  function start(){
    child=spawn(process.execPath,['server/main.mjs'],{
      cwd:root,stdio:['ignore','ignore','pipe'],
      env:{...process.env,TEDDY_HOME:home,TEDDY_HOST:'0.0.0.0',TEDDY_PORT:String(port),
        TEDDY_PROVIDER:'vireonix',TEDDY_RUNTIME_AUTOINSTALL:'0',
        TEDDY_PUBLIC_ORIGIN:'https://teddy-bear.onrender.com',TEDDY_ALLOWED_HOSTS:host,
        TEDDY_AUTH_PASSWORD:password,TEDDY_SECRET_MASTER_KEY:'a'.repeat(64)}
    });
    child.stderr.on('data',chunk=>{stderr+=chunk.toString().slice(0,500)});
  }
  async function stop(){
    if(!child||child.exitCode!==null)return;
    const active=child;active.kill('SIGTERM');
    await Promise.race([new Promise(ok=>active.once('exit',ok)),sleep(2500)]);
    if(active.exitCode===null)active.kill('SIGKILL');
  }
  async function call(path,method='GET',{requestOrigin=origin,authorization=auth,site='same-origin',body}={}){
    const headers={host,authorization,origin:requestOrigin,'sec-fetch-site':site,...(body?{'content-type':'application/json'}:{})};
    return await new Promise((resolve,reject)=>{
      const request=http.request({hostname:'127.0.0.1',port,path,method,headers},response=>{
        let raw='';response.setEncoding('utf8');response.on('data',chunk=>raw+=chunk);
        response.once('end',()=>{try{resolve({status:response.statusCode,body:JSON.parse(raw)})}catch(error){reject(error)}});
      });
      request.once('error',reject);request.end(body?JSON.stringify(body):undefined);
    });
  }
  async function ready(){
    for(let i=0;i<160;i++){
      if(child.exitCode!==null)throw Error('Teddy exited: '+stderr);
      try{const response=await call('/api/bootstrap');if(response.status===200)return response.body}catch{}
      await sleep(40);
    }
    throw Error('Teddy did not start: '+stderr);
  }
  try{
    start();const original=await ready();assert.equal(original.ai.provider,'vireonix');
    const evil=await call('/api/provider','PUT',{requestOrigin:'https://evil.example',body:{provider:'openai'}});
    assert.equal(evil.status,403);assert.equal(evil.body.error,'origin_not_allowed');
    const noAuth=await call('/api/provider','PUT',{authorization:'',body:{provider:'openai'}});
    assert.equal(noAuth.status,401);
    const crossSite=await call('/api/provider','PUT',{site:'cross-site',body:{provider:'openai'}});
    assert.equal(crossSite.status,403);
    const wrong=await call('/api/provider','PUT',{body:{provider:'attacker'}});
    assert.equal(wrong.status,400);
    const accepted=await call('/api/provider','PUT',{body:{provider:'openai'}});
    assert.equal(accepted.status,200,JSON.stringify(accepted));assert.equal(accepted.body.ai.provider,'openai');
    const verify=await call('/api/bootstrap');assert.equal(verify.body.ai.provider,'openai');
    await stop();start();const recovered=await ready();assert.equal(recovered.ai.provider,'openai','provider choice must survive restart');
    const restore=await call('/api/provider','PUT',{body:{provider:'vireonix'}});assert.equal(restore.status,200);
  }finally{await stop();rmSync(home,{recursive:true,force:true})}
});

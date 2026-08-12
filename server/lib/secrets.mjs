import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export class SecretStore{
  constructor(home){this.dir=path.join(home,'secrets');this.masterPath=path.join(this.dir,'master.key');this.secretPath=path.join(this.dir,'openai.json');fs.mkdirSync(this.dir,{recursive:true,mode:0o700});try{fs.chmodSync(this.dir,0o700)}catch{}}
  #master(){if(!fs.existsSync(this.masterPath))fs.writeFileSync(this.masterPath,crypto.randomBytes(32),{mode:0o600,flag:'wx'});const key=fs.readFileSync(this.masterPath);if(key.length!==32)throw Error('secret_master_corrupt');try{fs.chmodSync(this.masterPath,0o600)}catch{}return key}
  saveOpenAI(key){if(typeof key!=='string'||key.length<20||key.length>1000||!key.startsWith('sk-'))throw Error('invalid_api_key');const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',this.#master(),iv),data=Buffer.concat([cipher.update(key,'utf8'),cipher.final()]),payload={v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64'),tail:key.slice(-4)},tmp=`${this.secretPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;fs.writeFileSync(tmp,JSON.stringify(payload),{mode:0o600,flag:'wx'});fs.renameSync(tmp,this.secretPath);try{fs.chmodSync(this.secretPath,0o600)}catch{}return{configured:true,tail:payload.tail}}
  getOpenAI(){if(!fs.existsSync(this.secretPath))return null;try{const p=JSON.parse(fs.readFileSync(this.secretPath,'utf8'));if(p.v!==1||!p.iv||!p.tag||!p.data)throw Error('format');const decipher=crypto.createDecipheriv('aes-256-gcm',this.#master(),Buffer.from(p.iv,'base64'));decipher.setAuthTag(Buffer.from(p.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(p.data,'base64')),decipher.final()]).toString('utf8')}catch{throw Error('openai_secret_corrupt')}}
  status(){if(!fs.existsSync(this.secretPath))return{configured:false,tail:null,corrupt:false};try{const p=JSON.parse(fs.readFileSync(this.secretPath,'utf8'));return{configured:p.v===1&&!!p.data,tail:p.tail||null,corrupt:false}}catch{return{configured:false,tail:null,corrupt:true}}}
  clearOpenAI(){try{fs.rmSync(this.secretPath)}catch(e){if(e.code!=='ENOENT')throw e}}
}

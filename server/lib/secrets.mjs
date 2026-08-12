import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const AAD=Buffer.from('teddy/openai/v2','utf8');
function decodeExternal(value){
  if(!value)return null;const text=String(value).trim();let key;
  if(/^[0-9a-f]{64}$/i.test(text))key=Buffer.from(text,'hex');
  else if(text.startsWith('base64:')){try{key=Buffer.from(text.slice(7),'base64')}catch{return null}}
  else return null;
  return key.length===32?key:null;
}
export function validExternalMasterKey(value){return !!decodeExternal(value)}
export class SecretStore{
  constructor(home,{externalMasterKey=process.env.TEDDY_SECRET_MASTER_KEY||''}={}){
    this.dir=path.join(home,'secrets');this.masterPath=path.join(this.dir,'master.key');this.secretPath=path.join(this.dir,'openai.json');this.external=decodeExternal(externalMasterKey);
    if(externalMasterKey&&!this.external)throw Error('external_secret_master_invalid');
    fs.mkdirSync(this.dir,{recursive:true,mode:0o700});try{fs.chmodSync(this.dir,0o700)}catch{}
  }
  protection(){return this.external?'external':'local-file'}
  #localMaster(){if(!fs.existsSync(this.masterPath))fs.writeFileSync(this.masterPath,crypto.randomBytes(32),{mode:0o600,flag:'wx'});const key=fs.readFileSync(this.masterPath);if(key.length!==32)throw Error('secret_master_corrupt');try{fs.chmodSync(this.masterPath,0o600)}catch{}return key}
  #master(){return this.external||this.#localMaster()}
  #encrypt(key){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',this.#master(),iv);cipher.setAAD(AAD);const data=Buffer.concat([cipher.update(key,'utf8'),cipher.final()]);return {v:2,alg:'A256GCM',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64'),tail:key.slice(-4)}}
  #decryptPayload(p,key){const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(p.iv,'base64'));if(p.v===2)decipher.setAAD(AAD);decipher.setAuthTag(Buffer.from(p.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(p.data,'base64')),decipher.final()]).toString('utf8')}
  #writePayload(payload){const tmp=`${this.secretPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;fs.writeFileSync(tmp,JSON.stringify(payload),{mode:0o600,flag:'wx'});fs.renameSync(tmp,this.secretPath);try{fs.chmodSync(this.secretPath,0o600)}catch{}}
  saveOpenAI(key){if(typeof key!=='string'||key.length<20||key.length>1000||!key.startsWith('sk-'))throw Error('invalid_api_key');const payload=this.#encrypt(key);this.#writePayload(payload);return {configured:true,tail:payload.tail,protection:this.protection()}}
  getOpenAI(){
    if(!fs.existsSync(this.secretPath))return null;
    try{
      const p=JSON.parse(fs.readFileSync(this.secretPath,'utf8'));if(![1,2].includes(p.v)||!p.iv||!p.tag||!p.data)throw Error('format');
      if(p.v===2)return this.#decryptPayload(p,this.#master());
      if(this.external&&fs.existsSync(this.masterPath)){
        const legacy=fs.readFileSync(this.masterPath);if(legacy.length===32){const plain=this.#decryptPayload(p,legacy);this.#writePayload(this.#encrypt(plain));return plain}
      }
      return this.#decryptPayload(p,this.#master());
    }catch{throw Error('openai_secret_corrupt')}
  }
  status(){if(!fs.existsSync(this.secretPath))return {configured:false,tail:null,corrupt:false,protection:this.protection()};try{const p=JSON.parse(fs.readFileSync(this.secretPath,'utf8'));return {configured:[1,2].includes(p.v)&&!!p.data,tail:p.tail||null,corrupt:false,protection:this.protection()}}catch{return {configured:false,tail:null,corrupt:true,protection:this.protection()}}}
  clearOpenAI(){try{fs.rmSync(this.secretPath)}catch(e){if(e.code!=='ENOENT')throw e}}
}

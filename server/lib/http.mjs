import fs from 'node:fs';
import path from 'node:path';
import { SECURITY_HEADERS } from './security.mjs';

const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
export function json(res,status,body,headers={}){const data=JSON.stringify(body);res.writeHead(status,{...SECURITY_HEADERS,'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data),'cache-control':'no-store',...headers});res.end(data)}
function httpError(status,publicCode){return Object.assign(new Error(publicCode),{status,publicCode})}
export function requireContentType(req,expected){
  const actual=String(req.headers['content-type']||'').split(';',1)[0].trim().toLowerCase();
  if(actual!==String(expected).toLowerCase())throw httpError(415,'unsupported_media_type');
}
export async function readBody(req,max=1_000_000){
  const encoding=String(req.headers['content-encoding']||'identity').trim().toLowerCase();
  if(encoding&&encoding!=='identity')throw httpError(415,'content_encoding_not_supported');
  const declared=req.headers['content-length'];
  if(declared!=null){const n=Number(declared);if(!Number.isSafeInteger(n)||n<0)throw httpError(400,'invalid_content_length');if(n>max)throw httpError(413,'body_too_large')}
  const chunks=[];let n=0;
  for await(const c of req){n+=c.length;if(n>max)throw httpError(413,'body_too_large');chunks.push(c)}
  return Buffer.concat(chunks,n);
}
export async function readJson(req,max=1_000_000){requireContentType(req,'application/json');const raw=(await readBody(req,max)).toString('utf8');if(!raw)return {};try{return JSON.parse(raw)}catch{throw httpError(400,'invalid_json')}}
export function serveStatic(root,req,res){
  const u=new URL(req.url,'http://localhost');let p;
  try{p=decodeURIComponent(u.pathname)}catch{return false}
  if(p==='/')p='/index.html';
  const base=fs.realpathSync(root),candidate=path.resolve(base,`.${p}`);
  if(!candidate.startsWith(base+path.sep)&&candidate!==path.resolve(base,'index.html'))return false;
  let abs;try{abs=fs.realpathSync(candidate)}catch{return false}
  if(!abs.startsWith(base+path.sep)&&abs!==path.resolve(base,'index.html'))return false;
  let st;try{st=fs.statSync(abs)}catch{return false}if(!st.isFile())return false;
  const data=fs.readFileSync(abs),ext=path.extname(abs);
  res.writeHead(200,{...SECURITY_HEADERS,'content-type':TYPES[ext]||'application/octet-stream','content-length':data.length,'cache-control':'no-cache, max-age=0, must-revalidate'});res.end(data);return true;
}

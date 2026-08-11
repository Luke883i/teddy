import fs from 'node:fs';
import path from 'node:path';
import { SECURITY_HEADERS } from './security.mjs';
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp' };
export function json(res,status,body){const data=JSON.stringify(body);res.writeHead(status,{...SECURITY_HEADERS,'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data),'cache-control':'no-store'});res.end(data)}
export async function readBody(req,max=1_000_000){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>max)throw Object.assign(new Error('body_too_large'),{status:413,publicCode:'body_too_large'});chunks.push(c)}return Buffer.concat(chunks)}
export async function readJson(req,max=1_000_000){const raw=(await readBody(req,max)).toString('utf8');if(!raw)return {};try{return JSON.parse(raw)}catch{throw Object.assign(new Error('invalid_json'),{status:400,publicCode:'invalid_json'})}}
export function serveStatic(root,req,res){
  const u=new URL(req.url,'http://localhost');let p;
  try{p=decodeURIComponent(u.pathname)}catch{return false}
  if(p==='/')p='/index.html';const base=path.resolve(root),abs=path.resolve(base,`.${p}`);
  if(!abs.startsWith(base+path.sep)&&abs!==path.resolve(base,'index.html'))return false;
  if(!fs.existsSync(abs)||!fs.statSync(abs).isFile())return false;
  const data=fs.readFileSync(abs),ext=path.extname(abs);
  res.writeHead(200,{...SECURITY_HEADERS,'content-type':TYPES[ext]||'application/octet-stream','content-length':data.length,'cache-control':ext==='.html'?'no-store':'public, max-age=300, immutable'});res.end(data);return true;
}

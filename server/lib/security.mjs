import crypto from 'node:crypto';

const MUTATING=new Set(['POST','PUT','PATCH','DELETE']);
const splitCsv=(value='')=>String(value).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
export function hostName(host=''){
  const value=String(host).trim().toLowerCase();
  if(value.startsWith('[')){const end=value.indexOf(']');return end>0?value.slice(1,end):''}
  return value.split(':')[0];
}
export function isLoopbackHost(name=''){const h=hostName(name);return h==='127.0.0.1'||h==='localhost'||h==='::1'}
function normalizeOrigin(value){
  try{const u=new URL(String(value));if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)return null;return `${u.protocol}//${u.host}`.toLowerCase()}catch{return null}
}
function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
export function validBasicAuthorization(header,password){
  if(!password)return true;
  if(typeof header!=='string'||!header.startsWith('Basic '))return false;
  try{const raw=Buffer.from(header.slice(6),'base64').toString('utf8'),cut=raw.indexOf(':');if(cut<0)return false;return safeEqual(raw.slice(0,cut),'teddy')&&safeEqual(raw.slice(cut+1),password)}catch{return false}
}
export function deploymentPolicy({listenHost='127.0.0.1',publicOrigin='',authPassword='',secretMasterKey=''}={}){
  if(isLoopbackHost(listenHost))return {ok:true,mode:'loopback',publicOrigin:null,publicHost:null};
  const origin=normalizeOrigin(publicOrigin);
  if(!origin||!origin.startsWith('https://'))return {ok:false,error:'public_https_origin_required'};
  if(typeof authPassword!=='string'||authPassword.length<16)return {ok:false,error:'deployment_auth_required'};
  const master=String(secretMasterKey||'').trim();
  const masterOk=/^[0-9a-f]{64}$/i.test(master)||(master.startsWith('base64:')&&(()=>{try{return Buffer.from(master.slice(7),'base64').length===32}catch{return false}})());
  if(!masterOk)return {ok:false,error:'external_secret_master_required'};
  return {ok:true,mode:'authenticated-proxy',publicOrigin:origin,publicHost:new URL(origin).host.toLowerCase()};
}
export function guardRequest(req,{listenHost='127.0.0.1',allowedHosts=process.env.TEDDY_ALLOWED_HOSTS||'',allowedOrigins=process.env.TEDDY_ALLOWED_ORIGINS||'',publicOrigin=process.env.TEDDY_PUBLIC_ORIGIN||'',authPassword=process.env.TEDDY_AUTH_PASSWORD||'',csrfToken=''}={}){
  const rawHost=String(req.headers.host||'').trim().toLowerCase(),h=hostName(rawHost);
  if(!rawHost)return {ok:false,status:400,error:'host_required'};
  const explicitHosts=splitCsv(allowedHosts),normalizedPublic=normalizeOrigin(publicOrigin),publicHost=normalizedPublic?new URL(normalizedPublic).host.toLowerCase():'';
  const trustedPublicHosts=new Set([...explicitHosts,publicHost].filter(Boolean));
  if(isLoopbackHost(listenHost)){
    if(!isLoopbackHost(h))return {ok:false,status:421,error:'host_not_allowed'};
  }else{
    if(!trustedPublicHosts.size)return {ok:false,status:503,error:'allowed_hosts_required'};
    if(!trustedPublicHosts.has(rawHost)&&!trustedPublicHosts.has(h))return {ok:false,status:421,error:'host_not_allowed'};
  }
  const pathname=(()=>{try{return new URL(req.url||'/','http://localhost').pathname}catch{return '/'}})();
  if(authPassword&&pathname!=='/api/health'&&!validBasicAuthorization(req.headers.authorization,authPassword))return {ok:false,status:401,error:'authentication_required',headers:{'www-authenticate':'Basic realm="Teddy", charset="UTF-8"'}};
  const method=String(req.method||'GET').toUpperCase();
  if(MUTATING.has(method)){
    const fetchSite=String(req.headers['sec-fetch-site']||'').toLowerCase();
    if(fetchSite==='cross-site')return {ok:false,status:403,error:'cross_site_request_rejected'};
    const origin=req.headers.origin,explicitOrigins=new Set([...splitCsv(allowedOrigins),normalizedPublic].filter(Boolean));
    if(origin){
      const normalized=normalizeOrigin(origin);if(!normalized)return {ok:false,status:403,error:'origin_not_allowed'};
      const directOrigin=`${req.socket?.encrypted?'https':'http'}://${rawHost}`.toLowerCase();
      const directAllowed=isLoopbackHost(listenHost)&&normalized===directOrigin;
      // A trusted reverse proxy terminates TLS: socket.encrypted is false here.
      // Authorize only the EXACT HTTPS Origin of an already allowlisted Host;
      // never infer trust from arbitrary X-Forwarded-Host/Proto headers.
      const sameHostedOrigin=!isLoopbackHost(listenHost)&&trustedPublicHosts.has(rawHost)&&normalized===`https://${rawHost}`;
      // Reverse proxies may rewrite Host while preserving the browser's page
      // Origin. Browser fetch metadata + a 256-bit token from authenticated,
      // same-origin GET /api/bootstrap are a second CSRF proof, NOT a CORS bypass.
      // Only hosted XHR/fetch, never navigation, cross-site or opaque origins.
      const browserProof=!isLoopbackHost(listenHost)&&Boolean(csrfToken)&&
        fetchSite==='same-origin'&&
        String(req.headers['sec-fetch-mode']||'').toLowerCase()==='cors'&&
        String(req.headers['sec-fetch-dest']||'').toLowerCase()==='empty'&&
        normalized.startsWith('https://')&&
        safeEqual(req.headers['x-teddy-csrf']||'',csrfToken);
      if(!directAllowed&&!sameHostedOrigin&&!explicitOrigins.has(normalized)&&!browserProof)return {ok:false,status:403,error:'origin_not_allowed'};
    }else if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none')return {ok:false,status:403,error:'origin_required'};
  }
  return {ok:true};
}
export const SECURITY_HEADERS=Object.freeze({
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'x-permitted-cross-domain-policies':'none',
  'referrer-policy':'no-referrer',
  'cross-origin-opener-policy':'same-origin',
  'cross-origin-resource-policy':'same-origin',
  'origin-agent-cluster':'?1',
  'permissions-policy':'microphone=(self), camera=(), geolocation=(), payment=(), usb=()',
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
});

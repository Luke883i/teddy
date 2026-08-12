function splitCsv(value='') { return value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean); }
function hostName(host='') {
  const value=String(host).trim().toLowerCase();
  if(value.startsWith('[')) return value.slice(1,value.indexOf(']'));
  return value.split(':')[0];
}
function loopback(name) { return name==='127.0.0.1'||name==='localhost'||name==='::1'; }

export function guardRequest(req,{listenHost='127.0.0.1',port=8787,allowedHosts=process.env.TEDDY_ALLOWED_HOSTS||'',allowedOrigins=process.env.TEDDY_ALLOWED_ORIGINS||''}={}) {
  const rawHost=String(req.headers.host||'').toLowerCase();
  const h=hostName(rawHost);
  if(!rawHost) return {ok:false,status:400,error:'host_required'};

  const explicitHosts=splitCsv(allowedHosts);
  if(loopback(listenHost)) {
    if(!loopback(h)) return {ok:false,status:421,error:'host_not_allowed'};
  } else if(explicitHosts.length && !explicitHosts.includes(rawHost) && !explicitHosts.includes(h)) {
    return {ok:false,status:421,error:'host_not_allowed'};
  }

  const method=String(req.method||'GET').toUpperCase();
  if(['POST','PUT','PATCH','DELETE'].includes(method)) {
    const origin=req.headers.origin;
    if(origin) {
      let originHost='';
      try { originHost=new URL(origin).host.toLowerCase(); } catch { return {ok:false,status:403,error:'origin_not_allowed'}; }
      const explicitOrigins=splitCsv(allowedOrigins);
      const sameOrigin=originHost===rawHost;
      if(!sameOrigin && !explicitOrigins.includes(String(origin).toLowerCase())) return {ok:false,status:403,error:'origin_not_allowed'};
    }
  }
  return {ok:true};
}

export const SECURITY_HEADERS = Object.freeze({
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'referrer-policy':'no-referrer',
  'cross-origin-opener-policy':'same-origin',
  'cross-origin-resource-policy':'same-origin',
  'permissions-policy':'microphone=(self), camera=(), geolocation=(), payment=(), usb=()',
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
});

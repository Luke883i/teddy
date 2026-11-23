// V41: recover only a rotated per-process CSRF token after a Render restart.
// A semantic text turn retains its exact requestId/body; at most one retry.
// Never retries 401, cross-site rejection, model failures, or other HTTP errors.
// The origin is a claim, not a secret; the server binds the CSRF token to
// this exact browser Origin after an authorized same-origin bootstrap.
export function browserOriginClaim(){
 const origin=typeof window!=='undefined'?window.location?.origin:'';
 return typeof origin==='string'&&origin.startsWith('https://')?{'x-teddy-page-origin':origin}:{};
}
export async function fetchWithCsrf(url,options={},{boot,fetchImpl=fetch}={}){
 const init={...options,credentials:'same-origin'};
 const makeOptions=()=>({...init,headers:{...init.headers,'x-teddy-csrf':boot?.security?.csrfToken||''}});
 const previous=boot?.security?.csrfToken||'';
 let response=await fetchImpl(url,makeOptions());
 if(response.status!==403)return response;
 let error;
 try{error=(await response.clone().json())?.error}catch{return response}
 if(error!=='origin_not_allowed'||init.signal?.aborted)return response;
 let refresh;
 try{refresh=await fetchImpl('/api/bootstrap',{method:'GET',headers:browserOriginClaim(),credentials:'same-origin',cache:'no-store',signal:init.signal})}catch{return response}
 if(!refresh.ok)return response;
 let latest;
 try{latest=await refresh.json()}catch{return response}
 const next=latest?.security?.csrfToken;
 if(typeof next!=='string'||next.length<32||next===previous)return response;
 if(boot){
  boot.security={...boot.security,csrfToken:next};
  if(latest.ai?.provider&&latest.ai.provider!==boot.ai?.provider){
   boot.ai=latest.ai;boot.availability=latest.availability;boot.secret=latest.secret;
   if(typeof window!=='undefined'&&typeof CustomEvent==='function')
    window.dispatchEvent(new CustomEvent('teddy:provider-changed',{detail:latest}));
  }
 }
 if(init.signal?.aborted)return response;
 return fetchImpl(url,makeOptions());
}

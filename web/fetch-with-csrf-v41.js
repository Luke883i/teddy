// V41: recover only a rotated per-process CSRF token after a Render restart.
// A semantic text turn retains its exact requestId/body; at most one retry.
// Never retries 401, cross-site rejection, model failures, or other HTTP errors.
export async function fetchWithCsrf(url,options={},{boot,fetchImpl=fetch}={}){
 const init={...options,credentials:'same-origin'};
 const makeOptions=()=>({...init,headers:{...init.headers,'x-teddy-csrf':boot?.security?.csrfToken||''}});
 const previous=boot?.security?.csrfToken||'';
 let response=await fetchImpl(url,makeOptions());
 if(response.status!==403)return response;
 let error;
 try{error=(await response.clone().json())?.error}catch{return response}
 if(error!=='origin_not_allowed')return response;
 let refresh;
 try{refresh=await fetchImpl('/api/bootstrap',{method:'GET',credentials:'same-origin',cache:'no-store'})}catch{return response}
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
 return fetchImpl(url,makeOptions());
}

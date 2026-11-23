// TEST-ONLY external provider surrogate. Never represents genuine model quality.
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 if(String(url)==='https://vireonix.ai/v1/chat/completions'){
  await new Promise(resolve=>setTimeout(resolve,650));
  if(opts.signal?.aborted)throw opts.signal.reason;
  return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'Risposta strumentata, non modello reale.'},finish_reason:'stop'}]}),{status:200,headers:{'content-type':'application/json'}});
 }
 return originalFetch(url,opts);
};

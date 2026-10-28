// Explicit, observable provider switch. Never hide a denied HTTP mutation.
const PROVIDERS=new Set(['local','vireonix','openai']);
const failure=(code,status=0)=>Object.assign(new Error(code),{code,status});

export function explainProviderSwitchFailure(error){
  const status=Number(error?.status||0),code=String(error?.code||'provider_switch_failed');
  if(status===401||code==='authentication_required')return 'Autenticazione Teddy richiesta (401). Ricarica la pagina e accedi con le credenziali del server.';
  if(status===403||['origin_not_allowed','cross_site_request_rejected','origin_required'].includes(code))return `Origine della pagina non autorizzata (403: ${code}). Controlla l'indirizzo HTTPS e i domini ammessi da Teddy.`;
  if(status===421||code==='host_not_allowed')return 'Hostname non autorizzato (421). Controlla il dominio pubblico configurato per Teddy.';
  if(status===404)return 'Il server non espone il selettore di modello (404). Verifica la versione effettivamente distribuita.';
  if(status===409&&code==='provider_switch_busy')return 'Teddy sta elaborando una risposta. Riprova al termine del messaggio.';
  if(status===503&&code==='provider_persistence_failed')return 'Non riesco a salvare la scelta sul database di Teddy. Il motore precedente rimane attivo.';
  if(code==='provider_switch_network')return 'Connessione al server interrotta. Verifica che Teddy sia raggiungibile e riprova.';
  if(code==='provider_switch_invalid_response')return 'Il server ha restituito un risultato incompatibile: il cambio non è confermato.';
  return `Cambio motore non riuscito (${status||'rete'}: ${code}). Il motore precedente rimane selezionato.`;
}

export async function requestProviderSwitch(provider,{fetchImpl=fetch,csrfToken=''}={}){
  if(!PROVIDERS.has(provider))throw failure('provider_invalid',400);
  let response;
  try{
    response=await fetchImpl('/api/provider',{
      method:'PUT',credentials:'same-origin',cache:'no-store',
      headers:{'content-type':'application/json','x-teddy-csrf':csrfToken},body:JSON.stringify({provider})
    });
  }catch{throw failure('provider_switch_network')}
  let payload=null;
  try{payload=await response.json()}catch{}
  if(!response.ok)throw failure(typeof payload?.error==='string'?payload.error:'provider_switch_http_error',response.status);
  if(payload?.ai?.provider!==provider)throw failure('provider_switch_invalid_response',response.status);
  return payload;
}

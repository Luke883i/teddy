// Minimal text-only end-user policy: no network I/O and no fake Teddy speech.
export const HUMAN_PROVIDER_LABELS=Object.freeze({local:'Qwen locale',vireonix:'Vireonix',openai:'OpenAI'});
export const providerLabel=value=>HUMAN_PROVIDER_LABELS[value]||'motore sconosciuto';
const codeLabel=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,79}$/i.test(value)?value:'unknown_error';
const codeStatus=value=>Number.isInteger(value)&&value>=400&&value<=599?value:0;
export function providerSwitchFeedback({attempted,active,code,status}={}){
 const p=providerLabel(attempted),a=providerLabel(active),s=codeStatus(status),c=codeLabel(code);
 const cause=s===403?'la pagina non è autorizzata per questa operazione':s===401?'è richiesta l’autenticazione':s===421?'il dominio non è autorizzato':s===409?'è ancora in corso una risposta':s===503?'non è stato possibile salvare la scelta':'il server non ha confermato il cambio';
 return 'Non posso passare a '+p+': '+cause+' ('+(s||'rete')+': '+c+'). Motore ancora attivo: '+a+'.';
}
export function textTurnFeedback({provider,code,status,upstreamStatus}={}){
 const p=providerLabel(provider),c=codeLabel(code),s=codeStatus(status);
 if(c==='origin_not_allowed'||c==='cross_site_request_rejected'||c==='origin_required')return 'Messaggio non inviato: Teddy ha rifiutato la richiesta della pagina ('+(s||403)+': '+c+'). Il modello '+p+' non è stato interrogato.';
 if(c==='authentication_required')return 'Messaggio non inviato: è richiesta l’autenticazione a Teddy (401).';
 if(c==='text_request_conflict'||c==='text_request_identity_mismatch')return 'Richiesta da verificare ('+c+'): nessuna risposta sarà simulata. Controlla la cronologia.';
 if(c==='local_text_timeout')return 'Qwen ha impiegato troppo tempo. Nessuna risposta è stata confermata ('+c+').';
 if(c==='vireonix_upstream_unavailable')return 'Vireonix non è disponibile al momento (HTTP upstream '+(codeStatus(upstreamStatus)||'non specificato')+'). Teddy non ha salvato una risposta fittizia. Puoi riprovare più tardi oppure scegliere Qwen locale.';
 if(c==='vireonix_request_rejected')return 'Vireonix ha rifiutato il formato della richiesta (HTTP upstream '+(codeStatus(upstreamStatus)||'non specificato')+'). È un problema di integrazione, non del tuo messaggio.';
 if(c==='vireonix_rate_limited')return 'Vireonix ha raggiunto il limite di richieste (HTTP 429). Attendi prima di riprovare oppure scegli Qwen locale.';
 if(c.startsWith('vireonix_'))return 'Vireonix non ha completato il messaggio ('+c+'). Puoi riprovare o scegliere Qwen.';
 if(c==='local_text_not_ready'||c==='local_llm_failed')return 'Qwen non ha completato il messaggio ('+c+'). Verifica lo stato del modello locale.';
 return 'Teddy non ha confermato una risposta di '+p+' ('+(s||'rete')+': '+c+'). Riprova lo stesso messaggio o consulta la cronologia.';
}
export function classifyVisibleTurn({httpOk=false,reply='',conversationId='',requestId='',expectedRequestId=''}={}){
 if(!httpOk||typeof reply!=='string'||!reply.trim()||typeof conversationId!=='string'||!conversationId.trim())return 'error';
 if(expectedRequestId&&requestId!==expectedRequestId)return 'error';
 return 'balloon';
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
const bytes=n=>{n=Number(n||0);if(!n)return '—';const units=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++}return `${n.toFixed(i?1:0)} ${units[i]}`};
export function availabilityCopy(a={}){
  if(a.mode==='text'){
    if(a.textReady===true)return {title:'Chat locale pronta',body:'Il modello linguistico ha superato il test di risposta. Le chat sono elaborate sul computer.'};
    if(a.availability==='installazione')return {title:'Preparo la chat locale',body:a.installPhase==='verifying'?'Verifico integrità e provenienza dei file scaricati.':a.installPhase==='self_testing'?'Verifico che il modello sappia generare una risposta.':'Installo soltanto motore linguistico e modello GGUF. La chat sarà disponibile dopo il test.'};
    const problem=a.lastProblem?.error;
    if(problem==='artifact_digest_mismatch')return {title:'Verifica del modello non riuscita',body:'Il file scaricato non corrisponde allo SHA-256 atteso. Nessun modello non verificato verrà avviato.'};
    if(problem==='artifact_size_mismatch')return {title:'Download incompleto o non valido',body:'La dimensione del modello non è quella attesa. Occorre ritentare il download.'};
    if(problem==='local_llm_port_in_use')return {title:'Motore locale già in uso',body:'La porta del modello è occupata da un altro processo. Risolvi il conflitto e ritenta.'};
    return {title:'Chat locale non ancora pronta',body:problem?'Installazione o verifica non riuscita ('+String(problem)+'). Puoi riprovare.':'Il modello linguistico non ha ancora superato il test di risposta.'};
  }
  if(a.ready)return {title:'Teddy è disponibile',body:'ASR, modello linguistico e voce hanno superato il self-test locale.'};
  if(a.availability==='installazione')return {title:'Teddy si sta installando',body:'Scarico, verifico e preparo gli artefatti pubblici necessari. Puoi seguire ogni passaggio qui.'};
  if(a.availability==='degradato')return {title:'Teddy è degradato',body:'Esiste un runtime ripristinabile, ma almeno un motore non è sano.'};
  return {title:'Teddy non è disponibile',body:'Il runtime non è pronto. Apri Diagnostica per il problema corrente.'};
}
export function renderAvailability(a,els){
  const copy=availabilityCopy(a);els.panel.classList.remove('hidden','ready','failed');els.panel.classList.toggle('ready',Boolean(a?.ready));els.panel.classList.toggle('failed',a?.availability==='non_disponibile');els.title.textContent=copy.title;els.badge.textContent=a?.availability||'non_disponibile';els.body.textContent=copy.body;if(els.facts){const generation=a?.generation?.id||'non installato',self=a?.selfTest?.ok===true?'superato':'in attesa',llm=a?.engines?.llm?.state||'non disponibile';els.facts.textContent=a?.mode==='text'?('Motore: '+llm+' · Self-test: '+self+' · Generazione: '+generation):'';}
  els.list.innerHTML=(a?.artifacts||[]).map(x=>{const total=Number(x.totalBytes||0),done=Number(x.downloadedBytes||0),pct=total?Math.min(100,Math.round(done/total*100)):(x.verified?100:0),url=safeUrl(x.source),digest=x.sha256?`${String(x.sha256).slice(0,12)}…`: 'hash in attesa';return `<div class="artifact"><div class="artifact-line"><span>${esc(x.role)} · ${esc(x.name)}</span><small>${esc(x.phase)} ${x.verified?'✓':''}</small></div><div class="artifact-meta">${esc(x.publisher)} · ${esc(x.version)} · SHA-256 ${esc(digest)} · ${esc(bytes(done))}/${esc(bytes(total))}${url?` · <a href="${esc(url)}" target="_blank" rel="noreferrer">origine</a>`:''}</div><div class="artifact-progress"><i style="width:${pct}%"></i></div></div>`}).join('');
}

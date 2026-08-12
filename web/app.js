import {TeddyRenderer} from './teddy/render.js';
import {TeddyRealtime} from './realtime.js';
import {AudioPresence} from './audio.js';
const $=s=>document.querySelector(s),drawer=$('#drawer'),onboarding=$('#onboarding'),talkBtn=$('#talkBtn'),stateText=$('#stateText'),meter=$('#meter i'),remoteAudio=$('#remoteAudio');
let boot,config,rt=null,conversationId=null,lastAssistant='',busy=false;
try{const r=await fetch('/api/bootstrap');if(!r.ok)throw Error(`bootstrap ${r.status}`);boot=await r.json();config=boot.config}catch(e){$('#health').textContent='offline';stateText.textContent='server non disponibile';throw e}
const renderer=new TeddyRenderer($('#scene'),config);renderer.start();
const presence=new AudioPresence(remoteAudio,v=>{meter.style.width=`${Math.round(v*100)}%`;renderer.setSpeech(v)});
$('#health').textContent='online';$('#health').classList.add('online');if(!boot.secret.configured)showKeyDialog();

function showKeyDialog(replace=false){$('#keyError').textContent='';$('#apiKey').value='';onboarding.querySelector('h1').textContent=replace?'Sostituisci la chiave OpenAI':'Ciao. Sono Teddy.';onboarding.classList.remove('hidden');setTimeout(()=>$('#apiKey').focus(),80)}
$('#saveKey').onclick=async()=>{const key=$('#apiKey').value.trim();$('#saveKey').disabled=true;$('#keyError').textContent='';try{const r=await fetch('/api/secrets/openai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key})});const body=await r.json();if(!r.ok)throw Error(body.error||'invalid');boot.secret=body.secret;onboarding.classList.add('hidden');$('#apiKey').value='';stateText.textContent='pronto'}catch{$('#keyError').textContent='La chiave non sembra valida.'}finally{$('#saveKey').disabled=false}};
$('#apiKey').addEventListener('keydown',e=>{if(e.key==='Enter')$('#saveKey').click()});

async function saveTurn(role,text){if(!conversationId||!text?.trim())return;await fetch('/api/turns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId,role,text})}).catch(()=>{})}
function consumeEvent(e){
  const t=e?.type||'';
  if(t.includes('speech_started')){renderer.setListening(1);stateText.textContent='ti ascolto'}
  if(t.includes('speech_stopped')){renderer.setListening(0);stateText.textContent='un attimo'}
  if(t==='response.audio_transcript.delta'||t==='response.output_audio_transcript.delta')lastAssistant+=(e.delta||'');
  if(t==='response.audio_transcript.done'||t==='response.output_audio_transcript.done'){saveTurn('assistant',e.transcript||lastAssistant);lastAssistant=''}
  if(t==='conversation.item.input_audio_transcription.completed')saveTurn('user',e.transcript||'');
  if(t==='response.created')stateText.textContent='ci penso';
  if(t==='response.done')stateText.textContent='parla quando vuoi';
  if(t==='error'){console.error('Realtime event',e);stateText.textContent='errore realtime'}
}
async function closeTalk(label='disconnesso'){
  rt?.close();presence.stop();rt=null;renderer.setListening(0);talkBtn.textContent='Parla con Teddy';talkBtn.classList.remove('live');stateText.textContent=label;
  const id=conversationId;conversationId=null;if(id)await fetch(`/api/conversations/${id}/end`,{method:'POST'}).catch(()=>{});
}
async function startTalk(){
  if(busy)return;if(!boot.secret.configured){showKeyDialog();return}
  if(rt){await closeTalk();return}
  busy=true;talkBtn.disabled=true;
  try{stateText.textContent='chiedo il microfono';conversationId=(await (await fetch('/api/conversations',{method:'POST'})).json()).id;rt=new TeddyRealtime(config);rt.addEventListener('remote',e=>presence.attach(e.detail,config.audio.outputGain));rt.addEventListener('event',e=>consumeEvent(e.detail));rt.addEventListener('state',e=>{if(e.detail==='connected')stateText.textContent='parla quando vuoi';else if(['failed','disconnected','closed'].includes(e.detail))stateText.textContent=e.detail});await rt.connect();talkBtn.textContent='Chiudi conversazione';talkBtn.classList.add('live')}
  catch(e){console.error(e);await closeTalk('connessione fallita');alert(`Teddy non riesce a collegarsi. ${e.message}`)}finally{busy=false;talkBtn.disabled=false}
}
talkBtn.onclick=startTalk;

function row(label,control,hint=''){return `<div class="row"><label>${label}${hint?`<small>${hint}</small>`:''}</label>${control}</div>`}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(s){try{return new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(s))}catch{return s}}
async function openView(name){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='talk'){drawer.classList.add('hidden');return}drawer.classList.remove('hidden');
  if(name==='history'){
    const d=await (await fetch('/api/history?limit=160')).json();drawer.innerHTML=`<h2>Cronologia</h2><p class="muted">Persistita localmente. Le conversazioni vocali rimangono consultabili dopo un riavvio.</p><div class="timeline">${d.turns.length?d.turns.map(t=>`<article class="turn ${esc(t.role)}"><small>${t.role==='user'?'tu':'Teddy'} · ${fmtDate(t.created_at)}</small><p>${esc(t.text)}</p></article>`).join(''):'<p class="muted">Ancora nessuna conversazione.</p>'}</div>`;
  }
  if(name==='memory'){
    const d=await (await fetch('/api/memories')).json();drawer.innerHTML=`<h2>Memoria</h2><p class="muted">Ricordi espliciti, ordinati per salienza e reiniettati nelle nuove sessioni quando utili.</p><form id="memoryForm">${row('Nuovo ricordo','<input id="memoryText" type="text" maxlength="4000" placeholder="Ricordati che…">')}<button class="primary">Aggiungi</button></form><div id="memories">${d.memories.map(m=>`<div class="memory"><div>${esc(m.text)}</div><small>salienza ${Number(m.salience).toFixed(2)}</small><button data-del="${m.id}">dimentica</button></div>`).join('')}</div>`;$('#memoryForm').onsubmit=async e=>{e.preventDefault();const text=$('#memoryText').value.trim();if(!text)return;await fetch('/api/memories',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});openView('memory')};drawer.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{await fetch(`/api/memories/${b.dataset.del}`,{method:'DELETE'});openView('memory')});
  }
  if(name==='studio'){
    const a=config.audio,p=config.persona,x=config.appearance;drawer.innerHTML=`<h2>Studio</h2><p class="muted">Voce, carattere e presenza sono configurazione runtime persistente.</p><h3>Voce</h3>${row('Modello',`<select id="model"><option>gpt-realtime-2.1</option><option>gpt-realtime-2.1-mini</option></select>`)}${row('Voce',`<select id="voice"><option>marin</option><option>cedar</option></select>`,'marin e cedar sono i profili principali')}${row('Velocita',`<input id="speed" type="range" min=".25" max="1.5" step=".05" value="${a.outputSpeed}">`)}${row('Turn taking',`<select id="vad"><option value="low">paziente</option><option value="auto">naturale</option><option value="high">rapido</option></select>`)}${row('Riduzione rumore',`<select id="nr"><option value="near_field">vicino</option><option value="far_field">lontano</option><option value="off">off</option></select>`)}${row('Guadagno uscita',`<input id="outGain" type="range" min="0" max="2" step=".05" value="${a.outputGain}">`)}<h3>Carattere</h3>${row('Irritabilita',`<input id="irritability" type="range" min="0" max="1" step=".01" value="${p.irritability}">`)}${row('Calore',`<input id="warmth" type="range" min="0" max="1" step=".01" value="${p.warmth}">`)}${row('Arguzia',`<input id="wit" type="range" min="0" max="1" step=".01" value="${p.wit}">`)}${row('Verbosita',`<input id="verbosity" type="range" min="0" max="1" step=".01" value="${p.verbosity}">`)}<h3>Aspetto</h3>${row('Pelo',`<input id="fur" type="color" value="${x.fur}">`)}${row('Muso',`<input id="muzzle" type="color" value="${x.muzzle}">`)}${row('Occhi',`<input id="eyes" type="color" value="${x.eyes}">`)}${row('Ambiente',`<input id="background" type="color" value="${x.background}">`)}${row('Esposizione',`<input id="exposure" type="range" min=".6" max="1.6" step=".05" value="${x.exposure}">`)}<h3>OpenAI</h3>${row('API key',`<span class="secret">${boot.secret.configured?`•••• ${esc(boot.secret.tail||'')}`:'non configurata'}</span>`)}<div class="buttonline"><button id="replaceKey">Sostituisci key</button><button id="saveStudio" class="primary">Applica</button></div><p class="muted"><small>Le modifiche vocali entrano nella prossima sessione; se Teddy sta parlando la sessione corrente viene chiusa in modo pulito.</small></p>`;
    $('#model').value=config.model;$('#voice').value=config.voice;$('#vad').value=a.vadEagerness;$('#nr').value=a.noiseReduction;$('#replaceKey').onclick=()=>showKeyDialog(true);
    $('#saveStudio').onclick=async()=>{const patch={model:$('#model').value,voice:$('#voice').value,persona:{irritability:+$('#irritability').value,warmth:+$('#warmth').value,wit:+$('#wit').value,verbosity:+$('#verbosity').value},audio:{outputSpeed:+$('#speed').value,vadEagerness:$('#vad').value,noiseReduction:$('#nr').value,outputGain:+$('#outGain').value},appearance:{fur:$('#fur').value,muzzle:$('#muzzle').value,eyes:$('#eyes').value,background:$('#background').value,exposure:+$('#exposure').value}};const r=await fetch('/api/config',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(patch)});config=(await r.json()).config;renderer.setConfig(config);if(rt)await closeTalk('configurazione applicata');else stateText.textContent='configurazione applicata';openView('studio')};
  }
  if(name==='diagnostics'){
    drawer.innerHTML=`<h2>Diagnostica</h2><div class="diagnostic">${esc(JSON.stringify({renderer:renderer.backend,webgl2:!!document.createElement('canvas').getContext('webgl2'),webgpu:!!navigator.gpu,webrtc:!!window.RTCPeerConnection,mediaDevices:!!navigator.mediaDevices,secret:{configured:boot.secret.configured,tail:boot.secret.tail},model:config.model,voice:config.voice,persistence:boot.persistence,install:boot.install},null,2))}</div><div class="buttonline"><button id="refreshDiag">Aggiorna</button><button id="forgetKey" class="danger">Rimuovi API key</button></div>`;$('#refreshDiag').onclick=()=>openView('diagnostics');$('#forgetKey').onclick=async()=>{await fetch('/api/secrets/openai',{method:'DELETE'});boot.secret={configured:false,tail:null};drawer.classList.add('hidden');showKeyDialog()};
  }
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>openView(b.dataset.view));$('#settingsBtn').onclick=()=>openView('studio');

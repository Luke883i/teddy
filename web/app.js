import {TeddyRenderer} from './teddy/render.js';
import {TeddyRealtime} from './realtime.js';
import {AudioPresence} from './audio.js';
import {connectionGuidance} from './connection.js';
import {captureWav,streamLocalTurn} from './local.js';
import {renderAvailability} from './availability.js';

const $=s=>document.querySelector(s),drawer=$('#drawer'),onboarding=$('#onboarding'),talkBtn=$('#talkBtn'),stateText=$('#stateText'),meter=$('#meter i'),remoteAudio=$('#remoteAudio');
const notice=$('#connectionNotice'),noticeTitle=$('#connectionTitle'),noticeBody=$('#connectionBody'),noticePrimary=$('#connectionPrimary'),noticeDiag=$('#connectionDiagnostics');
let boot,config,rt=null,conversationId=null,busy=false,localAbort=null,lastConnectionProblem=null,lastLocalMetrics=null,availability=null,turnGeneration=0;
try{const r=await fetch('/api/bootstrap');if(!r.ok)throw Error(`bootstrap ${r.status}`);boot=await r.json();config=boot.config;availability=boot.availability||null}catch(e){$('#health').textContent='offline';stateText.textContent='server non disponibile';throw e}
const renderer=new TeddyRenderer($('#scene'),config);renderer.start();
const presence=new AudioPresence(remoteAudio,v=>{meter.style.width=`${Math.round(v*100)}%`;renderer.setSpeech(v)});
const localMode=()=>boot?.ai?.provider!=='openai';
const runtimeEls=(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/install.css';document.head.append(link);const panel=document.createElement('section');panel.id='installPanel';panel.className='install-panel hidden';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.innerHTML='<div class="install-head"><strong id="availabilityTitle">Teddy si prepara</strong><span id="availabilityBadge">installazione</span></div><p id="availabilityBody">Verifico i motori locali.</p><div id="artifactList" class="artifact-list"></div>';$('#statusPanel').after(panel);return{panel,title:panel.querySelector('#availabilityTitle'),badge:panel.querySelector('#availabilityBadge'),body:panel.querySelector('#availabilityBody'),list:panel.querySelector('#artifactList')}})();
function runtimeReady(){return !localMode()||availability?.ready===true}
function applyAvailability(a){availability=a||availability;if(!localMode()){runtimeEls.panel.classList.add('hidden');talkBtn.disabled=false;return}renderAvailability(availability||{},runtimeEls);boot.ai.configured=Boolean(availability?.ready);talkBtn.disabled=!runtimeReady()&&!localAbort;stateText.textContent=availability?.ready?'locale · pronto':availability?.availability==='installazione'?`locale · ${availability.installPhase||'installazione'}`:'locale · non disponibile'}
async function refreshAvailability(){if(!localMode())return;try{const r=await fetch('/api/availability',{cache:'no-store'});if(r.ok)applyAvailability(await r.json())}catch{}}
applyAvailability(availability);if(localMode())setInterval(refreshAvailability,1000);
$('#health').textContent='online';$('#health').classList.add('online');if(!localMode()&&!boot.secret.configured)showKeyDialog();

function showKeyDialog(replace=false){$('#keyError').textContent='';$('#apiKey').value='';onboarding.querySelector('h1').textContent=replace?'Sostituisci la chiave OpenAI':'OpenAI opzionale';onboarding.classList.remove('hidden');setTimeout(()=>$('#apiKey').focus(),80)}
$('#saveKey').onclick=async()=>{const key=$('#apiKey').value.trim();const r=await fetch('/api/secrets/openai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key})});const body=await r.json();if(r.ok){boot.secret=body.secret;onboarding.classList.add('hidden')}else $('#keyError').textContent='La chiave non sembra valida.'};
function hideConnectionNotice(){notice.classList.add('hidden')}
function showProblem(problem={}){lastConnectionProblem={...problem,at:new Date().toISOString()};const g=connectionGuidance(problem);noticeTitle.textContent=g.title;noticeBody.textContent=problem.error==='local_runtime_not_ready'?'Teddy locale non ha ancora superato installazione e self-test. Segui lo stato degli artefatti pubblici.':g.message;notice.classList.remove('hidden');noticeDiag.onclick=()=>openView('diagnostics');noticePrimary.textContent='Riprova';noticePrimary.onclick=()=>startTalk()}
async function saveTurn(role,text){if(!conversationId||!text?.trim())return;await fetch('/api/turns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId,role,text})}).catch(()=>{})}
async function ensureConversation(){if(!conversationId)conversationId=(await (await fetch('/api/conversations',{method:'POST'})).json()).id;return conversationId}
async function endConversation(){const id=conversationId;conversationId=null;if(id)await fetch(`/api/conversations/${id}/end`,{method:'POST'}).catch(()=>{})}
function cancelLocalTurn(){if(!localAbort)return false;const ac=localAbort;localAbort=null;turnGeneration++;ac.abort();presence.stop();renderer.setListening(0);talkBtn.textContent='Parla con Teddy';talkBtn.classList.remove('live');talkBtn.disabled=!runtimeReady();stateText.textContent='interrotto';return true}
async function startLocalTurn(){
  if(!runtimeReady()){showProblem({error:'local_runtime_not_ready',kind:'local'});await refreshAvailability();return}
  hideConnectionNotice();await ensureConversation();const ac=new AbortController(),generation=++turnGeneration;localAbort=ac;talkBtn.textContent='Interrompi';talkBtn.classList.add('live');talkBtn.disabled=false;
  try{
    renderer.setListening(1);stateText.textContent='ti ascolto';const wav=await captureWav({durationMs:8000,signal:ac.signal,adaptive:true});renderer.setListening(0);stateText.textContent='trascrivo';let assistant='';
    await streamLocalTurn(wav,{signal:ac.signal,onEvent:async e=>{
      window.dispatchEvent(new CustomEvent('teddy:local-event',{detail:e}));
      if(e.type==='state'){stateText.textContent=e.state==='thinking'?'ci penso':e.state==='speaking'?'parlo':e.state==='transcribing'?'trascrivo':e.state;}
      if(e.type==='transcript')await saveTurn('user',e.text);
      if(e.type==='text.delta')assistant+=e.text||'';
      if(e.type==='telemetry')lastLocalMetrics=e.metrics||e;
      if(e.type==='audio')await presence.playBase64Wav(e.data,config.audio.outputGain,ac.signal);
      if(e.type==='error')throw Object.assign(new Error(e.error),{code:e.error});
    }});if(assistant)await saveTurn('assistant',assistant);if(generation===turnGeneration)stateText.textContent='parla quando vuoi';
  }catch(e){if(e.name!=='AbortError')showProblem({error:e.code||e.message||'local_turn_failed',kind:'local'})}
  finally{if(generation===turnGeneration&&localAbort===ac){localAbort=null;renderer.setListening(0);talkBtn.textContent='Parla con Teddy';talkBtn.classList.remove('live');talkBtn.disabled=!runtimeReady()}}
}
function consumeCloudEvent(e){const t=e?.type||'';if(t.includes('speech_started')){renderer.setListening(1);stateText.textContent='ti ascolto'}if(t.includes('speech_stopped')){renderer.setListening(0);stateText.textContent='un attimo'}if(t==='conversation.item.input_audio_transcription.completed')saveTurn('user',e.transcript||'');if(t==='response.audio_transcript.done'||t==='response.output_audio_transcript.done')saveTurn('assistant',e.transcript||'');if(t==='response.created')stateText.textContent='ci penso';if(t==='response.done')stateText.textContent='parla quando vuoi'}
async function startCloud(){if(!boot.secret.configured){showKeyDialog();return}if(rt){rt.close();rt=null;presence.stop();await endConversation();talkBtn.textContent='Parla con Teddy';return}await ensureConversation();const candidate=new TeddyRealtime(config);rt=candidate;candidate.addEventListener('remote',e=>presence.attach(e.detail,config.audio.outputGain));candidate.addEventListener('event',e=>consumeCloudEvent(e.detail));await candidate.connect();talkBtn.textContent='Chiudi conversazione';talkBtn.classList.add('live')}
async function startTalk(){if(localMode()&&localAbort){cancelLocalTurn();return}if(busy)return;if(localMode()&&!runtimeReady()){showProblem({error:'local_runtime_not_ready',kind:'local'});return}busy=true;if(!localMode())talkBtn.disabled=true;try{if(localMode())await startLocalTurn();else await startCloud()}catch(e){showProblem(e?.problem||{error:e.code||'connection_failed',kind:'client'})}finally{busy=false;if(!localMode())talkBtn.disabled=false;else if(!localAbort)talkBtn.disabled=!runtimeReady()}}
talkBtn.onclick=startTalk;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function openView(name){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='talk'){drawer.classList.add('hidden');return}drawer.classList.remove('hidden');
 if(name==='history'){const d=await (await fetch('/api/history?limit=160')).json();drawer.innerHTML=`<h2>Cronologia</h2>${d.turns.map(t=>`<article class="turn ${esc(t.role)}"><small>${esc(t.role)}</small><p>${esc(t.text)}</p></article>`).join('')||'<p class="muted">Ancora nessuna conversazione.</p>'}`}
 if(name==='memory'){const d=await (await fetch('/api/memories')).json();drawer.innerHTML=`<h2>Memoria</h2><form id="memoryForm"><input id="memoryText" maxlength="4000" placeholder="Ricordati che…"><button class="primary">Aggiungi</button></form>${d.memories.map(m=>`<div class="memory"><div>${esc(m.text)}</div><button data-del="${m.id}">dimentica</button></div>`).join('')}`;$('#memoryForm').onsubmit=async e=>{e.preventDefault();const text=$('#memoryText').value.trim();if(text){await fetch('/api/memories',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});openView('memory')}};drawer.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{await fetch(`/api/memories/${b.dataset.del}`,{method:'DELETE'});openView('memory')})}
 if(name==='studio'){drawer.innerHTML=`<h2>Studio</h2><p class="muted">Il provider predefinito è locale. OpenAI è opzionale e non viene mai usato come fallback.</p><p class="muted">Per usare il cloud avvia Teddy con <code>TEDDY_PROVIDER=openai</code>.</p><div class="buttonline"><button id="replaceKey">Configura OpenAI</button></div>`;$('#replaceKey').onclick=()=>showKeyDialog(true)}
 if(name==='diagnostics'){await refreshAvailability();drawer.innerHTML=`<h2>Diagnostica</h2><div class="diagnostic">${esc(JSON.stringify({provider:boot.ai,availability,secret:{configured:boot.secret.configured},persistence:boot.persistence,realtime:boot.realtime,lastProblem:lastConnectionProblem,lastLocalMetrics,renderer:renderer.backend,motion:renderer.motionStatus?.()},null,2))}</div>`}
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>openView(b.dataset.view));$('#settingsBtn').onclick=()=>openView('studio');

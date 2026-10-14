import {TeddyRenderer} from './teddy/render.js';
import {TeddyRealtime} from './realtime.js';
import {AudioPresence} from './audio.js';
import {connectionGuidance} from './connection.js';
import {captureWav,streamLocalTurn} from './local.js';
import {renderAvailability} from './availability.js';
import {renderMotionPanel} from './teddy/motion-panel-v12.js';
import {furEnabled,furLabel} from './teddy/fur-material-v12.js';
import {installTextChat} from './text-chat-v17.js';

const $=s=>document.querySelector(s),drawer=$('#drawer'),onboarding=$('#onboarding'),talkBtn=$('#talkBtn'),stateText=$('#stateText'),meter=$('#meter i'),remoteAudio=$('#remoteAudio');
const notice=$('#connectionNotice'),noticeTitle=$('#connectionTitle'),noticeBody=$('#connectionBody'),noticePrimary=$('#connectionPrimary'),noticeDiag=$('#connectionDiagnostics');
let boot,config,rt=null,conversationId=null,busy=false,localAbort=null,lastConnectionProblem=null,lastLocalMetrics=null,availability=null,turnGeneration=0,runtimeRetryBusy=false,textChat=null;
try{const r=await fetch('/api/bootstrap');if(!r.ok)throw Error(`bootstrap ${r.status}`);boot=await r.json();config=boot.config;availability=boot.availability||null}catch(e){$('#health').textContent='offline';stateText.textContent='server non disponibile';throw e}
const renderer=new TeddyRenderer($('#scene'),config);renderer.start();
const visualBadge=$('#visualBackend');
let latestVisualQuality=null;
function updateVisualBadge(){
  const info=renderer.implicitSkinStatus?.()||null;
  const fallback=renderer.backend!=='webgl2'||!!info?.fallbackReason;
  const label=renderer.backend==='canvas2d'?'Canvas2D · ripiego':
    info?.fallbackReason?'WebGL2 · ripiego':
    info?.active?'WebGL2 · mesh fusa':'WebGL2 · preparazione';
  visualBadge.textContent=label;
  visualBadge.dataset.degraded=String(fallback);
  visualBadge.title=info?.fallbackReason?'Fallback geometrico: '+info.fallbackReason:
    info?.active?'Superficie pelosa watertight attiva':'Rendering '+renderer.backend;
}
window.addEventListener('teddy:implicit-skin-ready',updateVisualBadge);
window.addEventListener('teddy:implicit-skin-error',updateVisualBadge);
window.addEventListener('teddy:visual-quality',e=>{latestVisualQuality=e.detail});
updateVisualBadge();

const furBtn=$('#furBtn');
function updateFurControl(){const enabled=furEnabled(config.appearance);furBtn.textContent=furLabel(enabled);furBtn.setAttribute('aria-pressed',String(enabled));furBtn.setAttribute('aria-label',enabled?'Disattiva pelliccia':'Attiva pelliccia');}
updateFurControl();
furBtn.onclick=async()=>{if(furBtn.disabled)return;furBtn.disabled=true;const old=config,updated={...config,appearance:{...config.appearance,furEnabled:!furEnabled(config.appearance)}};renderer.setConfig(updated);config=updated;updateFurControl();try{const response=await fetch('/api/config',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(updated)});if(!response.ok)throw Error('config persistence failed');const data=await response.json();if(!data?.config)throw Error('missing config');config=data.config;renderer.setConfig(config);}catch(e){config=old;renderer.setConfig(old);stateText.textContent='Pelliccia non salvata';}finally{updateFurControl();furBtn.disabled=false;}};
const presence=new AudioPresence(remoteAudio,v=>{meter.style.width=`${Math.round(v*100)}%`;renderer.setSpeech(v)});
const localMode=()=>boot?.ai?.provider!=='openai';
const runtimeEls=(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/install.css';document.head.append(link);const panel=document.createElement('section');panel.id='installPanel';panel.className='install-panel hidden';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.innerHTML='<div class="install-head"><strong id="availabilityTitle">Teddy si prepara</strong><span id="availabilityBadge">installazione</span></div><p id="availabilityBody">Verifico i motori locali.</p><div id="artifactList" class="artifact-list"></div><div class="install-actions"><button id="runtimeRetry" class="hidden" type="button">Riprova installazione</button></div>';$('#statusPanel').after(panel);return{panel,title:panel.querySelector('#availabilityTitle'),badge:panel.querySelector('#availabilityBadge'),body:panel.querySelector('#availabilityBody'),list:panel.querySelector('#artifactList'),retry:panel.querySelector('#runtimeRetry')}})();
function runtimeReady(){return !localMode()||availability?.ready===true}
function applyAvailability(a){availability=a||availability;if(!localMode()){runtimeEls.panel.classList.add('hidden');talkBtn.disabled=false;talkBtn.classList.remove('hidden');textChat?.update();return}renderAvailability(availability||{},runtimeEls);boot.ai.configured=Boolean(availability?.ready);const installing=availability?.availability==='installazione',canRetry=!availability?.ready&&!installing;runtimeEls.retry.classList.toggle('hidden',!canRetry);runtimeEls.retry.disabled=runtimeRetryBusy;talkBtn.disabled=!runtimeReady()&&!localAbort;talkBtn.classList.toggle('hidden',!runtimeReady()&&!localAbort);stateText.textContent=availability?.ready?'locale · pronto':installing?`locale · ${availability.installPhase||'installazione'}`:'locale · non disponibile';textChat?.update();if(availability?.engines?.llm?.healthy)runtimeEls.panel.classList.add('hidden')}
async function refreshAvailability(){if(!localMode())return;try{const r=await fetch('/api/availability',{cache:'no-store'});if(r.ok)applyAvailability(await r.json())}catch{}}
async function retryLocalRuntime(){if(!localMode()||runtimeRetryBusy)return;runtimeRetryBusy=true;runtimeEls.retry.disabled=true;stateText.textContent='locale · riprovo';try{const r=await fetch('/api/runtime/retry',{method:'POST'});let body=null;try{body=await r.json()}catch{}if(!(r.ok||r.status===202))throw Object.assign(new Error(body?.error||'local_runtime_retry_failed'),{code:body?.error||'local_runtime_retry_failed'});if(body?.availability)applyAvailability(body);hideConnectionNotice()}catch(e){showProblem({error:e.code||e.message||'local_runtime_retry_failed',kind:'local'})}finally{runtimeRetryBusy=false;runtimeEls.retry.disabled=false;await refreshAvailability()}}
runtimeEls.retry.onclick=retryLocalRuntime;
applyAvailability(availability);if(localMode())setInterval(refreshAvailability,1000);
$('#health').textContent='online';$('#health').classList.add('online');if(!localMode()&&!boot.secret.configured)showKeyDialog();

function showKeyDialog(replace=false){$('#keyError').textContent='';$('#apiKey').value='';onboarding.querySelector('h1').textContent=replace?'Sostituisci la chiave OpenAI':'Collega OpenAI';onboarding.classList.remove('hidden');setTimeout(()=>$('#apiKey').focus(),80)}
$('#saveKey').onclick=async()=>{const key=$('#apiKey').value.trim();const btn=$('#saveKey');btn.disabled=true;try{const r=await fetch('/api/secrets/openai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key})});const body=await r.json();if(r.ok){boot.secret=body.secret;onboarding.classList.add('hidden');textChat?.update()}else $('#keyError').textContent='La chiave non sembra valida.'}catch{$('#keyError').textContent='Non riesco a salvare la chiave. Riprova.'}finally{btn.disabled=false}};
$('#closeKey').onclick=()=>onboarding.classList.add('hidden');
$('#noticeClose').onclick=()=>hideConnectionNotice();
function hideConnectionNotice(){notice.classList.add('hidden')}
function showProblem(problem={}){lastConnectionProblem={...problem,at:new Date().toISOString()};const g=connectionGuidance(problem);noticeTitle.textContent=g.title;noticeBody.textContent=problem.error==='local_runtime_not_ready'?'Teddy locale non ha ancora superato installazione e self-test. Segui lo stato degli artefatti pubblici.':g.message;notice.classList.remove('hidden');noticeDiag.onclick=()=>openView('diagnostics');noticePrimary.textContent=problem.kind==='text'?'Chiudi':'Riprova';noticePrimary.onclick=()=>problem.kind==='text'?hideConnectionNotice():problem.kind==='local'&&!runtimeReady()?retryLocalRuntime():startTalk()}
async function saveTurn(role,text){if(!conversationId||!text?.trim())return;await fetch('/api/turns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId,role,text})}).catch(()=>{})}
async function ensureConversation(){if(!conversationId)conversationId=(await (await fetch('/api/conversations',{method:'POST'})).json()).id;return conversationId}
async function endConversation(){const id=conversationId;conversationId=null;if(id)await fetch(`/api/conversations/${id}/end`,{method:'POST'}).catch(()=>{})}
function cancelLocalTurn(){if(!localAbort)return false;const ac=localAbort;localAbort=null;turnGeneration++;ac.abort();presence.stop();renderer.setListening(0);talkBtn.textContent='Parla con Teddy';talkBtn.classList.remove('live');talkBtn.disabled=!runtimeReady();stateText.textContent='interrotto';return true}
async function primeLocalOutput(){try{const ctx=await presence.context();if(ctx.state!=='running')throw Object.assign(new Error('audio_output_blocked'),{code:'audio_output_blocked'});return ctx}catch(e){if(e?.code)throw e;throw Object.assign(new Error('audio_output_unavailable'),{code:'audio_output_unavailable',cause:e})}}
async function startLocalTurn(){
  if(!runtimeReady()){showProblem({error:'local_runtime_not_ready',kind:'local'});await refreshAvailability();return}
  try{await primeLocalOutput()}catch(e){showProblem({error:e.code||'audio_output_unavailable',kind:'audio'});return}
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
textChat=installTextChat({boot,getAvailability:()=>availability,getConversationId:()=>conversationId,setConversationId:id=>{conversationId=id},showProblem,showKeyDialog:()=>showKeyDialog(),setState:value=>{stateText.textContent=value}});

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function closeMenu(){document.querySelector('#secondaryNav').classList.add('hidden');$('#settingsBtn').setAttribute('aria-expanded','false')}
function toggleMenu(){const nav=$('#secondaryNav'),show=nav.classList.contains('hidden');nav.classList.toggle('hidden',!show);$('#settingsBtn').setAttribute('aria-expanded',String(show));if(show)drawer.classList.add('hidden')}
async function openView(name){closeMenu();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='talk'){drawer.classList.add('hidden');return}drawer.classList.remove('hidden');
 if(name==='movimento'){renderMotionPanel(drawer,{onMove:routine=>{renderer.clearMotion();return renderer.enqueueMotion({routine,source:'user'})},onStop:()=>renderer.clearMotion(),onReset:()=>renderer.resetMotion(),status:()=>renderer.motionStatus(),backend:renderer.backend});}
 if(name==='history'){const d=await (await fetch('/api/history?limit=160')).json();drawer.innerHTML=`<h2>Cronologia</h2>${d.turns.map(t=>`<article class="turn ${esc(t.role)}"><small>${esc(t.role)}</small><p>${esc(t.text)}</p></article>`).join('')||'<p class="muted">Ancora nessuna conversazione.</p>'}`}
 if(name==='memory'){const d=await (await fetch('/api/memories')).json();drawer.innerHTML=`<h2>Memoria</h2><form id="memoryForm"><input id="memoryText" maxlength="4000" placeholder="Ricordati che…"><button class="primary">Aggiungi</button></form>${d.memories.map(m=>`<div class="memory"><div>${esc(m.text)}</div><button data-del="${m.id}">dimentica</button></div>`).join('')}`;$('#memoryForm').onsubmit=async e=>{e.preventDefault();const text=$('#memoryText').value.trim();if(text){await fetch('/api/memories',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});openView('memory')}};drawer.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{await fetch(`/api/memories/${b.dataset.del}`,{method:'DELETE'});openView('memory')})}
 if(name==='studio'){
   if(localMode())drawer.innerHTML='<h2>Lingua</h2><p class="muted">Motore locale attivo. Il testo viene elaborato sul computer, senza fallback OpenAI.</p><p class="muted">Per scegliere OpenAI riavvia Teddy con <code>TEDDY_PROVIDER=openai</code>.</p>';
   else{drawer.innerHTML='<h2>Lingua</h2><p class="muted">Provider: OpenAI API. La chiave rimane sul server locale.</p><div class="buttonline"><button id="replaceKey" type="button">Sostituisci chiave</button><button id="removeKey" type="button">Rimuovi chiave</button></div>';
     $('#replaceKey').onclick=()=>showKeyDialog(true);$('#removeKey').onclick=async()=>{const response=await fetch('/api/secrets/openai',{method:'DELETE'});if(!response.ok){showProblem({error:'openai_key_delete_failed',kind:'text'});return}boot.secret=(await response.json()).secret;textChat?.update();await openView('studio')};
   }
 }
 if(name==='diagnostics'){await refreshAvailability();drawer.innerHTML=`<h2>Diagnostica</h2><div class="diagnostic">${esc(JSON.stringify({provider:boot.ai,availability,secret:{configured:boot.secret.configured},persistence:boot.persistence,realtime:boot.realtime,lastProblem:lastConnectionProblem,lastLocalMetrics,renderer:renderer.backend,visualSkin:renderer.implicitSkinStatus?.(),visualQuality:latestVisualQuality,motion:renderer.motionStatus?.()},null,2))}</div>`}
 const closer=document.createElement('button');closer.id='closeDrawer';closer.type='button';closer.className='drawer-close';closer.textContent='Chiudi';closer.onclick=()=>openView('talk');drawer.prepend(closer);
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>openView(b.dataset.view));$('#settingsBtn').onclick=toggleMenu;
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(!onboarding.classList.contains('hidden'))onboarding.classList.add('hidden');else if(!notice.classList.contains('hidden'))hideConnectionNotice();else if(!$('#secondaryNav').classList.contains('hidden'))closeMenu();else if(!drawer.classList.contains('hidden'))openView('talk')});

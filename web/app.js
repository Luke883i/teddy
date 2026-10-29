import {TeddyRenderer} from './teddy/render.js';
import {connectionGuidance} from './connection.js';
import {renderAvailability} from './availability.js';
import {renderMotionPanel} from './teddy/motion-panel-v12.js';
import {furEnabled,furLabel} from './teddy/fur-material-v12.js';
import {installTextChat} from './text-chat-v17.js';
import {fetchWithCsrf} from './fetch-with-csrf-v41.js';

const $=s=>document.querySelector(s),drawer=$('#drawer'),onboarding=$('#onboarding'),stateText=$('#stateText');
const csrfHeaders=()=>({'x-teddy-csrf':boot?.security?.csrfToken||''});
const protectedFetch=(url,init)=>fetchWithCsrf(url,init,{boot});
const notice=$('#connectionNotice'),noticeTitle=$('#connectionTitle'),noticeBody=$('#connectionBody'),noticePrimary=$('#connectionPrimary'),noticeDiag=$('#connectionDiagnostics');
let boot,config,conversationId=null,lastConnectionProblem=null,availability=null,runtimeRetryBusy=false,textChat=null;
try{const r=await fetch('/api/bootstrap');if(!r.ok)throw Error(`bootstrap ${r.status}`);boot=await r.json();config=boot.config;availability=boot.availability||null}catch(e){$('#health').textContent='offline';stateText.textContent='server non disponibile';throw e}
// Language interaction must be available independently of the graphical scene lifecycle.
textChat=installTextChat({boot,getAvailability:()=>availability,getConversationId:()=>conversationId,setConversationId:id=>{conversationId=id},showProblem,showKeyDialog:()=>showKeyDialog(),setState:value=>{stateText.textContent=value}});
const renderer=new TeddyRenderer($('#scene'),config);renderer.start();
const visualBadge=$('#visualBackend');
let latestVisualQuality=null;
function updateVisualBadge(){
  const info=renderer.implicitSkinStatus?.()||null;
  const fallback=renderer.backend!=='webgl2'||!!info?.fallbackReason;
  const label=renderer.backend==='canvas2d'?'Canvas2D · ripiego':
    info?.fallbackReason?'WebGL2 · ripiego':
    info?.active?(info.mode==='anatomical-pelt-v21'?'WebGL2 · anatomia articolata':'WebGL2 · mesh fusa'):'WebGL2 · preparazione';
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
furBtn.onclick=async()=>{if(furBtn.disabled)return;furBtn.disabled=true;const old=config,updated={...config,appearance:{...config.appearance,furEnabled:!furEnabled(config.appearance)}};renderer.setConfig(updated);config=updated;updateFurControl();try{const response=await protectedFetch('/api/config',{method:'PUT',headers:{'content-type':'application/json',...csrfHeaders()},body:JSON.stringify(updated)});if(!response.ok)throw Error('config persistence failed');const data=await response.json();if(!data?.config)throw Error('missing config');config=data.config;renderer.setConfig(config);}catch(e){config=old;renderer.setConfig(old);stateText.textContent='Pelliccia non salvata';}finally{updateFurControl();furBtn.disabled=false;}};
const localMode=()=>boot?.ai?.provider==='local';
const runtimeEls=(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/install.css';document.head.append(link);const panel=document.createElement('section');panel.id='installPanel';panel.className='install-panel hidden';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.innerHTML='<div class="install-head"><strong id="availabilityTitle">Preparo la chat</strong><span id="availabilityBadge">installazione</span><button id="installClose" class="install-close" type="button" aria-label="Chiudi dettagli modello">✕</button></div><p id="availabilityBody">Verifico il modello linguistico locale.</p><p id="runtimeFacts" class="runtime-facts"></p><details id="artifactDetails"><summary>Dettagli installazione</summary><div id="artifactList" class="artifact-list"></div></details><div class="install-actions"><button id="runtimeRetry" class="hidden" type="button">Riprova installazione</button></div>';$('#statusPanel').after(panel);return{panel,title:panel.querySelector('#availabilityTitle'),badge:panel.querySelector('#availabilityBadge'),body:panel.querySelector('#availabilityBody'),list:panel.querySelector('#artifactList'),retry:panel.querySelector('#runtimeRetry'),close:panel.querySelector('#installClose'),facts:panel.querySelector('#runtimeFacts')}})();
let modelDetailsOpen=false,modelDetailsDismissed=false;
const modelDetailsBtn=$('#modelDetailsBtn');
function closeModelDetails({focus=false}={}){
  modelDetailsOpen=false;modelDetailsDismissed=true;
  runtimeEls.panel.classList.add('hidden');modelDetailsBtn.setAttribute('aria-expanded','false');
  if(focus)modelDetailsBtn.focus();
}
function openModelDetails(){
  if(!localMode())return;
  modelDetailsOpen=true;modelDetailsDismissed=false;
  textChat?.closeHistory();
  drawer.classList.add('hidden');
  runtimeEls.panel.classList.remove('hidden');modelDetailsBtn.setAttribute('aria-expanded','true');
  runtimeEls.close.focus();
}
runtimeEls.close.onclick=()=>closeModelDetails({focus:true});
modelDetailsBtn.onclick=()=>{
  if(modelDetailsOpen||!runtimeEls.panel.classList.contains('hidden'))closeModelDetails({focus:true});
  else openModelDetails();
};
window.addEventListener('teddy:history-open',()=>{if(!runtimeEls.panel.classList.contains('hidden'))closeModelDetails()});
function applyAvailability(a){
  availability=a||availability;
  if(!localMode()){
    runtimeEls.panel.classList.add('hidden');modelDetailsBtn.classList.add('hidden');
    textChat?.update();return;
  }
  renderAvailability(availability||{},runtimeEls);
  const ready=availability?.textReady===true||boot.ai.mock===true;
  boot.ai.configured=Boolean(ready);
  modelDetailsBtn.classList.remove('hidden');
  modelDetailsBtn.setAttribute('aria-label',ready?'Modello locale pronto: apri dettagli':'Stato del modello locale: apri dettagli');
  const installing=availability?.availability==='installazione',canRetry=!ready&&!installing;
  runtimeEls.retry.classList.toggle('hidden',!canRetry);
  runtimeEls.retry.disabled=runtimeRetryBusy;
  stateText.textContent=ready?'locale · pronto':installing?`locale · ${availability.installPhase||'installazione'}`:'locale · non disponibile';
  textChat?.update();
  const visible=modelDetailsOpen||(!modelDetailsDismissed&&!ready);
  runtimeEls.panel.classList.toggle('hidden',!visible);
  modelDetailsBtn.setAttribute('aria-expanded',String(visible));
}
async function refreshAvailability(){if(!localMode())return;try{const r=await fetch('/api/availability',{cache:'no-store'});if(r.ok)applyAvailability(await r.json())}catch{}}
async function retryLocalRuntime(){if(!localMode()||runtimeRetryBusy)return;runtimeRetryBusy=true;runtimeEls.retry.disabled=true;stateText.textContent='locale · riprovo';try{const r=await protectedFetch('/api/runtime/retry',{method:'POST',headers:csrfHeaders()});let body=null;try{body=await r.json()}catch{}if(!(r.ok||r.status===202))throw Object.assign(new Error(body?.error||'local_runtime_retry_failed'),{code:body?.error||'local_runtime_retry_failed'});if(body?.availability)applyAvailability(body);hideConnectionNotice()}catch(e){showProblem({error:e.code||e.message||'local_runtime_retry_failed',kind:'local'})}finally{runtimeRetryBusy=false;runtimeEls.retry.disabled=false;await refreshAvailability()}}
runtimeEls.retry.onclick=retryLocalRuntime;
applyAvailability(availability);setInterval(refreshAvailability,1000);
window.addEventListener('teddy:provider-changed',event=>{const data=event.detail;availability=data.availability;applyAvailability(availability);if(data.ai.provider==='openai'&&!data.secret.configured)showKeyDialog();else onboarding.classList.add('hidden');stateText.textContent=data.ai.provider==='vireonix'?'Vireonix · remoto':data.ai.provider==='openai'?'OpenAI · remoto':'Qwen · locale';});
window.addEventListener('teddy:provider-switch-failed',event=>{const failure=event.detail||{};lastConnectionProblem={kind:'provider_switch',attemptedProvider:failure.attemptedProvider||null,activeProvider:failure.activeProvider||boot.ai.provider,error:failure.error||'provider_switch_failed',status:failure.status||0,at:new Date().toISOString()}});
$('#health').textContent='server online';$('#health').classList.add('online');if(boot.ai.provider==='openai'&&!boot.secret.configured)showKeyDialog();

function showKeyDialog(replace=false){$('#keyError').textContent='';$('#apiKey').value='';onboarding.querySelector('h1').textContent=replace?'Sostituisci la chiave OpenAI':'Collega OpenAI';onboarding.classList.remove('hidden');setTimeout(()=>$('#apiKey').focus(),80)}
$('#saveKey').onclick=async()=>{const key=$('#apiKey').value.trim();const btn=$('#saveKey');btn.disabled=true;try{const r=await protectedFetch('/api/secrets/openai',{method:'POST',headers:{'content-type':'application/json',...csrfHeaders()},body:JSON.stringify({key})});const body=await r.json();if(r.ok){boot.secret=body.secret;onboarding.classList.add('hidden');textChat?.update()}else $('#keyError').textContent='La chiave non sembra valida.'}catch{$('#keyError').textContent='Non riesco a salvare la chiave. Riprova.'}finally{btn.disabled=false}};
$('#closeKey').onclick=()=>onboarding.classList.add('hidden');
$('#noticeClose').onclick=()=>hideConnectionNotice();
function hideConnectionNotice(){notice.classList.add('hidden')}
function showProblem(problem={}){
  lastConnectionProblem={...problem,provider:problem.provider||boot.ai.provider,at:new Date().toISOString()};
  if(boot.interaction?.mode==='text'){hideConnectionNotice();textChat?.reportProblem(lastConnectionProblem);return}
  const g=connectionGuidance(problem);
  noticeTitle.textContent=g.title;
  noticeBody.textContent=problem.error==='local_runtime_not_ready'||problem.error==='local_text_not_ready'
    ?'Questa domanda richiede Qwen, che non è ancora pronto. Le risposte semplici funzionano già; apri Dettagli modello per verifica o installazione.'
    :g.message;
  notice.classList.remove('hidden');
  noticeDiag.onclick=()=>openView('diagnostics');
  const canRetry=localMode()&&availability?.textReady!==true&&['local','text'].includes(problem.kind)&&availability?.installPhase!=='installing';
  noticePrimary.textContent=canRetry?'Riprova installazione':'Chiudi';
  noticePrimary.onclick=()=>canRetry?retryLocalRuntime():hideConnectionNotice();
}
// Step 2 (voice) is deliberately absent from this browser runtime.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function closeMenu(){document.querySelector('#secondaryNav').classList.add('hidden');$('#settingsBtn').setAttribute('aria-expanded','false')}
function toggleMenu(){const nav=$('#secondaryNav'),show=nav.classList.contains('hidden');nav.classList.toggle('hidden',!show);$('#settingsBtn').setAttribute('aria-expanded',String(show));if(show)drawer.classList.add('hidden')}
async function openView(name){closeMenu();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='talk'){drawer.classList.add('hidden');return}drawer.classList.remove('hidden');
 if(name==='movimento'){renderMotionPanel(drawer,{onMove:routine=>{renderer.clearMotion();return renderer.enqueueMotion({routine,source:'user'})},onStop:()=>renderer.clearMotion(),onReset:()=>renderer.resetMotion(),status:()=>renderer.motionStatus(),backend:renderer.backend});}
 if(name==='history'){drawer.classList.add('hidden');textChat?.openHistory();return}
 if(name==='memory'){const d=await (await fetch('/api/memories')).json();drawer.innerHTML=`<h2>Memoria</h2><form id="memoryForm"><input id="memoryText" maxlength="4000" placeholder="Ricordati che…"><button class="primary">Aggiungi</button></form>${d.memories.map(m=>`<div class="memory"><div>${esc(m.text)}</div><button data-del="${m.id}">dimentica</button></div>`).join('')}`;$('#memoryForm').onsubmit=async e=>{e.preventDefault();const text=$('#memoryText').value.trim();if(text){await protectedFetch('/api/memories',{method:'POST',headers:{'content-type':'application/json',...csrfHeaders()},body:JSON.stringify({text})});openView('memory')}};drawer.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{await protectedFetch(`/api/memories/${b.dataset.del}`,{method:'DELETE',headers:csrfHeaders()});openView('memory')})}
 if(name==='studio'){
   if(localMode())drawer.innerHTML='<h2>Lingua</h2><p class="muted">Qwen locale attivo. Il testo rimane sul computer.</p><p class="muted">Puoi cambiare motore dal selettore sotto la chat.</p>';
   else if(boot.ai.provider==='vireonix')drawer.innerHTML='<h2>Lingua</h2><p class="muted">Vireonix remoto: gratuito, senza chiave. Le domande e gli ultimi messaggi pertinenti della conversazione vengono inviati a un servizio esterno. Le memorie globali non vengono inviate.</p><p class="muted">Il servizio puo conservare e utilizzare i dati secondo i propri termini: evita contenuti sensibili. Puoi tornare al motore locale dal selettore sotto la chat.</p>';
   else{drawer.innerHTML='<h2>Lingua</h2><p class="muted">Provider: OpenAI API. La chiave rimane sul server locale.</p><div class="buttonline"><button id="replaceKey" type="button">Sostituisci chiave</button><button id="removeKey" type="button">Rimuovi chiave</button></div>';
     $('#replaceKey').onclick=()=>showKeyDialog(true);$('#removeKey').onclick=async()=>{const response=await protectedFetch('/api/secrets/openai',{method:'DELETE',headers:csrfHeaders()});if(!response.ok){showProblem({error:'openai_key_delete_failed',kind:'text'});return}boot.secret=(await response.json()).secret;textChat?.update();await openView('studio')};
   }
 }
 if(name==='diagnostics'){await refreshAvailability();drawer.innerHTML=`<h2>Diagnostica</h2><div class="diagnostic">${esc(JSON.stringify({provider:boot.ai,availability,secret:{configured:boot.secret.configured},persistence:boot.persistence,browserOrigin:window.location.origin,configuredPublicOrigin:boot.security?.publicOrigin,lastProblem:lastConnectionProblem,renderer:renderer.backend,visualSkin:renderer.implicitSkinStatus?.(),visualQuality:latestVisualQuality,motion:renderer.motionStatus?.()},null,2))}</div>`}
 const closer=document.createElement('button');closer.id='closeDrawer';closer.type='button';closer.className='drawer-close';closer.textContent='Chiudi';closer.onclick=()=>openView('talk');drawer.prepend(closer);
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>openView(b.dataset.view));$('#settingsBtn').onclick=toggleMenu;
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(!onboarding.classList.contains('hidden'))onboarding.classList.add('hidden');else if(!notice.classList.contains('hidden'))hideConnectionNotice();else if(!$('#secondaryNav').classList.contains('hidden'))closeMenu();else if(!runtimeEls.panel.classList.contains('hidden'))closeModelDetails({focus:true});else if(!drawer.classList.contains('hidden'))openView('talk')});

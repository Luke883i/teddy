import {chatLayout} from './chat-layout-v21.js';
import {fetchWithCsrf} from './fetch-with-csrf-v41.js';
import {providerSwitchFeedback,textTurnFeedback} from './enduser-contract-v40.js';
import {requestProviderSwitch,explainProviderSwitchFailure} from './provider-switch-v38.js';
import {comicGeometry,minimumThinkingMs,settleThinking} from './dialogue-pacing-v29.js';
import {cognitiveMotionIntent} from './teddy/cognitive-motion-v31.js';
// Teddy v21: HTTP-backed conversation, persistent paginated history, comic reply placement.
// No synthetic dialogue. The bubble displays only text returned from /api/text/turn or /api/history.
export function installTextChat({boot,getAvailability,getConversationId,setConversationId,showProblem,showKeyDialog,setState}){
  const $=selector=>document.querySelector(selector);
  const form=$('#chatForm'),input=$('#chatInput'),send=$('#sendText'),log=$('#chatLog'),hint=$('#chatHint'),feedback=$('#chatFeedback');
  const history=$('#chatHistoryPanel'),toggle=$('#historyToggle'),historyClose=$('#historyClose'),historyEmpty=$('#chatHistoryEmpty');
  const bubble=$('#teddyBubble'),bubbleText=$('#teddyBubbleText'),bubbleClose=$('#bubbleClose'),bubbleReadAll=$('#bubbleReadAll'),newChat=$('#newChat');
  if([form,input,send,log,hint,history,toggle,historyClose,historyEmpty,bubble,bubbleText,bubbleClose,bubbleReadAll,newChat].some(el=>!el))throw Error('text_chat_surface_missing');
  const local=()=>boot.ai.provider==='local';
  let busy=false,controller=null,historyOpen=false,closed=false,lastCompact=null,explicitSessionChoice=false,lastBubbleConversationId=null;
  let historyLoad=null,historyLoadError=false,pendingRequest=null,recoveryHint=null;
  function setFeedback(message=''){if(!feedback)return;feedback.textContent=message;feedback.classList.toggle('hidden',!message)}
  function reportProblem(problem={}){setFeedback(textTurnFeedback({provider:problem.provider||boot.ai.provider,code:problem.error,status:problem.status}))}
  function applyGeometry(){
    const g=chatLayout(window.innerWidth,window.innerHeight);
    document.documentElement.style.setProperty('--teddy-history-width',g.historyWidth+'px');
    document.documentElement.style.setProperty('--teddy-bubble-width',g.bubbleWidth+'px');
    document.documentElement.style.setProperty('--teddy-composer-width',g.composerWidth+'px');
    // When a browser applies its mobile viewport after module initialization,
    // or a device rotates, never let a formerly desktop sidebar cover Teddy.
    if(g.compact && lastCompact===false && historyOpen)setHistory(false);
    lastCompact=g.compact;
    return g;
  }
  const geometry=applyGeometry();
  const selector=document.createElement('select');selector.id='textProviderSelect';selector.setAttribute('aria-label','Motore linguistico di Teddy');selector.title='Scegli il motore di generazione del testo';
  for(const [value,label] of [['local','Qwen locale'],['vireonix','Vireonix (remoto gratuito)'],['openai','OpenAI (chiave)']]){const option=document.createElement('option');option.value=value;option.textContent=label;selector.append(option)}
  selector.value=boot.ai.provider;
  const control=document.createElement('label');control.className='provider-choice';control.textContent='Motore: ';control.append(selector);
  hint.before(control);
  selector.addEventListener('change',async()=>{
    if(busy){selector.value=boot.ai.provider;return}
    const prior=boot.ai.provider,attempted=selector.value;selector.disabled=true;
    try{
      const data=await requestProviderSwitch(attempted,{csrfToken:boot.security?.csrfToken||'',fetchImpl:(url,init)=>fetchWithCsrf(url,init,{boot})});
      Object.assign(boot,data);boot.ai=data.ai;setFeedback();
      window.dispatchEvent(new CustomEvent('teddy:provider-changed',{detail:data}));update();
    }catch(error){
      selector.value=prior;
      setFeedback(providerSwitchFeedback({attempted,active:prior,code:error?.code,status:error?.status}));
      window.dispatchEvent(new CustomEvent('teddy:provider-switch-failed',{detail:{attemptedProvider:attempted,activeProvider:prior,error:error?.code||'provider_switch_failed',status:error?.status||0}}));
      console.warn('Teddy provider switch denied:',error?.code||'unknown',error?.status||'');
      update();
    }
    finally{selector.disabled=false}
  });
  window.addEventListener('resize',applyGeometry);
  window.visualViewport?.addEventListener('resize',applyGeometry);
  const seenIds=new Set();
  // Step 1 social replies run without Qwen; the server denies unsupported model requests.
  const ready=()=>true;
  function update(){
    const available=ready();
    input.disabled=!available||busy;
    send.disabled=!available&&!busy;
    newChat.disabled=busy;selector.disabled=busy;
    send.textContent=busy?'Annulla':'Invia';
    const modelReady=local()?Boolean(boot.ai.mock||getAvailability()?.textReady===true):Boolean(boot.secret?.configured);
    hint.textContent=(busy?'Teddy sta rispondendo…':recoveryHint?recoveryHint:boot.ai.provider==='vireonix'?'Vireonix · remoto non verificato · dati inviati all’esterno':local()?(boot.ai.mock?'Modalità di prova · nessun modello reale':(modelReady?'Modello locale pronto':getAvailability()?.installPhase==='failed'?'Chat base pronta · Qwen non pronto':'Chat base pronta · Qwen in preparazione')):(modelReady?'OpenAI API collegata':'Chat base pronta · OpenAI non collegata'));
  }
  function positionBalloon(length=0){
    const pos=comicGeometry(window.innerWidth,window.innerHeight,length);
    bubble.style.setProperty('--comic-left',pos.left+'px');
    bubble.style.setProperty('--comic-top',pos.top+'px');
    bubble.style.setProperty('--comic-width',pos.bubbleWidth+'px');
    bubble.style.setProperty('--comic-max-height',pos.maxHeight+'px');
    bubble.style.setProperty('--comic-text-height',pos.textMaxHeight+'px');
    return pos;
  }
  function startThinking(){
    positionBalloon(20);
    bubble.classList.remove('hidden');
    bubble.classList.add('is-thinking');
    bubble.setAttribute('aria-busy','true');
    bubble.setAttribute('aria-label','Teddy sta pensando');
    bubbleText.textContent='';
    bubbleReadAll.classList.add('hidden');
  }
  function refreshBubbleOverflow(){
    if(bubble.classList.contains('hidden'))return;
    const overflow=bubbleText.scrollHeight>bubbleText.clientHeight+2;
    bubbleReadAll.classList.toggle('hidden',!overflow);
    bubbleReadAll.setAttribute('aria-hidden',String(!overflow));
  }
  function showBubble(text,conversationId=null){
    if(typeof text!=='string'||!text.trim())return;
    lastBubbleConversationId=conversationId||getConversationId();
    positionBalloon(text.length);
    bubbleText.textContent=text;
    bubble.classList.remove('is-thinking','hidden');
    bubble.setAttribute('aria-busy','false');
    bubble.setAttribute('aria-label','Ultima risposta di Teddy');
    bubbleText.scrollTop=0;
    refreshBubbleOverflow();
    requestAnimationFrame(refreshBubbleOverflow);
  }
  function hideBubble(){bubble.classList.remove('is-thinking');bubble.setAttribute('aria-busy','false');bubble.classList.add('hidden');bubbleReadAll.classList.add('hidden')}
  function setHistory(open,{focus=false}={}){
    historyOpen=Boolean(open);
    history.classList.toggle('hidden',!historyOpen);
    toggle.setAttribute('aria-expanded',String(historyOpen));
    if(historyOpen){
      window.dispatchEvent(new Event('teddy:history-open'));
      // The previous failure message promises a retry: opening the drawer must actually retry.
      if(historyLoadError&&!historyLoad){historyLoad=restoreHistory().finally(()=>{historyLoad=null})}
      if(focus)historyClose.focus();
    }
    else if(focus)toggle.focus();
  }
  function append(role,text,id=null,conversationId=null){
    if(typeof text!=='string'||!text.trim()||!['user','assistant'].includes(role))return;
    if(id!=null){if(seenIds.has(id))return;seenIds.add(id)}
    const item=document.createElement(role==='assistant'?'button':'article');
    if(role==='assistant'){item.type='button';item.setAttribute('aria-label','Riapri questa conversazione e rileggi Teddy');item.addEventListener('click',()=>{if(busy)return;if(conversationId){explicitSessionChoice=true;setConversationId(conversationId)}showBubble(text,conversationId);input.focus()})}
    item.className='chat-message '+role;
    const who=document.createElement('small');who.textContent=role==='user'?'Tu':'Teddy';
    const message=document.createElement('p');message.textContent=text;
    item.append(who,message);log.append(item);
    historyEmpty.classList.add('hidden');log.scrollTop=log.scrollHeight;
  }
  async function restoreHistory(){
    let before=null,pages=[],pageCount=0;
    try{
      for(;;){
        const path='/api/history?limit=500'+(before?'&before='+encodeURIComponent(before):'');
        const response=await fetch(path,{cache:'no-store'});
        if(!response.ok)throw Error('history_http_'+response.status);
        const payload=await response.json();
        if(!Array.isArray(payload.turns))throw Error('history_invalid_payload');
        const turns=payload.turns;
        if(!turns.length)break;
        const oldest=Number(turns[0]?.id);
        if(!Number.isSafeInteger(oldest)||oldest<1||(before!==null&&oldest>=before))throw Error('history_cursor_invalid');
        pages.push(turns);pageCount++;
        if(turns.length<500)break;
        before=oldest;
      }
      for(let i=pages.length-1;i>=0;i--)for(const turn of pages[i])append(turn.role,turn.text,turn.id,turn.conversation_id);
      const latest=pages[0]?.at(-1);
      if(latest?.conversation_id&&!getConversationId()&&!explicitSessionChoice)setConversationId(latest.conversation_id);
      // Do not auto-display a stored answer as if Teddy had just replied.
      historyLoadError=false;
      historyEmpty.textContent='La prima chiacchiera inizia qui.';
      if(pages.length)historyEmpty.classList.add('hidden');
      return pageCount;
    }catch(error){
      historyLoadError=true;
      historyEmpty.textContent='Cronologia non disponibile. Chiudi e riapri per riprovare.';
      historyEmpty.classList.remove('hidden');
      return 0;
    }
  }
  async function submit(event){
    event.preventDefault();
    if(busy){controller?.abort();return}
    const text=input.value.trim();
    if(!text)return;
    const targetConversation=getConversationId()||null;
    // Retain this identity after an uncertain network failure. A second click
    // must fetch the committed reply, not ask Qwen to create a duplicate.
    if(!pendingRequest||pendingRequest.text!==text||pendingRequest.conversationId!==targetConversation)
      pendingRequest={text,conversationId:targetConversation,requestId:crypto.randomUUID()};
    const requestId=pendingRequest.requestId;
    recoveryHint=null;setFeedback();
    busy=true;controller=new AbortController();const own=controller;
    const started=performance.now();
    startThinking();
    update();
    try{
      const response=await fetchWithCsrf('/api/text/turn',{method:'POST',headers:{'content-type':'application/json','x-teddy-csrf':boot.security?.csrfToken||''},credentials:'same-origin',body:JSON.stringify({text,conversationId:targetConversation,requestId}),signal:own.signal},{boot});
      const body=await response.json();
      if(!response.ok||typeof body.reply!=='string'||!body.reply.trim()||typeof body.conversationId!=='string')throw Object.assign(new Error('text_turn_failed'),{code:body.error||'text_turn_failed',status:response.status});
      await settleThinking({started,signal:own.signal,minimum:minimumThinkingMs(body.semantic?.path,body.reply.length)});
      if(own.signal.aborted)return;
      if(body.requestId!==requestId)throw Object.assign(new Error('text_request_identity_mismatch'),{code:'text_request_identity_mismatch'});
      setConversationId(body.conversationId);
      pendingRequest=null;recoveryHint=null;
      append('user',text,null,body.conversationId);append('assistant',body.reply,null,body.conversationId);
      showBubble(body.reply,body.conversationId);
      // Embodiment is strictly downstream of the genuine persisted HTTP answer.
      const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
      const gesture=cognitiveMotionIntent(body.semantic,{replayed:body.replayed===true,reducedMotion});
      if(gesture)window.dispatchEvent(new CustomEvent('teddy:motion-intent',{detail:gesture}));
      input.value='';setState('pronto a leggere');
    }catch(error){
      hideBubble();
      if(error.name==='AbortError')recoveryHint='Invio interrotto: riprova lo stesso testo oppure controlla la cronologia.';
      else{
        if(error.code==='text_request_conflict'||error.code==='text_request_identity_mismatch')pendingRequest=null;
        showProblem({error:error.code||'text_turn_failed',status:error.status,kind:'text',provider:boot.ai.provider});
        recoveryHint='Risposta non confermata: riprova lo stesso messaggio senza creare duplicati.';
      }
    }finally{
      if(controller===own){busy=false;controller=null;update();if(!input.disabled)input.focus()}
    }
  }
  newChat.addEventListener('click',()=>{
    if(busy)return;
    explicitSessionChoice=true;
    pendingRequest=null;recoveryHint=null;setFeedback();
    setConversationId(null);
    hideBubble();
    bubbleText.textContent='';
    if(window.innerWidth<900)setHistory(false);
    input.value='';
    hint.textContent='Nuova conversazione · scrivi pure';
    input.focus();
  });
  // A corrected/edited message is a NEW intention and must receive a fresh ID.
  input.addEventListener('input',()=>{
    if(pendingRequest&&input.value.trim()!==pendingRequest.text){
      pendingRequest=null;recoveryHint=null;update();
    }
  });
  toggle.addEventListener('click',()=>setHistory(!historyOpen,{focus:true}));
  historyClose.addEventListener('click',()=>setHistory(false,{focus:true}));
  bubbleClose.addEventListener('click',hideBubble);
  bubbleReadAll.addEventListener('click',()=>{
    setHistory(true,{focus:true});
    if(lastBubbleConversationId){explicitSessionChoice=true;setConversationId(lastBubbleConversationId)}
    const matches=Array.from(log.querySelectorAll('.chat-message.assistant'));
    matches.reverse().find(el=>el.querySelector('p')?.textContent===bubbleText.textContent)?.scrollIntoView({block:'nearest'});
  });
  const resizeBalloon=()=>{if(!bubble.classList.contains('hidden'))positionBalloon(bubbleText.textContent.length);refreshBubbleOverflow()};
  window.addEventListener('resize',resizeBalloon);
  function onKeydown(event){
    if(event.key!=='Escape')return;
    // Foreground drawers/menu/dialogs own Escape before the transcript and balloon.
    const front=['#secondaryNav','#drawer','#onboarding','#connectionNotice','#installPanel'];
    if(front.some(q=>{const el=document.querySelector(q);return el&&!el.classList.contains('hidden')}))return;
    if(historyOpen){setHistory(false,{focus:true});event.stopImmediatePropagation()}
    else if(!bubble.classList.contains('hidden')){hideBubble();event.stopImmediatePropagation()}
  }
  document.addEventListener('keydown',onKeydown);
  form.addEventListener('submit',submit);form.dataset.wired='true';
  // Keep Teddy unobstructed: a left dock on wide screens, closed by default on mobile.
  setHistory(geometry.initialHistoryOpen&&ready());
  // A second layout read after CSS/media viewport settling is intentional.
  requestAnimationFrame(()=>{
    const settled=applyGeometry();
    if(settled.compact && historyOpen)setHistory(false);
  });
  update();
  historyLoad=restoreHistory();
  const hydrated=historyLoad.finally(()=>{historyLoad=null});
  return {
    update,reportProblem,
    openHistory:()=>setHistory(true,{focus:true}),
    closeHistory:()=>setHistory(false),
    hydrated,
    close:()=>{if(closed)return;closed=true;controller?.abort();form.removeEventListener('submit',submit);document.removeEventListener('keydown',onKeydown);window.removeEventListener('resize',applyGeometry);window.removeEventListener('resize',resizeBalloon);window.visualViewport?.removeEventListener('resize',applyGeometry)}
  };
}

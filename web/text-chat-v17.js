// Teddy v21: HTTP-backed conversation, persistent paginated history, comic reply placement.
// No synthetic dialogue. The bubble displays only text returned from /api/text/turn or /api/history.
export function installTextChat({boot,getAvailability,getConversationId,setConversationId,showProblem,showKeyDialog,setState}){
  const $=selector=>document.querySelector(selector);
  const form=$('#chatForm'),input=$('#chatInput'),send=$('#sendText'),log=$('#chatLog'),hint=$('#chatHint');
  const history=$('#chatHistoryPanel'),toggle=$('#historyToggle'),historyClose=$('#historyClose'),historyEmpty=$('#chatHistoryEmpty');
  const bubble=$('#teddyBubble'),bubbleText=$('#teddyBubbleText'),bubbleClose=$('#bubbleClose');
  if([form,input,send,log,hint,history,toggle,historyClose,historyEmpty,bubble,bubbleText,bubbleClose].some(el=>!el))throw Error('text_chat_surface_missing');
  const local=boot.ai.provider==='local';
  let busy=false,controller=null,historyOpen=false,closed=false;
  const seenIds=new Set();
  const ready=()=>local?Boolean(boot.ai.mock||getAvailability()?.textReady===true):Boolean(boot.secret?.configured);
  function update(){
    const available=ready();
    input.disabled=!available||busy;
    send.disabled=!available&&!busy;
    send.textContent=busy?'Annulla':'Invia';
    hint.textContent=busy?'Teddy sta rispondendo…':local?(boot.ai.mock?'Modalità di prova · nessun modello reale':(available?'Modello locale pronto · nessuna rete necessaria':'Modello locale non pronto · verifica installazione')):(available?'OpenAI API collegata':'Chiave OpenAI richiesta');
  }
  function showBubble(text){
    if(typeof text!=='string'||!text.trim())return;
    bubbleText.textContent=text;
    bubble.classList.remove('hidden');
    bubble.scrollTop=0;
  }
  function hideBubble(){bubble.classList.add('hidden')}
  function setHistory(open,{focus=false}={}){
    historyOpen=Boolean(open);
    history.classList.toggle('hidden',!historyOpen);
    toggle.setAttribute('aria-expanded',String(historyOpen));
    if(historyOpen){window.dispatchEvent(new Event('teddy:history-open'));if(focus)historyClose.focus()}
    else if(focus)toggle.focus();
  }
  function append(role,text,id=null){
    if(typeof text!=='string'||!text.trim()||!['user','assistant'].includes(role))return;
    if(id!=null){if(seenIds.has(id))return;seenIds.add(id)}
    const item=document.createElement(role==='assistant'?'button':'article');
    if(role==='assistant'){item.type='button';item.setAttribute('aria-label','Rileggi la risposta di Teddy');item.addEventListener('click',()=>showBubble(text))}
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
      for(let i=pages.length-1;i>=0;i--)for(const turn of pages[i])append(turn.role,turn.text,turn.id);
      const latest=pages[0]?.at(-1);
      if(latest?.conversation_id&&!getConversationId())setConversationId(latest.conversation_id);
      const mostRecentAssistant=pages.flat().filter(t=>t.role==='assistant').at(-1);
      // Do not automatically show yesterday's answer as if Teddy just spoke now.
      void mostRecentAssistant;
      return pageCount;
    }catch(error){
      historyEmpty.textContent='Cronologia non disponibile. Riapri per riprovare.';
      historyEmpty.classList.remove('hidden');
      return 0;
    }
  }
  async function submit(event){
    event.preventDefault();
    if(busy){controller?.abort();return}
    const text=input.value.trim();
    if(!text)return;
    if(!ready()){if(local)showProblem({error:'local_text_not_ready',kind:'local'});else showKeyDialog();return}
    busy=true;controller=new AbortController();const own=controller;update();
    try{
      const response=await fetch('/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,conversationId:getConversationId()}),signal:own.signal});
      const body=await response.json();
      if(!response.ok||typeof body.reply!=='string'||!body.reply.trim()||typeof body.conversationId!=='string')throw Object.assign(new Error('text_turn_failed'),{code:body.error||'text_turn_failed'});
      setConversationId(body.conversationId);
      append('user',text);append('assistant',body.reply);
      showBubble(body.reply);
      input.value='';setState('parla quando vuoi');
    }catch(error){
      if(error.name==='AbortError')setState('messaggio interrotto · controlla la cronologia');
      else showProblem({error:error.code||'text_turn_failed',kind:'text'});
    }finally{
      if(controller===own){busy=false;controller=null;update();if(!input.disabled)input.focus()}
    }
  }
  toggle.addEventListener('click',()=>setHistory(!historyOpen,{focus:true}));
  historyClose.addEventListener('click',()=>setHistory(false,{focus:true}));
  bubbleClose.addEventListener('click',hideBubble);
  function onKeydown(event){
    if(event.key!=='Escape')return;
    if(historyOpen){setHistory(false,{focus:true});event.stopImmediatePropagation()}
    else if(!bubble.classList.contains('hidden')){hideBubble();event.stopImmediatePropagation()}
  }
  document.addEventListener('keydown',onKeydown);
  form.addEventListener('submit',submit);form.dataset.wired='true';
  // Keep Teddy unobstructed: a left dock on wide screens, closed by default on mobile.
  setHistory(!window.matchMedia('(max-width: 899px)').matches);
  update();
  const hydrated=restoreHistory();
  return {
    update,
    openHistory:()=>setHistory(true,{focus:true}),
    closeHistory:()=>setHistory(false),
    hydrated,
    close:()=>{if(closed)return;closed=true;controller?.abort();form.removeEventListener('submit',submit);document.removeEventListener('keydown',onKeydown)}
  };
}

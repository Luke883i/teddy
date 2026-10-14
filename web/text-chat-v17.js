// The text surface owns only its browser interaction; the server owns inference and persistence.
export function installTextChat({boot,getAvailability,getConversationId,setConversationId,showProblem,showKeyDialog,setState}){
  const $=s=>document.querySelector(s),form=$('#chatForm'),input=$('#chatInput'),send=$('#sendText'),log=$('#chatLog'),hint=$('#chatHint');
  if(!form||!input||!send||!log||!hint)throw Error('text_chat_surface_missing');
  const local=boot.ai.provider==='local';
  let busy=false,controller=null;
  const ready=()=>local?Boolean(boot.ai.mock||getAvailability()?.engines?.llm?.healthy):Boolean(boot.secret?.configured);
  const update=()=>{
    const available=ready();
    input.disabled=!available||busy;
    send.disabled=!available&&!busy;
    send.textContent=busy?'Annulla':'Invia';
    hint.textContent=busy?'Teddy sta rispondendo…':local?(boot.ai.mock?'Modalità di prova · nessun modello reale':(available?'Modello locale pronto':'Modello locale non pronto')):(available?'OpenAI API collegata':'Chiave OpenAI richiesta');
  };
  function append(role,text){
    const item=document.createElement('article');item.className='chat-message '+role;
    const who=document.createElement('small');who.textContent=role==='user'?'Tu':'Teddy';
    const message=document.createElement('p');message.textContent=text;
    item.append(who,message);log.append(item);log.scrollTop=log.scrollHeight;
  }
  async function submit(event){
    event.preventDefault();
    if(busy){controller?.abort();return}
    const text=input.value.trim();
    if(!text)return;
    if(!ready()){
      if(local)showProblem({error:'local_text_not_ready',kind:'local'});else showKeyDialog();
      return;
    }
    busy=true;controller=new AbortController();const own=controller;update();
    try{
      const response=await fetch('/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,conversationId:getConversationId()}),signal:own.signal});
      const body=await response.json();
      if(!response.ok||typeof body.reply!=='string'||typeof body.conversationId!=='string')throw Object.assign(new Error('text_turn_failed'),{code:body.error||'text_turn_failed'});
      setConversationId(body.conversationId);
      append('user',text);append('assistant',body.reply);
      input.value='';setState('parla quando vuoi');
    }catch(e){
      if(e.name==='AbortError')setState('messaggio interrotto · controlla la cronologia');
      else showProblem({error:e.code||'text_turn_failed',kind:'text'});
    }finally{
      if(controller===own){busy=false;controller=null;update();if(!input.disabled)input.focus()}
    }
  }
  form.addEventListener('submit',submit);
  form.dataset.wired='true';
  update();
  return {update,close:()=>{controller?.abort();form.removeEventListener('submit',submit)}};
}

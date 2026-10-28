// TEST ONLY. No external model request is made; do not use for quality claims.
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 if(url==='https://vireonix.ai/v1/chat/completions'){
  const payload=JSON.parse(options.body);
  const utterance=payload.messages.at(-1)?.content||'';
  const reply=utterance.toLowerCase().includes('cielo')?'Il cielo appare blu perché l’atmosfera diffonde maggiormente la luce blu. Non è magia, è fisica con un certo gusto per la scena.':utterance.toLowerCase().includes('treno')?'Se il treno è in ritardo, puoi sfruttare l’attesa per organizzare il viaggio. Io preferirei la puntualità, ma non comando gli orologi.':'Teddy risponde con calma: ogni domanda merita una frase chiara, non una montagna di parole.';
  return new Response(JSON.stringify({model:'auto',choices:[{index:0,message:{role:'assistant',content:reply},finish_reason:'stop'}]}),{status:200,headers:{'content-type':'application/json'}});
 }
 return nativeFetch(url,options);
};

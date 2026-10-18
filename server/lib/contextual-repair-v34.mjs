// V34 narrow, verifiable contextual explanation: no simulated knowledge or LLM impersonation.
// Only repairs the actual last committed deterministic arithmetic reply.
import {groundedTurn} from './grounded-reasoner-v32.mjs';
const s=x=>String(x??'').normalize('NFKC').trim();
const trigger=/^(?:non ho capito|spiegati meglio|spiega meglio|puoi chiarire|che intendi|in che senso|non ti seguo|ripeti in modo semplice|puoi essere più chiaro|non è chiaro)[.!?]?$/iu;
const math=/^(?:quanto fa|calcola|quanto vale)\s+([+-]?\d{1,7})\s*([+*x×\/-])\s*([+-]?\d{1,7})\s*\??$/iu;
export function contextualMathRepair({text,history=[]}={}){
 if(!trigger.test(s(text)))return null;
 const h=(Array.isArray(history)?history:[]).slice(-2),user=h[0],assistant=h[1];
 if(user?.role!=='user'||assistant?.role!=='assistant')return null;
 const m=s(user.text).match(math);if(!m)return null;
 const exact=groundedTurn({text:user.text});
 if(!exact||exact.act!=='exact_arithmetic'||s(assistant.text)!==s(exact.reply))return null;
 const a=BigInt(m[1]),b=BigInt(m[3]),op=m[2];let reply='';
 if(op==='+')reply=`Sommo ${a} e ${b}: il risultato è ${a+b}.`;
 else if(op==='-')reply=`Sottraggo ${b} da ${a}: il risultato è ${a-b}.`;
 else if(['*','x','×'].includes(op)){
  if(b>=2n&&b<=6n&&a>=0n&&a<=30n)reply=`${b} gruppi da ${a}: ${Array(Number(b)).fill(a.toString()).join(' + ')} = ${a*b}.`;
  else reply=`È una moltiplicazione: ${a} × ${b} = ${a*b}.`;
 }else if(b===0n)reply='La divisione per zero non è definita: nessun numero, moltiplicato per zero, restituisce un numero diverso da zero.';
 else if(a%b===0n)reply=`Divido ${a} in gruppi da ${b}: il quoziente è ${a/b}.`;
 else reply=`La divisione non è esatta: ${a}/${b} resta una frazione; il risultato non è un intero.`;
 return Object.freeze({act:'clarify_arithmetic',reply,proof:{kind:'contextual_arithmetic_v34',verified:true,source:'previous_committed_turn',authority:'integer_arithmetic'}});
}

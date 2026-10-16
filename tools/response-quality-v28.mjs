// Measured output signals, not a factuality or fluency score.
// Only metadata survives in the public QA artifact, not raw user/model text.
const tokens=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('it-IT').match(/[\p{L}]{4,}/gu)||[];
const stop=new Set(['sono','della','delle','come','cosa','perché','perche','spiega','teddy','questo','quando','dopo','prima','risposta','breve','frase','significa','differenza']);
export function responseQualitySignals(prompt,response){
 const text=String(response??'').trim(),question=String(prompt??'').trim();
 const key=new Set(tokens(question).filter(t=>!stop.has(t)));
 const answer=new Set(tokens(text));
 const intersection=[...key].filter(t=>answer.has(t)).length;
 const reviewFlags=[];
 if(text.length<28)reviewFlags.push('very_short');
 if(text.length>1100)reviewFlags.push('long');
 if(text.toLocaleLowerCase('it-IT')===question.toLocaleLowerCase('it-IT'))reviewFlags.push('verbatim_echo');
 if(/^(?:ciao|salve|non so|non saprei)[.! ]*$/iu.test(text))reviewFlags.push('generic_only');
 return {characters:text.length,words:tokens(text).length,keywords:key.size,lexicalOverlap:key.size?Math.round(100*intersection/key.size)/100:null,reviewFlags};
}

// V32: bounded, conditional inference over explicitly labelled user premises only.
// Never promotes assistant text or unlabelled user assertions to world facts.
const norm=x=>String(x??'').normalize('NFKC').replace(/\s+/gu,' ').trim().toLocaleLowerCase('it-IT');
const term=x=>{const s=norm(x).replace(/[!?.,;:]+$/u,'').trim();return s&&s.length<=90&&!/[\r\n<>{}\[\]]/u.test(s)?s:null};
const goal=x=>{const m=norm(x).replace(/[?!.]+$/u,'').match(/^(?:quindi|allora|ne segue che|segue che|si deduce che|posso dedurre che|posso concludere che|dalle premesse segue|e dunque)\s+(.+)$/u);return m?term(m[1]):null};
function premises(text,history){
 const inputs=[...(Array.isArray(history)?history:[]).filter(x=>x?.role==='user'&&typeof x.text==='string').slice(-12).map(x=>x.text),text],facts=new Map(),rules=[];
 let turns=0;
 for(let i=0;i<inputs.length;i++){
  let accepted=false;
  for(const line of String(inputs[i]??'').normalize('NFKC').split(/[.;\n]+/u).slice(0,16)){
   const s=norm(line),r=s.match(/^se\s+(.+?)\s+allora\s+(.+)$/u);
   if(r){const from=term(r[1]),to=term(r[2]);if(from&&to&&from!==to&&rules.length<24&&!rules.some(x=>x.from===from&&x.to===to)){rules.push({from,to,turn:i});accepted=true}continue}
   const f=s.match(/^(?:premessa|dato|assumi|considera vero|consideriamo vero)\s*:\s*(.+)$/u);
   if(f){const fact=term(f[1]);if(fact&&facts.size<24){facts.set(fact,i);accepted=true}}
  }
  if(accepted)turns++;
 }
 return {facts,rules,turns};
}
export function derivePremises({text='',history=[]}={}){
 const g=goal(text),{facts,rules,turns}=premises(text,history);
 const known=new Map([...facts].map(([v,t])=>[v,{depth:0,turns:[t]}]));let steps=0;
 for(let round=0;round<6;round++){let added=0;
  for(const rule of rules){if(known.has(rule.to)||!known.has(rule.from)||known.size>=48)continue;
   const parent=known.get(rule.from);
   known.set(rule.to,{depth:parent.depth+1,turns:[...new Set([...parent.turns,rule.turn])].slice(0,12)});
   added++;steps++;
  }if(!added)break;
 }
 const conflict=[...known.keys()].some(x=>x.startsWith('non ')&&known.has(x.slice(4)));
 const provable=g!==null&&known.has(g);
 return Object.freeze({schema:'teddy.reasoner.v1',goal:g,premiseCount:facts.size,ruleCount:rules.length,reached:known.size,steps,conflict,provable,depth:provable?known.get(g).depth:null,premiseTurnCount:turns,source:'explicit_user_premises_only',authority:'conditional_not_external_truth'});
}
function arithmetic(text){
 const m=norm(text).match(/^(?:quanto fa|calcola|quanto vale)\s+([+-]?\d{1,7})\s*([+*x×\/-])\s*([+-]?\d{1,7})\s*\??$/u);if(!m)return null;
 const a=BigInt(m[1]),b=BigInt(m[3]);if(a>1000000n||a< -1000000n||b>1000000n||b< -1000000n)return null;
 let v;if(m[2]==='+')v=a+b;else if(m[2]==='-')v=a-b;else if(['*','x','×'].includes(m[2]))v=a*b;
 else {if(b===0n)return {status:'invalid',reply:'Non si può dividere per zero.'};
   if(a%b!==0n)return {status:'solved',reply:'Il risultato esatto è '+a+'/'+b+'.'};
   v=a/b}
 return {status:'solved',reply:'Fa '+v+'.'};
}
export function groundedTurn({text,history=[]}={}){
 const a=arithmetic(text);
 if(a)return Object.freeze({act:'exact_arithmetic',reply:a.reply,proof:{kind:'exact_arithmetic',status:a.status,authority:'integer_arithmetic'}});
 const d=derivePremises({text,history});
 if(!d.goal||!d.premiseCount)return null;
 const proof={kind:'premise_chaining',status:d.conflict?'conflict':d.provable?'proved':'not_proved',premiseCount:d.premiseCount,ruleCount:d.ruleCount,depth:d.depth,steps:d.steps,authority:d.authority};
 if(d.conflict)return Object.freeze({act:'premise_conflict',reply:'Le premesse dichiarate si contraddicono. Bisogna chiarirle prima di dedurre.',proof});
 if(d.provable)return Object.freeze({act:'premise_entailment',reply:'Sì, segue dalle premesse dichiarate. Questo non verifica i fatti del mondo.',proof});
 return Object.freeze({act:'premise_nonentailment',reply:'Non segue dalle premesse dichiarate: manca un collegamento logico. Non posso inventarlo.',proof});
}

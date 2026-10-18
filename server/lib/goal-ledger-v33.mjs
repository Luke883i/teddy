// Teddy v33: evidence-scoped dialogue control. Bounded, explainable, no background state.
// This never turns model statements into user premises or instructions.
const tidy=v=>String(v??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
const fold=v=>tidy(v).toLocaleLowerCase('it-IT');
const reset=/^(?:nuovo problema|nuovo ragionamento|cambia problema|cambiamo problema|azzera le premesse|azzeriamo le premesse|ricominciamo da zero)(?:\s*[:.!?]|$)/iu;
const retraction=/^(?:ritiro|revoco|annulla|annullo|non vale più)\s+(?:la\s+)?premessa\s*:\s*(.+)$/iu;
const fact=/^(?:premessa|dato|assumi|considera vero|consideriamo vero)\s*:\s*(.+)$/iu;
const key=s=>fold(s).replace(/[!?.,;:]+$/gu,'').trim();
const isUser=x=>x?.role==='user'&&typeof x.text==='string';
export function scopeExplicitPremises(history=[]){
 const turns=(Array.isArray(history)?history:[]).filter(t=>(t?.role==='assistant'||isUser(t))&&typeof t.text==='string').slice(-12);
 let from=0;
 for(let i=0;i<turns.length;i++)if(isUser(turns[i])&&reset.test(tidy(turns[i].text)))from=i+1;
 const active=turns.slice(from),revoked=new Set();
 for(const t of active){if(!isUser(t))continue;
  for(const clause of t.text.split(/[.;\n]+/u)){const m=tidy(clause).match(retraction);if(m)revoked.add(key(m[1]));}
 }
 let suppressed=0;
 const scoped=active.map(t=>{
  if(!isUser(t))return t;
  const segments=t.text.split(/[.;\n]+/u);
  const kept=segments.filter(s=>{
   const r=tidy(s).match(retraction);
   if(r)return false;
   const m=tidy(s).match(fact);
   if(m&&revoked.has(key(m[1]))){suppressed++;return false}
   return true;
  });
  return {...t,text:kept.join('. ')};
 });
 return Object.freeze({turns:scoped,resetCount:from?1:0,revokedCount:revoked.size,suppressed,authority:'explicit_user_turns_only'});
}
const completeQuestion=/^(?:(?:perché|perche|come mai|in che modo|come funziona|per quale motivo)\s+[\s\S]{9,})[?!.]?$/iu;
const unresolved=/^(?:perché|perche|come mai|e quindi|e allora|non ho capito|spiegati meglio|continua)[?!.]?$/iu;
export function dialogueGoal({text='',history=[],workspace=null}={}){
 const current=tidy(text),s=fold(current).replace(/[!?.,;:]+$/u,'').trim();
 const complete=completeQuestion.test(s);
 const shortReference=unresolved.test(s);
 const hasAntecedent=typeof workspace?.antecedent==='string'&&Boolean(workspace.antecedent);
 const move=complete?'self_contained':shortReference&&hasAntecedent?'contextual':shortReference?'missing_context':'self_contained';
 const scope=scopeExplicitPremises(history);
 const why=(/^(?:perché|perche|come mai)\b/iu.test(s));
 const claim={schema:'teddy.goal.v33',move,hasAntecedent:move==='contextual',completeQuestion:complete,
  shouldAskClarification:move==='missing_context',contextPriority:move==='contextual'?'antecedent':'current',
  changedPremises:scope.revokedCount>0||scope.resetCount>0,
  scopedPremiseTurns:scope.turns.filter(isUser).length,
  evidenceAuthority:'user_claims_are_not_world_facts',
  focusHint:why&&complete?'answer_explicit_cause':'answer_current_request'};
 return Object.freeze(claim);
}
export function goalDirective(goal){
 if(!goal||goal.schema!=='teddy.goal.v33')return '';
 if(goal.move==='contextual')return 'La domanda breve riguarda il problema precedente: rispondi al nesso specifico, senza cambiare tema.';
 if(goal.move==='missing_context')return 'Manca la domanda precedente a cui ti riferisci: chiedi una sola precisazione breve, senza inventare ricordi.';
 if(goal.completeQuestion)return 'La domanda è autonoma: rispondi alla sua causa esplicita, ignorando antecedenti non pertinenti.';
 if(goal.changedPremises)return 'Le premesse possono essere state ritirate o sostituite: non dedurre dalle versioni precedenti.';
 return '';
}

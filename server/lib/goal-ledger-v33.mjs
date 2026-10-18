// Teddy v33: evidence-scoped dialogue control. Bounded, explainable, no background state.
// This never turns model statements into user premises or instructions.
const tidy=v=>String(v??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
const fold=v=>tidy(v).toLocaleLowerCase('it-IT');
const reset=/^(?:nuovo problema|nuovo ragionamento|cambia problema|cambiamo problema|azzera le premesse|azzeriamo le premesse|ricominciamo da zero)(?:\s*[:.!?]|$)/iu;
const retraction=/^(?:ritiro|revoco|annulla|annullo|non vale più)\s+(?:la\s+)?premessa\s*:\s*(.+)$/iu;
const fact=/^(?:premessa|dato|assumi|considera vero|consideriamo vero)\s*:\s*(.+)$/iu;
const key=s=>fold(s).replace(/[!?.,;:]+$/gu,'').trim();
const isUser=x=>x?.role==='user'&&typeof x.text==='string';
// V34: chronological evidence repair. A withdrawal invalidates previous instances,
// never future reassertions; the current turn may begin a new cognitive episode.
export function scopeExplicitPremises(history=[],{currentText=''}={}){
 const turns=(Array.isArray(history)?history:[]).filter(t=>(t?.role==='assistant'||isUser(t))&&typeof t.text==='string').slice(-12);
 const currentReset=reset.test(tidy(currentText));
 let from=0;
 for(let i=0;i<turns.length;i++)if(isUser(turns[i])&&reset.test(tidy(turns[i].text)))from=i+1;
 const active=currentReset?[]:turns.slice(from);
 const lastRevocation=new Map();
 for(let i=0;i<active.length;i++){
  if(!isUser(active[i]))continue;
  const parts=active[i].text.split(/[.;\n]+/u);
  for(let j=0;j<parts.length;j++){
   const m=tidy(parts[j]).match(retraction);
   if(m)lastRevocation.set(key(m[1]),[i,j]);
  }
 }
 const resetCount=Number(currentReset||from>0);
 if(!lastRevocation.size)return Object.freeze({turns:active,resetCount,revokedCount:0,suppressed:0,authority:'explicit_user_turns_only'});
 let suppressed=0;
 const scoped=active.map((t,i)=>{
  if(!isUser(t))return t;
  let changed=false;
  const segments=t.text.split(/[.;\n]+/u);
  const kept=segments.filter((fragment,j)=>{
   const clause=tidy(fragment),withdrawal=clause.match(retraction);
   if(withdrawal){changed=true;return false}
   const m=clause.match(fact);
   if(m){
     const at=lastRevocation.get(key(m[1]));
     if(at&&(i<at[0]||(i===at[0]&&j<at[1]))){suppressed++;changed=true;return false}
   }
   return true;
  });
  return changed?{...t,text:kept.join('. ')}:t;
 });
 return Object.freeze({turns:scoped,resetCount,revokedCount:lastRevocation.size,suppressed,authority:'explicit_user_turns_only'});
}
const completeQuestion=/^(?:(?:perché|perche|come mai|in che modo|come funziona|per quale motivo)\s+[\s\S]{9,})[?!.]?$/iu;
const unresolved=/^(?:perché|perche|come mai|e quindi|e allora|non ho capito|spiegati meglio|continua)[?!.]?$/iu;
export function dialogueGoal({text='',history=[],workspace=null}={}){
 const current=tidy(text),s=fold(current).replace(/[!?.,;:]+$/u,'').trim();
 const complete=completeQuestion.test(s);
 const shortReference=unresolved.test(s);
 const hasAntecedent=typeof workspace?.antecedent==='string'&&Boolean(workspace.antecedent);
 const move=complete?'self_contained':shortReference&&hasAntecedent?'contextual':shortReference?'missing_context':'self_contained';
 const scope=scopeExplicitPremises(history,{currentText:text});
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

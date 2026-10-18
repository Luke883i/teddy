// Teddy v34: cheap lexical and pragmatic QA. Signals are NOT semantic truth scores.
const norm=v=>String(v??'').normalize('NFKC').trim();
const nwords=s=>(norm(s).match(/[\p{L}\p{N}]+/gu)||[]).length;
const cliches=/(?:fumo ai camini|fanfare|castelli di fumo|valutazione sensata|entrate teatrali|cerimonie degne|fumo ai|medaglia|il tempo non si allunga|scenografie)/iu;
const contempt=/(?:domanda stupida|sei stupido|non hai capito niente|non perdermi tempo|problema meriti)/iu;
const metaBoilerplate=/(?:come modello linguistico|non sono altro che un modello|ho sentito\s*:)/iu;
const acts=new Set(['identity','greeting','praise','gratitude','thanks','farewell','name_query','retraction','capability','clarify']);
export function lexicalDirective(){
 return 'Prima risolvi la richiesta; poi, solo se naturale, aggiungi un tocco arguto. Italiano concreto, lessico adeguato, senza proverbi o metafore di riempimento. Ringraziamenti e saluti brevi. Una correzione deve correggere, non fare una battuta.';
}
export function lexicalReadback({act,text}={}){
 const v=norm(text),flags=[];
 if(!v)flags.push('empty');
 if(metaBoilerplate.test(v))flags.push('self_meta');
 if(cliches.test(v))flags.push('formulaic_ornament');
 if(contempt.test(v))flags.push('potential_contempt');
 const words=nwords(v);
 if(acts.has(act)&&words>42)flags.push('social_turn_too_long');
 if(['gratitude','thanks','farewell','greeting'].includes(act)&&words>28)flags.push('phatic_turn_overexplained');
 return Object.freeze({schema:'teddy.lexical.v1',words,flags,review:flags.length>0,judgement:'lexical_only_not_semantic_truth'});
}

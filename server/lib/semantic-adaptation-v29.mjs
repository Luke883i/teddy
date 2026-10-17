// v29 semantic policy: bounded style novelty and proportional reasoning depth.
// Never infers real-world facts; never substitutes a scripted answer for an open question.
const words=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('it-IT').match(/[\p{L}\p{N}]+/gu)||[];
function overlap(a,b){
  const aWords=words(a),bWords=words(b);
  if(!aWords.length||!bWords.length)return 0;
  const bigrams=v=>new Set(v.slice(1).map((w,i)=>v[i]+' '+w));
  const aa=bigrams(aWords),bb=bigrams(bWords);
  if(!aa.size||!bb.size)return aWords.join(' ')===bWords.join(' ')?1:0;
  let intersection=0;for(const k of aa)if(bb.has(k))intersection++;
  return intersection/Math.max(1,Math.min(aa.size,bb.size));
}
export function chooseNovelVariant(choices,seed,history=[]){
  if(!Array.isArray(choices)||!choices.length)return null;
  const used=(Array.isArray(history)?history:[]).filter(t=>t?.role==='assistant').slice(-10).map(t=>String(t.text||'').slice(0,1200));
  // Stable hash tie-breaking, but penalize full or near-verbatim recently-used phrases.
  const offset=(parseInt(String(seed).slice(0,8),16)||0)%choices.length;
  const graded=choices.map((text,i)=>{
    const exact=used.some(t=>t.trim()===text.trim())?100:0;
    const similarity=used.reduce((m,t)=>Math.max(m,overlap(text,t)),0);
    return {i,text,score:exact+similarity*10,rank:(i-offset+choices.length)%choices.length};
  }).sort((a,b)=>a.score-b.score||a.rank-b.rank);
  return graded[0].text;
}
export function semanticDepth(text,act='open'){
  if(act!=='open'&&act!=='followup')return 0;
  const t=String(text||'').normalize('NFKC').toLocaleLowerCase('it-IT');
  if(/\b(?:epistemolog\w*|ontolog\w*|paradoss\w*|metafisic\w*|astratt\w*|filosof\w*|dialettic\w*|argoment\w*|obiezion\w*|controesempi\w*|teoria dei giochi|confronta criticamente|analizza in profondità)\b/u.test(t))return 2;
  if(/\b(?:perché|perche|spiega|analizza|confronta|approfondisci|dimostra|ragiona|implicazioni|differenza|come funziona)\b/u.test(t)||t.length>155||act==='followup')return 1;
  return 0;
}
export function semanticDepthDirective(depth){
  return depth>=2
    ? 'Domanda complessa: prima una tesi chiara, poi un motivo, un limite o controesempio e una conclusione. Puoi usare quattro-sei frasi se necessarie; non fingere autorità.'
    : depth===1
    ? 'Spiega in due-quattro frasi: tesi, perché, esempio essenziale. Evita giri di parole.'
    : 'Rispondi in una o due frasi nette e pertinenti; non ripetere formule già usate nella chat.';
}
export function localGenerationSettings(depth=0){
  const d=Math.max(0,Math.min(2,Number(depth)||0));
  return d>=2?{max_tokens:288,temperature:.5,top_p:.9}:
    d===1?{max_tokens:208,temperature:.48,top_p:.9}:{max_tokens:112,temperature:.45,top_p:.9};
}

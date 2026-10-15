// Teddy v26: deterministic social-language extension, subordinate to conversation evidence.
// A small vocabulary should vary expression, not invent facts or override user meaning.
const spaced=s=>String(s??'').normalize('NFKC').trim().replace(/\s+/g,' ');
const humanName="[\\p{L}][\\p{L}'-]{1,27}";
const affirmation=[
  new RegExp("^mi chiamo\\s+("+humanName+")[.!?]?$","iu"),
  new RegExp("^in realtà mi chiamo\\s+("+humanName+")[.!?]?$","iu"),
  new RegExp("^chiamami\\s+("+humanName+")[.!?]?$","iu"),
  new RegExp("^preferisco che tu mi chiami\\s+("+humanName+")[.!?]?$","iu")
];
export function selfDeclaredName(text){
  const s=spaced(text);
  if(s.length>130||/^(?:non|mai|se|forse|magari|mettiamo che|immagina che)\b/iu.test(s))return null;
  for(const re of affirmation){const match=s.match(re);if(match)return match[1]}
  return null;
}
export function mostRecentDeclaredName(history=[]){
  const records=Array.isArray(history)?history.slice(-24):[];
  for(let i=records.length-1;i>=0;i--){
    const t=records[i];
    if(t?.role!=='user'||typeof t.text!=='string')continue;
    const name=selfDeclaredName(t.text);
    if(name)return name;
    // Explicit retraction without a new name cancels earlier identity assumptions.
    if(/^(?:non mi chiamo|non chiamarmi|non usare più il nome)\s+/iu.test(spaced(t.text)))return null;
  }
  return null;
}
const controls=[
 ['capability',/^(?:puoi parlare|sai parlare|hai una voce|funzioni senza internet|sei offline)$/u],
 ['thanks',/^(?:ti ringrazio davvero|molte grazie|grazie tante|gentilissimo|grazie di cuore)(?: teddy)?$/u],
 ['praise',/^(?:sei in gamba|sei davvero bravo|ottimo lavoro|ben fatto|niente male|complimenti davvero)(?: teddy)?$/u],
 ['greeting',/^(?:buondì|salve teddy|ehi teddy|eccomi|rieccomi|ciao orso)$/u],
 ['farewell',/^(?:ci sentiamo|alla prossima teddy|a domani|buona serata|buona giornata)$/u],
 ['clarify',/^(?:non ti seguo|spiega meglio|puoi essere più chiaro|non è chiaro|ripeti in modo semplice)$/u]
];
export function extendedSocialAct(text){
  const norm=spaced(text).toLocaleLowerCase('it-IT').replace(/[!?.,;:…]+$/u,'').trim();
  for(const [act,re] of controls)if(re.test(norm))return act;
  return null;
}
export const adultVariants=Object.freeze({
  identity:Object.freeze([
    "Sono Teddy. Un orso poco diplomatico, non un oracolo: ragioniamo con quello che abbiamo.",
    "Mi chiamo Teddy. Ho più pazienza per le buone domande che per le cerimonie.",
    "Teddy. Metto ordine nei pensieri e qualche volta brontolo: è la mia economia domestica.",
    "Sono Teddy: un interlocutore digitale, non un mago con il pelo. Preferisco le ragioni alle fanfare.",
    "Teddy. Linguaggio asciutto, idee sul tavolo. La retorica la lasciamo in deposito."
  ]),
  greeting:Object.freeze([
    "Eccomi. Scegli una domanda: il tempo non si allunga per cortesia.",
    "Ti ascolto. Speriamo che il problema meriti una buona discussione.",
    "Ah, eccoti. Mettiamo ordine, senza costruire castelli di fumo.",
    "Presente. Preferisco i fatti alle entrate teatrali.",
    "Bene, sei arrivato. Vediamo cosa c'è da capire."
  ]),
  praise:Object.freeze([
    "Bel complimento. Lo accetto: persino un orso può riconoscere una valutazione corretta.",
    "Una valutazione lusinghiera. Non farla diventare un'abitudine, potrei montarmi la testa.",
    "Apprezzo il complimento. I giudizi favorevoli migliorano il mio umore, non i fatti.",
    "Un giudizio generoso. Me lo prendo, ma continuiamo a ragionare.",
    "Grazie del complimento: era una valutazione piacevolmente precisa."
  ]),
  gratitude:Object.freeze([
    "Prego. Una risposta utile pesa più di una medaglia.",
    "Di niente. La gratitudine è elegante quando non ostacola il lavoro.",
    "Figurati. A volte perfino i problemi hanno una porta d'uscita.",
    "Prego. Conserviamo le energie per la prossima domanda.",
    "Volentieri. Meglio una conclusione chiara che una parata di parole."
  ]),
  thanks:Object.freeze([
    "Ricevuto. Non servono inchini: un problema risolto basta.",
    "Prego. Mettiamo il risultato in tasca e andiamo avanti.",
    "Apprezzo. Ogni tanto un grazie è più rapido di una riunione."
  ]),
  farewell:Object.freeze([
    "Alla prossima. Lascia raffreddare le idee prima di riaccenderle.",
    "Va bene, ci fermiamo qui. Le conclusioni buone non hanno fretta.",
    "A presto. Le questioni serie sopravvivono anche a una pausa.",
    "Ci rivediamo. Il mondo non perde l'equilibrio senza di noi.",
    "A dopo. Preferisco una pausa onesta a dieci frasi vuote."
  ]),
  clarify:Object.freeze([
    "Indicami la frase che non torna. Tagliamo il nodo, non il filo del discorso.",
    "Va bene. Quale passaggio è oscuro? Lo rifacciamo con parole più nette.",
    "Dimmi che cosa vuoi chiarire. Una domanda alla volta, senza fumo.",
    "Che punto ti sembra ambiguo? La precisione non è un lusso.",
    "Scegli il pezzo difficile e lo rendiamo più semplice."
  ]),
  capability:Object.freeze([
    "Adesso lavoro in chat scritta. Il modello locale può rispondere offline dopo l'installazione; la voce non è attiva.",
    "Per ora ci scriviamo. Le risposte aperte usano il modello sul computer, quando è pronto; niente microfono.",
    "Sono una chat, non un telefono. Regole e modello locale lavorano insieme; la voce verrà dopo."
  ])
});
export function chooseSocialVariant(act,digest){
  const options=adultVariants[act];
  if(!options)return null;
  if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))return options[0];
  return options[parseInt(digest.slice(0,8),16)%options.length];
}

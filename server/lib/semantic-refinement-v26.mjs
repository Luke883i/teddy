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
 ['identity',/^(?:chi sei teddy|chi sei, teddy|dimmi chi sei|chi sei davvero|presentati teddy)$/u],
 ['name_query',/^(?:sai come mi chiamo|ricordi il mio nome|ti ricordi il mio nome)$/u],
 ['retraction',/^(?:non mi chiamo|non chiamarmi|non usare più il nome)\s+[\p{L}][\p{L}'-]{1,27}$/u],
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
// V34: grounded, brief adult Italian. Character is conveyed by gentle timing,
// not by repetitive insults, self-congratulation or unrelated baroque metaphors.
export const adultVariants=Object.freeze({
  identity:Object.freeze([
    'Sono Teddy, un orsetto digitale. Posso aiutarti a ragionare, ma non so tutto.',
    'Teddy. Non sono un oracolo: se una cosa non la so, preferisco dirtelo.',
    'Mi chiamo Teddy. Poche chiacchiere, domande concrete: ci capiamo meglio.',
    'Sono Teddy. Un po’ burbero, sì, ma ascolto prima di rispondere.',
    'Teddy, presente. Mi piacciono le domande difficili, purché le affrontiamo con metodo.',
    'Sono un orsetto virtuale di nome Teddy. Ragioniamo insieme, senza inventarci certezze.'
  ]),
  greeting:Object.freeze([
    'Ciao. Ti ascolto.',
    'Eccomi. Che hai in mente?',
    'Ehi. Che problema affrontiamo?',
    'Presente. Dimmi pure.',
    'Ciao. Andiamo al punto, con calma.'
  ]),
  praise:Object.freeze([
    'Grazie. Ora non montiamoci la testa.',
    'Apprezzo. Vediamo se me lo merito anche alla prossima domanda.',
    'Grazie, fa piacere. Continuiamo.',
    'Lusingato. Il prossimo ragionamento lo farà vedere.',
    'Me lo prendo, questo complimento. Con moderazione.',
    'Grazie. Preferisco meritarmelo con una risposta utile.'
  ]),
  gratitude:Object.freeze([
    'Prego.',
    'Figurati. Se qualcosa non torna, dimmelo.',
    'Di niente.',
    'Volentieri.',
    'Prego. Possiamo approfondire, se serve.',
    'Ci mancherebbe.'
  ]),
  thanks:Object.freeze([
    'Prego, davvero.',
    'Figurati. Se serve, riprendiamo il punto.',
    'Volentieri. Alla prossima domanda.'
  ]),
  farewell:Object.freeze([
    'A presto.',
    'Ci sentiamo. Porta una bella domanda.',
    'Alla prossima.',
    'Va bene. Riprendiamo quando vuoi.',
    'A dopo, allora.'
  ]),
  clarify:Object.freeze([
    'Dimmi quale passaggio non torna e lo rispiego.',
    'Quale punto è poco chiaro? Lo affrontiamo insieme.',
    'Proviamo con un esempio: da quale frase partiamo?',
    'Dimmi dove ti sei perso: riparto da lì.',
    'Possiamo riformularlo. Quale parte vuoi chiarire?'
  ]),
  retraction:Object.freeze([
    'Ricevuto: non userò più quel nome. Come preferisci che ti chiami?',
    'Corretto. Non userò quel nome: dimmi quello giusto.',
    'Va bene, aggiorno il riferimento. Quale nome preferisci?'
  ]),
  capability:Object.freeze([
    'Qui ti rispondo per iscritto. Le domande aperte richiedono che il modello locale sia pronto.',
    'In questa modalità uso la chat. Non attivo microfono o voce senza una funzione disponibile.',
    'Posso rispondere offline con il modello locale installato; se manca, te lo segnalo.'
  ])
});
export function chooseSocialVariant(act,digest){
  const options=adultVariants[act];
  if(!options)return null;
  if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))return options[0];
  return options[parseInt(digest.slice(0,8),16)%options.length];
}

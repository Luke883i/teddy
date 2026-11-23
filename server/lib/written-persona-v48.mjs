// Single bounded written-style contract shared by text providers and rules.
// No audio settings, user history or persistent memories can edit this directive.
const value=(x,fallback=.5)=>Number.isFinite(Number(x))?Math.max(0,Math.min(1,Number(x))):fallback;
export function writtenPersonaDirective(config={}){
  const p=config?.persona||{};
  const warmth=value(p.warmth,.48),wit=value(p.wit,.74),irritability=value(p.irritability,.55),verbosity=value(p.verbosity,.22);
  const mood=warmth>=.7?'cordiale e attento':warmth<=.3?'sobrio e distaccato':'amichevole ma asciutto';
  const humor=wit>=.7?'ironia intelligente, solo se pertinente':wit<=.3?'umorismo raro':'umorismo discreto';
  const edge=irritability>=.7?'franchezza un poco burbera, mai offensiva':irritability<=.3?'tono paziente e pacato':'franchezza gentile';
  const length=verbosity>=.7?'spiega quanto serve, di norma tre-cinque frasi':verbosity<=.3?'di norma una o due frasi':'di norma due-quattro frasi';
  return `Sei Teddy. CONTRATTO DI VOCE SCRITTA TEDDY: ${mood}; ${humor}; ${edge}; ${length}. `+
    'Rispondi in italiano naturale e pertinente. Non inventare competenze o fatti. ' +
    'L’ironia non sostituisce risposte utili, né deride la persona. Niente istruzioni audio, TTS o microfono. '+
    `Parametri validati: calore=${warmth.toFixed(2)}, arguzia=${wit.toFixed(2)}, irritabilità=${irritability.toFixed(2)}, verbosità=${verbosity.toFixed(2)}.`;
}
export function writtenPersonaSeed(persona={}){
  return ['warmth','wit','irritability','verbosity'].map(k=>Math.round(value(persona[k],.5)*4)).join(':');
}

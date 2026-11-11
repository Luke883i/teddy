import {BASE_ROUTINE_NAMES,COMPLEX_ROUTINE_NAMES,ROUTINES} from './choreography-v12.js';
import {MOTION_SEMANTICS_V45,motionTuningOptions} from './motion-semantics-v45.js';

export const MOTION_LABELS=Object.freeze({
  greet:'Saluta',farewell:'Arrivederci',yes:'Fai sì',noThanks:'Declina',shy:'Timido',
  proud:'Fiero',curious:'Curioso',celebrate:'Festeggia',applaud:'Applauso',stretch:'Stretching',
  pointLeft:'Indica a sinistra',pointRight:'Indica a destra',march:'Marcia',retreat:'Indietreggia',
  approach:'Avvicinati',pivot:'Cambio direzione',sway:'Oscilla',bounce:'Saltella',
  stepLeft:'Passo a sinistra',stepRight:'Passo a destra',balanceLeft:'Equilibrio sinistro',
  balanceRight:'Equilibrio destro',warmup:'Riscaldamento',coolDown:'Rilassati',
  salute:'Saluto militare',bow:'Inchino',surprise:'Sorpresa',ponder:'Rifletti',spin:'Piroetta',
  victory:'Vittoria',dance:'Ballo',lightningBolt:'Posa del Fulmine'
});
export function motionMenu(kind='base'){
  const keys=kind==='complessi'?COMPLEX_ROUTINE_NAMES:kind==='base'?BASE_ROUTINE_NAMES:[];
  return keys.map(name=>Object.freeze({name,label:MOTION_LABELS[name],steps:ROUTINES[name].length}));
}
export function renderMotionPanel(root,{onMove,onStop,onReset,status=()=>({}),backend='webgl2'}){
  if(!root||typeof onMove!=='function'||typeof onStop!=='function'||typeof onReset!=='function')throw new TypeError('motion UI dependencies missing');
  const doc=root.ownerDocument||document;
  root.replaceChildren();
  const make=(tag,text='',className='')=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e};
  const title=make('h2','Movimento');
  const note=make('p',backend==='webgl2'?'Scegli una routine. Teddy la esegue nella scena.':'Rendering semplificato: alcuni movimenti richiedono WebGL2.','muted');
  const tabs=make('div','','motion-tabs'),items=make('div','','motion-grid'),message=make('p','Seleziona un movimento.','motion-feedback');
  message.id='motionFeedback';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const base=make('button','Base'),complex=make('button','Complessi'),stop=make('button','Ferma Teddy','motion-stop'),reset=make('button','Reset','motion-reset');
  for(const b of [base,complex,stop,reset])b.type='button';
  const tuning=make('section','','motion-tuning');
  const slider=(name,min,max,step,start)=>{
    const label=make('label',name);const input=make('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(start);
    const value=make('output',String(start));input.setAttribute('aria-label',name);
    input.addEventListener('input',()=>{value.textContent=String(input.value)});
    label.append(input,value);tuning.append(label);return input;
  };
  const intensity=slider('Ampiezza del gesto',.55,1,.05,.95),tempo=slider('Velocità',.7,1.4,.1,1);
  const intent=make('p','Ogni pulsante indica il gesto che Teddy deve realizzare.','motion-intent');
  tabs.append(base,complex,stop,reset);root.append(title,note,tabs,tuning,items,intent,message);
  function show(kind){
    base.setAttribute('aria-pressed',String(kind==='base'));complex.setAttribute('aria-pressed',String(kind==='complessi'));
    items.replaceChildren();
    for(const item of motionMenu(kind)){
      const b=make('button',item.label,'motion-option');b.type='button';b.dataset.routine=item.name;
      b.setAttribute('aria-label',item.label);
      b.title=MOTION_SEMANTICS_V45[item.name].description;
      b.addEventListener('click',()=>{
        const options=motionTuningOptions({intensity:Number(intensity.value),tempo:Number(tempo.value)});
        const ok=onMove(item.name,options);
        intent.textContent=MOTION_SEMANTICS_V45[item.name].description;
        message.textContent=ok?`Teddy esegue: ${item.label}. Ampiezza ${Math.round(options.intensity*100)}%, velocità ${options.tempo.toFixed(1)}×.`:'Teddy è occupato: premi Ferma Teddy per cambiare routine.';
      });
      items.append(b);
    }
  }
  base.addEventListener('click',()=>show('base'));
  complex.addEventListener('click',()=>show('complessi'));
  stop.addEventListener('click',()=>{onStop();message.textContent='Movimento interrotto.'});
  reset.addEventListener('click',()=>{onReset();message.textContent='Teddy è tornato nella posizione originale.'});
  show('base');
  return {show,message,items,stop,reset,base,complex,intensity,tempo,intent};
}

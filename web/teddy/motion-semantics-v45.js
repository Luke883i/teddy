// V45: explicit, product-facing meaning of each physical motion control.
// Semantic witness names correspond to measured joint/world landmarks, not UI text alone.
const rows=[
 ['greet','social.waveRight','Zampa destra sopra la spalla, oscillazione leggibile e ritorno naturale.','pawHighRight'],
 ['farewell','social.waveLeft','Zampa sinistra alzata, gesto di arrivederci e ritorno naturale.','pawHighLeft'],
 ['yes','head.nod','La testa annuisce con una flessione visibile.','headPitch'],
 ['noThanks','head.shake','La testa ruota lateralmente in segno di rifiuto gentile.','headYaw'],
 ['shy','posture.close','La postura si raccoglie, con testa inclinata e zampe vicine.','close'],
 ['proud','posture.open','Petto aperto, zampe discoste e testa sollevata.','open'],
 ['curious','head.explore','La testa osserva due direzioni diverse.','headYaw'],
 ['celebrate','arms.bothHigh','Entrambe le zampe si alzano per esultare.','bothHigh'],
 ['applaud','arms.clap','Le zampe si avvicinano davanti al petto e si separano.','clap'],
 ['stretch','arms.bothHigh','Entrambe le zampe si allungano sopra le spalle.','bothHigh'],
 ['pointLeft','arm.pointLeft','La zampa sinistra indica chiaramente verso sinistra.','pointLeft'],
 ['pointRight','arm.pointRight','La zampa destra indica chiaramente verso destra.','pointRight'],
 ['march','locomotion.alternate','Passi alternati con opposizione degli arti.','alternateLegs'],
 ['retreat','locomotion.backward','Teddy si sposta all’indietro nello spazio.','worldBackward'],
 ['approach','locomotion.forward','Teddy avanza verso chi guarda.','worldForward'],
 ['pivot','locomotion.pivot','Teddy cambia orientamento invece di girare e annullare la rotazione.','worldTurn'],
 ['sway','posture.sway','Il busto oscilla in direzioni opposte.','spineSway'],
 ['bounce','locomotion.jump','Il corpo si solleva e ricade mantenendo una posa morbida.','worldJump'],
 ['stepLeft','locomotion.lateralLeft','Teddy trasla realmente verso sinistra, non in avanti ruotato.','worldLeft'],
 ['stepRight','locomotion.lateralRight','Teddy trasla realmente verso destra, non in avanti ruotato.','worldRight'],
 ['balanceLeft','balance.leftLegUp','La gamba sinistra si solleva mentre la destra sostiene il corpo.','leftLegUp'],
 ['balanceRight','balance.rightLegUp','La gamba destra si solleva mentre la sinistra sostiene il corpo.','rightLegUp'],
 ['warmup','body.alternate','Zampe alternate e articolazioni in preparazione.','alternateArms'],
 ['coolDown','body.settle','Il busto si distende e le zampe si abbassano.','calm'],
 ['salute','social.forehead','La zampa destra raggiunge la zona laterale della fronte.','pawNearFace'],
 ['bow','body.bow','Teddy inclina il busto in avanti.','spineBow'],
 ['surprise','emotion.open','Zampe aperte, testa e busto reagiscono alla sorpresa.','open'],
 ['ponder','social.chin','La zampa destra si avvicina al mento per riflettere.','pawNearFace'],
 ['spin','locomotion.fullTurn','Teddy completa una rotazione di 360 gradi senza lasciare un orientamento errato.','fullTurn'],
 ['victory','arms.victory','Due zampe sollevate formano una V riconoscibile.','bothHigh'],
 ['dance','body.dance','Il ballo alterna ritmicamente arti e orientamento.','alternateArms'],
 ['lightningBolt','body.asymmetric','Posa asimmetrica marcata, con un braccio alto e uno basso.','asymmetricArms']
];
export const MOTION_SEMANTICS_V45=Object.freeze(Object.fromEntries(rows.map(([name,primitive,description,oracle])=>[name,Object.freeze({name,primitive,description,oracle})])));
export function motionTuningOptions({intensity=.95,tempo=1}={}){
  const safe=(v,lo,hi,d)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d;
  return Object.freeze({intensity:safe(intensity,.55,1,.95),tempo:safe(tempo,.7,1.4,1)});
}

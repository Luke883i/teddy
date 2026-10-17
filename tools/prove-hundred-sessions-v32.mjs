// v32 genuine model campaign: 100 separate HTTP+SQLite conversations.
// NO mock model, NO stand-in LLM judge, NO claim that lexical review is truth.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {responseQualitySignals} from './response-quality-v28.mjs';
const topics=[
 ['gravità','Spiega perché la gravità cambia la traiettoria di un corpo.'],
 ['cielo','Perché il cielo può apparire azzurro?'],
 ['causalità','Qual è la differenza tra correlazione e causalità?'],
 ['batteria','Come funziona una batteria ricaricabile?'],
 ['privacy','Che cosa significa minimizzazione dei dati personali?'],
 ['algoritmo','Come si riconosce un algoritmo da una semplice descrizione?'],
 ['energia','Spiega la differenza tra energia e potenza.'],
 ['memoria','Perché i ricordi umani possono essere inesatti?'],
 ['rischio','Qual è la differenza fra pericolo e rischio?'],
 ['economia','Come si distinguono ricavi e profitto?'],
 ['ecologia','Perché gli ecosistemi dipendono dalla biodiversità?'],
 ['linguistica','In che modo una metafora cambia la comprensione di un testo?'],
 ['matematica','Spiega cosa significa una probabilità del venti per cento.'],
 ['filosofia','Come distinguere una premessa da una conclusione?'],
 ['storia','Qual è il limite di usare una sola fonte storica?'],
 ['medicina','Perché una correlazione non basta a provare una cura?'],
 ['reti','Come arrivano i dati da un computer a un altro?'],
 ['astronomia','Perché vediamo fasi diverse della Luna?'],
 ['software','Qual è il motivo di verificare un programma con test automatici?'],
 ['logica','Come si riconosce un ragionamento circolare?']
];
const variants=['Rispondi al nucleo: ','Senza cambiare tema: ','Fai un esempio concreto: ','Spiega con precisione: ','Distingui ciò che sappiamo da ciò che supponiamo: '];
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
export async function proveHundredSessions({appPort,home}={}){
 const out=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'teddy-v32-real-100');fs.mkdirSync(out,{recursive:true});
 const url='http://127.0.0.1:'+appPort;
 const db=new DatabaseSync(path.join(home,'data','teddy.sqlite'));
 const records=[],conversations=new Set(),failures=[];
 async function turn(text,conversationId=null){
  const requestId=crypto.randomUUID(),started=performance.now();
  const res=await fetch(url+'/api/text/turn',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({text,conversationId,requestId}),signal:AbortSignal.timeout(90000)});
  const body=await res.json();
  assert.equal(res.status,200,JSON.stringify({error:body.error,text}).slice(0,300));
  assert.equal(body.requestId,requestId);assert.equal(body.replayed,false);
  assert.ok(typeof body.reply==='string'&&body.reply.length>=8&&body.reply.length<=4000);
  return {body,latencyMs:Math.round(performance.now()-started)};
 }
 try{
  for(let i=0;i<100;i++){
   const [topic,base]=topics[i%topics.length],variant=variants[Math.floor(i/topics.length)];
   const question=variant+base;
   const first=await turn(question);
   assert.equal(first.body.semantic.path,'model','model routing must be authentic session '+i);
   assert.equal(first.body.provider,'local');
   const id=first.body.conversationId;assert.ok(!conversations.has(id),'session must be isolated '+i);conversations.add(id);
   const quality=responseQualitySignals(question,first.body.reply);
   const sample={n:i+1,topic,variant:Math.floor(i/topics.length),conversationDigest:sha(id).slice(0,16),
    prompt:question,answer:first.body.reply,answerDigest:sha(first.body.reply),modelMs:first.latencyMs,
    firstRoute:first.body.semantic.path,signals:quality,followup:null};
   if(i%5===0||i%5===1){
    const followText=i%5===0?'perché?':'non ho capito';
    const follow=await turn(followText,id);
    assert.equal(follow.body.semantic.path,'model','context repair must use real model '+i);
    sample.followup={prompt:followText,answer:follow.body.reply,latencyMs:follow.latencyMs,route:follow.body.semantic.path,
      signals:responseQualitySignals(question,follow.body.reply)};
   }else if(i%5===2){
    const calc=await turn('quanto fa '+(i+3)+' + 7?',id);
    assert.equal(calc.body.semantic.act,'exact_arithmetic');assert.match(calc.body.reply,new RegExp(String(i+10)));
    sample.followup={prompt:'exact_arithmetic',answer:calc.body.reply,route:calc.body.semantic.path};
   }else if(i%5===3){
    const name=await turn('come mi chiamo?',id);
    assert.equal(name.body.semantic.act,'name_query');assert.match(name.body.reply,/non me lo|non lo ritrovo/i);
    sample.followup={prompt:'name_query_without_evidence',answer:name.body.reply,route:name.body.semantic.path};
   }else {
    const safeName='Persona'+String.fromCharCode(65+Math.floor(i/26))+String.fromCharCode(65+i%26);
    const intro=await turn('Mi chiamo '+safeName,id);
    assert.equal(intro.body.semantic.act,'introduction');
    const recall=await turn('come mi chiamo?',id);assert.match(recall.body.reply,new RegExp(safeName));
    sample.followup={prompt:'name_recall',answer:recall.body.reply,route:recall.body.semantic.path};
   }
   const stored=db.prepare('SELECT role,text FROM turns WHERE conversation_id=? ORDER BY id').all(id);
   assert.ok(stored.length>=4&&stored.at(-1).text===sample.followup.answer,'SQLite mismatch '+i);
   const receipts=db.prepare('SELECT receipt_json FROM semantic_receipts WHERE conversation_id=? ORDER BY id').all(id);
   assert.equal(receipts.length,stored.length/2,'receipt imbalance '+i);
   records.push(sample);
   console.log('TEDDY_V32_REAL_SESSION',JSON.stringify({session:i+1,modelMs:sample.modelMs,chars:sample.answer.length,flags:sample.signals.reviewFlags,followup:sample.followup.prompt}));
  }
  const bad=records.filter(r=>r.signals.reviewFlags.includes('verbatim_echo')||r.signals.reviewFlags.includes('generic_only'));
  const time=records.map(r=>r.modelMs).sort((a,b)=>a-b);
  const report={schema:'teddy.v32.real.100',realModel:true,realHttp:true,syntheticUserPrompts:true,
    actualSessions:records.length,uniqueConversationIds:conversations.size,genuineInitialGenerations:100,
    additionalContextModelGenerations:40,modelLatency:{medianMs:time[49],p95Ms:time[94],maxMs:time[99]},
    genericOrEcho:bad.length,needsHumanReview:records.filter(r=>r.signals.reviewFlags.length).length,
    caveat:'Only basic structural and heuristic review. Human-rated relevance and truth not certified.',
    records};
  fs.writeFileSync(path.join(out,'readback-100.json'),JSON.stringify(report,null,2));
  console.log('TEDDY_V32_REAL_100_PASS',JSON.stringify({sessions:100,modelGenerations:140,medianMs:time[49],p95Ms:time[94],genericOrEcho:bad.length,needsHumanReview:report.needsHumanReview}));
  return report;
 }catch(error){
  failures.push(String(error?.stack||error).slice(0,1600));
  fs.writeFileSync(path.join(out,'readback-100-partial.json'),JSON.stringify({schema:'teddy.v32.real.100',complete:records.length,failures,records},null,2));
  throw error;
 }finally{db.close()}
}

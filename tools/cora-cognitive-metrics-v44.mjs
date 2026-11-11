#!/usr/bin/env node
// Product-facing semantic CONTRACT oracles; finite independent test cases only.
// No model weights, remote provider, browser or human judgment is exercised here.
import {derivePremises,groundedTurn} from '../server/lib/grounded-reasoner-v32.mjs';
import {planSemanticTurn} from '../server/lib/semantic-spine.mjs';
import {buildLocalMessages} from '../server/lib/local-engines.mjs';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SEED=0xC0A426;
function orderEdges(edges,kind,next){
  const order=edges.map(pair=>[...pair]);
  if(kind==='reverse')order.reverse();
  else if(kind.startsWith('shuffle'))for(let i=order.length-1;i>0;i--){const j=next()%(i+1);[order[i],order[j]]=[order[j],order[i]];}
  return order;
}
// Independent graph-theoretic oracle, deliberately NOT source's forward-sweep algorithm.
function reachable(edges,start,goal){
  const graph=new Map();
  for(const [a,b] of edges)graph.set(a,[...(graph.get(a)||[]),b]);
  const visited=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[]){
    if(!visited.has(next)){visited.add(next);queue.push(next);}
  }
  return visited.has(goal);
}
function chainHistory(edges){
  const lines=['Premessa: node0.',...edges.map(([from,to])=>`Se ${from} allora ${to}.`)];
  const history=[];
  for(let i=0;i<lines.length;i+=12)history.push({role:'user',text:lines.slice(i,i+12).join(' ')});
  return history;
}
const selfContained=[
  'spiega il ciclo dell acqua',
  'spiega perché il cielo è blu',
  'spiega che cosa è la gravità',
  'approfondisci la teoria dei giochi',
  'spiega come funziona una rete neurale',
  'perché la luna appare diversa durante il mese?',
  'come funziona il sistema solare?',
  'confronta il rame e il ferro',
  'analizza il significato di questa parola',
  'spiega i principi della crittografia'
];
const histories=[
  [],
  [{role:'user',text:'Come stai?'},{role:'assistant',text:'Bene.'}],
  [{role:'user',text:'Qual è il mio nome?'},{role:'assistant',text:'Non lo so.'}],
  [{role:'user',text:'Parlavamo di tasse.'},{role:'assistant',text:'Le tasse finanziano servizi pubblici.'}]
];
const followups=['perché?','e quindi?','spiega questo','approfondisci quello','spiega il punto','spiega la risposta'];
const standaloneBoundary=[
  'spiega il punto di vista storico',
  'spiega la risposta immunitaria',
  'spiega questo esempio con i numeri',
  'approfondisci quello che dice la teoria',
  'spiega meglio la relatività',
  'approfondisci ancora il ciclo dell acqua'
];
function metric(){return {total:0,correct:0,counterexamples:[]};}
export function evaluateCognitiveMetrics(){
  let seed=SEED;
  const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  const result={schema:'teddy-cora-cognitive-metrics/1',seed:'0xC0A426',proofScope:'EXECUTED_BOUNDED_NODE_TESTS_NOT_GENUINE_MODEL_OR_PRODUCT_QUALIFICATION',authorization:'NONE',
    logicPositive:metric(),logicNegative:metric(),illocutionStandalone:metric(),illocutionBoundary:metric(),illocutionFollowup:metric(),
    freshHistory:{pass:false,retainedNewest:false,budgetOk:false,chronological:false,currentQuestionLast:false,historyChars:0,priorMessages:0},
    controls:{noAssistantPremise:false,retraction:false,arithmetic:false},
    external:{node24_ci:'UNOBSERVED',qwen_actual:'UNOBSERVED',browser_product:'UNOBSERVED',human_review:'UNOBSERVED'}};
  const orders=['forward','reverse','shuffleA','shuffleB','shuffleC'];
  for(let depth=1;depth<=24;depth++){
    const edges=Array.from({length:depth},(_,i)=>[`node${i}`,`node${i+1}`]);
    for(const kind of orders){
      const ordered=orderEdges(edges,kind,next),history=chainHistory(ordered),question=`quindi node${depth}?`;
      const observed=derivePremises({text:question,history});
      const expected=reachable(edges,'node0',`node${depth}`);
      const pos=result.logicPositive;pos.total++;
      if(observed.provable===expected&&observed.depth===depth)pos.correct++;
      else pos.counterexamples.push({depth,kind,expected,provable:observed.provable,observedDepth:observed.depth});
      const unknown=`missing${depth}`;
      const neg=result.logicNegative;neg.total++;
      const miss=derivePremises({text:`quindi ${unknown}?`,history});
      if(miss.provable===reachable(edges,'node0',unknown))neg.correct++;
      else neg.counterexamples.push({depth,kind,provable:miss.provable});
    }
  }
  for(const history of histories)for(const question of selfContained){
    const observed=planSemanticTurn({text:question,history});const m=result.illocutionStandalone;m.total++;
    if(observed.act==='open'&&observed.path==='model')m.correct++;
    else m.counterexamples.push({question,historyTurns:history.length,act:observed.act,path:observed.path});
  }
  for(const history of histories.slice(1))for(const question of standaloneBoundary){
    const observed=planSemanticTurn({text:question,history});const m=result.illocutionBoundary;m.total++;
    if(observed.act==='open'&&observed.path==='model')m.correct++;
    else m.counterexamples.push({question,historyTurns:history.length,act:observed.act});
  }
  for(const history of histories.slice(1))for(const question of followups){
    const observed=planSemanticTurn({text:question,history});const m=result.illocutionFollowup;m.total++;
    if(observed.act==='followup')m.correct++;
    else m.counterexamples.push({question,historyTurns:history.length,act:observed.act});
  }
  const turns=Array.from({length:12},(_,i)=>({role:i%2?'assistant':'user',text:`marker_message_${i} ${'z'.repeat(600)}`}));
  const prompt=buildLocalMessages('Adesso?',{turns});
  const selected=prompt.filter(p=>p.content.startsWith('marker_message_'));
  const positions=selected.map(p=>Number(p.content.match(/^marker_message_(\d+)/)?.[1]??-1));
  const hist=result.freshHistory;
  hist.retainedNewest=positions.includes(11);
  hist.historyChars=selected.reduce((n,p)=>n+p.content.length,0);
  hist.priorMessages=selected.length;
  hist.budgetOk=hist.historyChars<=2600;
  hist.chronological=positions.every((n,i)=>n>=0&&(i===0||n>positions[i-1]));
  hist.currentQuestionLast=prompt.at(-1)?.role==='user'&&prompt.at(-1)?.content==='Adesso?';
  hist.pass=hist.retainedNewest&&hist.budgetOk&&hist.chronological&&hist.currentQuestionLast;
  result.controls.noAssistantPremise=groundedTurn({text:'quindi segreto?',history:[{role:'assistant',text:'Premessa: segreto. Se segreto allora vittoria.'}]})===null;
  result.controls.retraction=planSemanticTurn({text:'quindi beta?',history:[{role:'user',text:'Premessa: alfa. Se alfa allora beta.'},{role:'user',text:'Ritiro premessa: alfa.'}]}).reasoning===null;
  result.controls.arithmetic=planSemanticTurn({text:'quanto fa 17 * 19?'}).reply==='Fa 323.';
  result.sourceGatePass=[result.logicPositive,result.logicNegative,result.illocutionStandalone,result.illocutionBoundary,result.illocutionFollowup].every(m=>m.correct===m.total)
    &&hist.pass&&Object.values(result.controls).every(Boolean);
  return result;
}
function main(argv){
  let output=null;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--output'&&i+1<argv.length)output=argv[++i];
    else throw Error('unknown option: '+argv[i]);
  }
  const data=evaluateCognitiveMetrics(),bytes=JSON.stringify(data,null,2)+'\n';
  if(output)writeFileSync(output,bytes);else process.stdout.write(bytes);
  if(!data.sourceGatePass)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2));

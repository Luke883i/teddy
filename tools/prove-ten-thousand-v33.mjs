// V33: genuine running Teddy Node HTTP/SQLite, 10,000 distinct conversations.
// These turns exercise the real deterministic cognitive runtime; NOT 10k GGUF generations.
// A separate authentic Qwen v32 100-session proof runs in the same model installation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const nameFor=i=>'Persona'+String.fromCharCode(65+Math.floor(i/676)%26,65+Math.floor(i/26)%26,65+i%26);
export async function proveTenThousandTurns({appPort,home}={}){
 const dir=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'teddy-v33-10k');fs.mkdirSync(dir,{recursive:true});
 const url='http://127.0.0.1:'+appPort+'/api/text/turn';
 const db=new DatabaseSync(path.join(home,'data','teddy.sqlite'));
 const evidence={schema:'teddy.v33.real-http.10000',server:'real-node-http',sqlite:'real',llmInThisCampaign:0,
  realSessions:0,realUserTurns:0,verifiedReceipts:0,routeMismatches:0,
  families:{exact_math:0,introduction_recall:0,social:0,zero_division:0,missing_antecedent:0},
  failures:[],latencySamples:[],source:'verified_running_teddy_not_a_mock'};
 async function send(text,conversationId=null){
  const requestId=crypto.randomUUID(),started=performance.now();
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({text,conversationId,requestId}),signal:AbortSignal.timeout(12000)});
  const body=await r.json();assert.equal(r.status,200,JSON.stringify({text,error:body.error}).slice(0,200));
  assert.equal(body.requestId,requestId);assert.equal(body.replayed,false);
  assert.equal(body.semantic.path,'deterministic','this phase must never silently call Qwen');
  assert.ok(body.reply?.trim());evidence.realUserTurns++;
  return {body,ms:Math.round(performance.now()-started)};
 }
 try{
  for(let i=0;i<10000;i++){
   const family=i%5;let first,second,expected;
   if(family===0){
    first=await send('quanto fa '+i+' + 7?');
    assert.equal(first.body.semantic.act,'exact_arithmetic');assert.equal(first.body.reply,'Fa '+(i+7)+'.');
    second=await send('chi sei?',first.body.conversationId);
    assert.equal(second.body.semantic.act,'identity');evidence.families.exact_math++;
   }else if(family===1){
    const name=nameFor(i);
    first=await send('Mi chiamo '+name);
    assert.equal(first.body.semantic.act,'introduction');
    second=await send('come mi chiamo?',first.body.conversationId);
    assert.match(second.body.reply,new RegExp(name));evidence.families.introduction_recall++;
   }else if(family===2){
    first=await send('chi sei?');second=await send('grazie',first.body.conversationId);
    assert.equal(second.body.semantic.act,'gratitude');evidence.families.social++;
   }else if(family===3){
    first=await send('quanto fa 8 / 0?');assert.match(first.body.reply,/zero/);
    second=await send('quanto fa 19 * 23?',first.body.conversationId);
    assert.equal(second.body.reply,'Fa 437.');evidence.families.zero_division++;
   }else {
    first=await send('ciao');second=await send('non ho capito',first.body.conversationId);
    assert.equal(second.body.semantic.act,'clarify');evidence.families.missing_antecedent++;
   }
   assert.equal(first.body.conversationId,second.body.conversationId,'session continuity '+i);
   assert.notEqual(first.body.conversationId,null);
   if(i%25===0){
    const id=first.body.conversationId;
    const turns=db.prepare('SELECT role,text FROM turns WHERE conversation_id=? ORDER BY id').all(id);
    assert.equal(turns.length,4,'pair must be exactly two HTTP turns');
    const receipts=db.prepare('SELECT receipt_json FROM semantic_receipts WHERE conversation_id=? ORDER BY id').all(id);
    assert.equal(receipts.length,2,'every reply must have a receipt');evidence.verifiedReceipts+=2;
    assert.equal(turns[3].text,second.body.reply,'rendered and persisted reply identity');
   }
   evidence.realSessions++;
   if(i%100===0)evidence.latencySamples.push({session:i+1,firstMs:first.ms,secondMs:second.ms});
   if(i%1000===999)console.log('TEDDY_V33_10K_PROGRESS',JSON.stringify({complete:evidence.realSessions,turns:evidence.realUserTurns}));
  }
  assert.equal(evidence.realSessions,10000);assert.equal(evidence.realUserTurns,20000);
  assert.deepEqual(Object.values(evidence.families),[2000,2000,2000,2000,2000]);
  fs.writeFileSync(path.join(dir,'readback-10k.json'),JSON.stringify(evidence,null,2));
  console.log('TEDDY_V33_10K_PASS',JSON.stringify({sessions:evidence.realSessions,turns:evidence.realUserTurns,receiptsChecked:evidence.verifiedReceipts,server:evidence.server,modelCalls:0}));
  return evidence;
 }catch(e){
  evidence.failures.push(String(e?.stack||e).slice(0,1500));
  fs.writeFileSync(path.join(dir,'readback-10k-partial.json'),JSON.stringify(evidence,null,2));
  throw e;
 }finally{db.close()}
}

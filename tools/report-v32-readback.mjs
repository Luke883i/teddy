// Bounded readback of synthetic questions and authentic model replies.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const base=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'teddy-v32-real-100');
const full=path.join(base,'readback-100.json'),partial=path.join(base,'readback-100-partial.json');
const source=fs.existsSync(full)?full:partial;
const short=x=>String(x??'').replace(/[<>\r\n|\x60]/gu,' ').replace(/\s+/gu,' ').slice(0,220);
let out='# Teddy V32 - authentic synthetic-dialogue readback\n\n';
if(!fs.existsSync(source)){
 out+='No 100-session report found; runner may have failed before the model phase.\n';
}else{
 const r=JSON.parse(fs.readFileSync(source,'utf8')),records=r.records||[];
 out+='- Verified distinct sessions: **'+(r.uniqueConversationIds??records.length)+'/100**\n';
 out+='- Genuine model generations: '+((r.genuineInitialGenerations||0)+(r.additionalContextModelGenerations||0))+'\n';
 out+='- Generic/echo flags: '+(r.genericOrEcho??'not computed')+'; heuristic review: '+(r.needsHumanReview??'not computed')+'\n';
 out+='- Report state: '+(fs.existsSync(full)?'complete':'partial/failed')+'. NOT a truth/fluency certificate.\n';
 if(r.failures)out+='- Failure: '+short(JSON.stringify(r.failures))+'\n';
 out+='\n| Session | Topic | Synthetic question | Actual Teddy response | Flags |\n|---|---|---|---|---|\n';
 const indices=[0,1,2,3,4,9,14,19,29,39,49,59,69,79,89,99];
 for(const i of indices){
  const s=records[i];if(!s)continue;
  out+='| '+s.n+' | '+short(s.topic)+' | '+short(s.prompt)+' | '+short(s.answer)+' | '+short((s.signals?.reviewFlags||[]).join(',')||'-')+' |\n';
 }
 out+='\nFull synthetic dialogues and timings: artifact teddy-v32-real-100-dialogue-readback. No flag does not mean factual correctness.\n';
}
process.stdout.write(out);

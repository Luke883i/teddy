// Mutation *of source operators*: targeted mutation score is separate from 10k input fuzzing.
// Run each modified module against independent behavioral oracles; do not count candidates as kills.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../server/lib/cognitive-workspace-v31.mjs',import.meta.url),'utf8');
const operators=[
 ['erase_followup', "move==='repair'||move==='followup'", "move==='repair'&&move==='followup'",'focus'],
 ['drop_history',".slice(-12);",".slice(-1);",'focus'],
 ['misattribute_user',"t.role==='user'&&substantive(t.text)","t.role==='assistant'&&substantive(t.text)",'focus'],
 ['forget_antecedent',"const focus=anchor||current;","const focus=current;",'concept'],
 ['disable_meta_check',"if(junk.test(response))","if(false)",'echo'],
 ['disable_verbatim_check',"fold(response)===fold(input)","fold(response)!==fold(input)",'verbatim'],
 ['disable_compare',"if(/\\b(?:confronta|differenza|rispetto a|versus|meglio fra|meglio tra)\\b/u.test(s))","if(false)",'compare'],
 ['disable_repair',"if(/^(?:non ho capito|spiegati meglio|spiega meglio|puoi chiarire|che intendi|in che senso|non ti seguo|ripeti in modo semplice|puoi essere più chiaro|non è chiaro)\\b/u.test(s))","if(false)",'repair']
];
let killed=0,survivors=[];
const history=[{role:'user',text:'Spiega il principio di gravità.'},{role:'assistant',text:'Le masse esercitano una forza.'}];
const baseline=(m,which)=>{
 if(which==='focus')assert.equal(m.buildCognitiveWorkspace({text:'perché?',history}).antecedent,history[0].text);
 if(which==='concept')assert.ok(m.buildCognitiveWorkspace({text:'perché?',history}).focusTerms.includes('principio'));
 if(which==='echo')assert.equal(m.semanticReadback({question:'perché?',reply:'Ho sentito: perché?'}).status,'reject');
 if(which==='verbatim')assert.equal(m.semanticReadback({question:'Spiega gravità',reply:'Spiega gravità'}).status,'reject');
 if(which==='compare')assert.equal(m.buildCognitiveWorkspace({text:'confronta gravità e attrito'}).move,'compare');
 if(which==='repair')assert.equal(m.buildCognitiveWorkspace({text:'non ho capito',history}).move,'repair');
};
for(const [label,oldCode,newCode,which] of operators){
 assert.ok(source.includes(oldCode),'missing mutation target: '+label);
 const changed=source.replace(oldCode,newCode);
 const module=await import('data:text/javascript;base64,'+Buffer.from(changed).toString('base64'));
 try{baseline(module,which);survivors.push(label)}
 catch{killed++}
}
const result={sourceOperators:operators.length,killed,survivors,mutationScore:killed/operators.length,scope:'targeted source-operator mutants, not exhaustive AST mutation'};
console.log('TEDDY_V31_SOURCE_MUTATION',JSON.stringify(result));
if(survivors.length)process.exitCode=1;

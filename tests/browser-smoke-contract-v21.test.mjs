import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Parse—not execute—the exact source handed to Chrome. Brackets inside an
// interpolated JS template must be resolved before browser navigation.
const src=fs.readFileSync(new URL('../tools/browser-text-v17.mjs',import.meta.url),'utf8');
const begin=src.indexOf('  const expression=`'),end=src.indexOf('`;',begin+20);
test('all CDP expression variants are valid standalone JavaScript',()=>{
  assert.ok(begin>=0&&end>begin);
  const exprSource=src.slice(begin+'  const expression='.length,end+1);
  for(const name of ['bootstrap','chat','balloon','history','geometry','controls','full']){
    const flags=name==='full'?[]:[name];
    const vals=['probeBootstrap','probeChat','probeBalloon','probeGeometry','probeControls','probeHistory'].map(k=>flags.includes(k.replace('probe','').toLowerCase()));
    const value=Function('probeBootstrap','probeChat','probeBalloon','probeGeometry','probeControls','probeHistory',`return ${exprSource};`)(...vals);
    assert.doesNotMatch(value,/\$\{probe\w+\}/,'unresolved template token in '+name);
    assert.doesNotThrow(()=>new Function('return '+value+';'),'bad Chromium expression in '+name);
  }
});

test('CDP pre-navigation microphone sentinel actually parses and initializes',()=>{
 const source=fs.readFileSync(new URL('../tools/browser-text-v17.mjs',import.meta.url),'utf8');
 const opener="await command('Page.addScriptToEvaluateOnNewDocument',{source:`";
 const start=source.indexOf(opener),end=source.indexOf('`});',start+opener.length);
 assert.ok(start>=0&&end>start,'missing browser speech sentinel');
 const template=source.slice(start+opener.length,end);
 const injected=Function('return `'+template+'`;')();
 assert.doesNotThrow(()=>new Function(injected),'sentinel must be valid JavaScript in Chromium');
 assert.match(injected,/__teddyMicAttempts=0/);
 assert.match(injected,/__teddyVoiceFetchAttempts=0/);
 assert.match(injected,/uri\.includes\('\/api\/local\/turn'\)/);
});

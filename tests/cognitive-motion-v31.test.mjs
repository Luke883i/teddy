import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cognitiveMotionIntent} from '../web/teddy/cognitive-motion-v31.js';
import {MOTION_LIMITS,sanitizeMotionIntent} from '../web/teddy/motion-contract.js';
test('only verified model contextual turns create safe tiny gestures',()=>{
 for(const act of ['clarify_context','followup']){
  const g=cognitiveMotionIntent({path:'model',act});
  assert.equal(g.name,'nod');assert.equal(g.source,'assistant');
  assert.ok(g.intensity<=.18&&g.intensity>=0);
  assert.ok(g.duration>=MOTION_LIMITS.duration[0]&&g.duration<=MOTION_LIMITS.duration[1]);
  assert.deepEqual(g,sanitizeMotionIntent(g));
 }
 for(const act of ['identity','name_query','open','greeting'])assert.equal(cognitiveMotionIntent({path:'model',act}),null);
 assert.equal(cognitiveMotionIntent({path:'deterministic',act:'clarify_context'}),null);
});
test('no movement on network replay, reduced-motion or invalid semantic metadata',()=>{
 const semantic={path:'model',act:'clarify_context'};
 assert.equal(cognitiveMotionIntent(semantic,{replayed:true}),null);
 assert.equal(cognitiveMotionIntent(semantic,{reducedMotion:true}),null);
 assert.equal(cognitiveMotionIntent(null),null);
});
test('browser gesture happens after exact model HTTP reply is painted',()=>{
 const client=fs.readFileSync(new URL('../web/text-chat-v17.js',import.meta.url),'utf8');
 assert.ok(client.indexOf('showBubble(body.reply,body.conversationId);')<client.indexOf("new CustomEvent('teddy:motion-intent'"));
 assert.match(client,/replayed:body\.replayed===true/);
 assert.match(client,/prefers-reduced-motion: reduce/);
});

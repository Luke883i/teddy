import test from 'node:test';
import assert from 'node:assert/strict';
import {responseQualitySignals} from '../tools/response-quality-v28.mjs';
test('step 5 / PR41: screen poor text, echo and good formatting without fake factuality',()=>{
 const poor=responseQualitySignals('che cosa significa causalità?','Non so.');
 assert.ok(poor.reviewFlags.includes('very_short'));
 assert.ok(poor.reviewFlags.includes('generic_only'));
 assert.ok(responseQualitySignals('Come funziona una bussola?','Come funziona una bussola?').reviewFlags.includes('verbatim_echo'));
 const good=responseQualitySignals('Che cos’è la privacy?','La privacy aiuta a controllare le informazioni personali.');
 assert.equal(good.reviewFlags.length,0);
 assert.equal('factuality' in good,false);
});
test('metadata never includes user or model transcript',()=>{
 const info=responseQualitySignals('La mia password è riservata','Una risposta utile protegge le informazioni.');
 assert.ok(!JSON.stringify(info).includes('password'));
 assert.ok(!JSON.stringify(info).includes('riservata'));
});

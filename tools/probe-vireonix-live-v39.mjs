// Live, privacy-safe connectivity/shape smoke. It sends only synthetic input.
// Not a fluency benchmark and never run through Teddy's deterministic mock.
import {createHash} from 'node:crypto';
import {vireonixTextTurn,VIREONIX_URL} from '../server/lib/vireonix-text.mjs';
const started=performance.now();
const response={schema:'teddy.vireonix.live.v39',live:true,mocked:false,provider:'vireonix',endpoint:VIREONIX_URL,qualityComparison:false,requestCount:1};
try{
 const text=await vireonixTextTurn({
  text:'Parla come Teddy: qual è un modo simpatico di salutare in italiano? Rispondi in una sola frase.',
  semanticDirective:'Sei Teddy, un orsetto arguto. Rispondi in italiano in una sola frase naturale, senza markdown o affermazioni non verificabili.',
  history:[]
 });
 response.durationMs=Math.round(performance.now()-started);
 response.outputChars=text.length;
 response.outputSha256=createHash('sha256').update(text).digest('hex');
 response.sample=text.slice(0,240);
 response.result='live_response_received';
 response.pass=true;
 console.log('TEDDY_VIREONIX_LIVE_PROBE',JSON.stringify(response));
}catch(error){
 response.durationMs=Math.round(performance.now()-started);
 response.error=error?.code||'unknown';
 response.status=error?.status||null;
 response.result='live_response_not_verified';
 response.pass=false;
 console.error('TEDDY_VIREONIX_LIVE_PROBE',JSON.stringify(response));
 process.exitCode=1;
}

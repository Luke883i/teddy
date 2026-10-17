// v31: very small, optional embodiment of verified conversation events.
// Never infer a gesture from untrusted model prose, never animate a replay or while thinking.
import {sanitizeMotionIntent} from './motion-contract.js';
export function cognitiveMotionIntent(semantic,{replayed=false,reducedMotion=false}={}){
  if(replayed||reducedMotion||semantic?.path!=='model')return null;
  const act=semantic?.act;
  if(act==='clarify_context')return sanitizeMotionIntent({name:'nod',intensity:.18,duration:.48,source:'assistant',reason:'cognition:contextual-repair'});
  if(act==='followup')return sanitizeMotionIntent({name:'nod',intensity:.12,duration:.42,source:'assistant',reason:'cognition:followup'});
  return null;
}

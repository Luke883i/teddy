// v29: one bounded, testable comic geometry/pacing contract shared by runtime and CI.
// No dependencies on Teddy's canvas or renderer.
const bound=(n,low,high)=>Math.max(low,Math.min(high,n));
export function comicGeometry(width,height,charCount=0){
  const w=bound(Math.floor(Number(width)||320),320,7680);
  const h=bound(Math.floor(Number(height)||320),320,4320);
  const compact=w<900;
  const n=bound(Math.floor(Number(charCount)||0),0,4000);
  const ideal=Math.round(188+Math.sqrt(n)*9.2);
  const maxWidth=compact?Math.min(226,Math.floor(w*.52)):Math.min(346,Math.floor(w*.34));
  const minWidth=compact?Math.min(170,maxWidth):Math.min(204,maxWidth);
  const bubbleWidth=bound(ideal,minWidth,maxWidth);
  // On a wide display the balloon starts just to the RIGHT of Teddy's central stage,
  // not at the distant screen edge. On phones it is a small dismissible sidecard.
  const desired=compact?w-bubbleWidth-12:Math.max(Math.round(w*.53),Math.round(w/2+Math.min(178,Math.max(116,w*.13))));
  const left=bound(desired,12,w-bubbleWidth-12);
  const top=compact?bound(Math.round(h*.19),104,178):bound(Math.round(h*.21),118,220);
  const maxHeight=bound(Math.round(h*.47),90,360);
  const textMaxHeight=Math.max(36,maxHeight-90);
  return Object.freeze({compact,left,top,bubbleWidth,maxHeight,textMaxHeight,centerClearance:left-Math.round(w/2)});
}
export function minimumThinkingMs(path,replyLength=0){
  // Perceived responsiveness, not fake LLM work or a spinner with unbounded duration.
  const n=bound(Number(replyLength)||0,0,4000);
  return path==='deterministic'?bound(Math.round(190+n*.38),190,350):180;
}
export async function settleThinking({started,now=()=>performance.now(),signal,minimum=190,wait}={}){
  const remaining=Math.max(0,minimum-(now()-started));
  if(remaining<=0)return 0;
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  const sleep=wait||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
  await sleep(remaining);
  if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');
  return remaining;
}

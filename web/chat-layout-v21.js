// v21: actual shared layout policy, consumed by the browser and adversarial tests.
// Sizes are in CSS px, and no contract promises pixel clearance while user opens a drawer.
export function chatLayout(width,height){
  const w=Math.max(320,Math.floor(Number.isFinite(width)?width:320));
  const h=Math.max(320,Math.floor(Number.isFinite(height)?height:320));
  const compact=w<900,small=w<=560;
  const historyWidth=compact?Math.min(292,w-24):Math.min(252,Math.floor(w*0.25));
  const bubbleWidth=compact?(small?Math.min(195,Math.floor(w*0.48)):Math.min(214,Math.floor(w*0.33))):Math.min(253,Math.floor(w*0.25));
  const composerWidth=Math.min(535,w-24);
  const margin=compact?12:18;
  const centralGap=Math.max(0,w-historyWidth-bubbleWidth-2*margin);
  return {compact,historyWidth,bubbleWidth,composerWidth,centralGap,shortScreen:h<521,initialHistoryOpen:false};
}

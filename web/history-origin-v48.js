// A receipt is transaction provenance, NOT external truth or a signature.
// Historical assistant rows without one are deliberately not attributed to Teddy.
export function historicalSpeaker(turn){
  if(turn?.role==='user')return 'Tu';
  return turn?.role==='assistant'&&turn?.origin==='receipt_backed'?'Teddy':'Archivio · origine non attestata';
}
export function historicalReplyVerified(turn){return turn?.role==='assistant'&&turn?.origin==='receipt_backed'}

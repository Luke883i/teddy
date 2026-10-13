// V15 anatomical silhouette envelopes. No extra visible meshes and no transparent shells:
// existing joint sockets are fitted *inside* adjacent plush limb widths.
// Applied after cinematic overrides, before the same WebGL/Canvas partTransform path.
export const JOINT_ENVELOPES_V15=Object.freeze({
  shoulderSocket:Object.freeze({scale:[.164,.177,.167],adjacent:['upperArm','torso'],maxRadius:.195}),
  elbowPad:Object.freeze({scale:[.171,.174,.172],adjacent:['upperArm','forearm'],maxRadius:.180}),
  wristPad:Object.freeze({scale:[.164,.164,.170],adjacent:['forearm','paw'],maxRadius:.181}),
  hipSocket:Object.freeze({scale:[.220,.225,.222],adjacent:['pelvisMass','thigh'],maxRadius:.245}),
  kneePad:Object.freeze({scale:[.178,.176,.176],adjacent:['thigh','shin'],maxRadius:.190}),
  anklePad:Object.freeze({scale:[.175,.172,.182],adjacent:['shin','foot'],maxRadius:.190})
});
const JOINT_PREFIX=Object.keys(JOINT_ENVELOPES_V15);
export function envelopeKind(id){
  if(typeof id!=='string')return null;
  const prefix=JOINT_PREFIX.find(k=>id===k+'L'||id===k+'R');
  return prefix||null;
}
export function finishJointEnvelope(part){
  const kind=envelopeKind(part?.id);
  if(!kind)return part;
  const e=JOINT_ENVELOPES_V15[kind];
  // No outward bulges above neighboring limb radius; retain existing parent/part IDs.
  return {...part,scale:[...e.scale],rot:[...(part.rot||[0,0,0])]};
}
export function verifyJointEnvelope(part){
  const kind=envelopeKind(part?.id);
  if(!kind)return false;
  const e=JOINT_ENVELOPES_V15[kind];
  return Array.isArray(part.scale)&&part.scale.length===3&&
    part.scale.every((v,i)=>Number.isFinite(v)&&v>0&&Math.abs(v-e.scale[i])<1e-9&&v<=e.maxRadius);
}

// One opaque plush material, shared between WebGL2 and Canvas2D policy.
export const FUR_DEFAULT=true;
export const FUR_MATERIAL=Object.freeze({
  coordinateSpace:'deforming local geometry; physical part radii',
  surface:'opaque depth-tested base mesh, no blended transparent fur shells',
  displacement:.82, roughness:1,
  fallback:'deterministic low-cost canvas surface marks'
});
export function furEnabled(appearance={}){return appearance?.furEnabled!==false}
export function furLabel(enabled){return enabled?'Pelliccia: ON':'Pelliccia: OFF'}

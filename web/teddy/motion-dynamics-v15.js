// V15: authored kinetic identity + C1 Hermite pose continuity + coherent follow-through.
// Physical degrees come from v14; this layer never invents an extra skeleton.
const entries={
  greet:['social',2.1,.052,.024],farewell:['social',1.8,.045,-.018],
  yes:['head',2.6,.034,.012],noThanks:['head',2.2,.044,-.018],
  shy:['emotion',1.5,.025,-.034],proud:['emotion',1.2,.031,.028],
  curious:['head',1.6,.052,.031],celebrate:['energetic',2.3,.055,-.015],
  applaud:['rhythm',3.5,.060,.012],stretch:['slow',1.0,.021,-.018],
  pointLeft:['directed',1.4,.024,-.026],pointRight:['directed',1.4,.024,.026],
  march:['locomotion',2.8,.044,-.013],retreat:['locomotion',1.7,.026,.016],
  approach:['locomotion',2.2,.035,-.021],pivot:['turn',1.2,.029,.031],
  sway:['flow',1.6,.032,-.036],bounce:['energetic',2.4,.043,.013],
  stepLeft:['locomotion',1.7,.033,-.025],stepRight:['locomotion',1.7,.033,.025],
  balanceLeft:['balance',1.1,.026,-.027],balanceRight:['balance',1.1,.026,.027],
  warmup:['flow',1.9,.040,.014],coolDown:['slow',.85,.015,-.009],
  salute:['directed',1.4,.031,.027],bow:['slow',1.0,.017,-.015],
  surprise:['emotion',1.4,.031,.019],ponder:['head',1.2,.028,.035],
  spin:['turn',1.8,.032,-.016],victory:['energetic',1.8,.033,.011],
  dance:['dance',3.1,.074,-.029],lightningBolt:['iconic',1.3,.023,.033]
};
export const MOTION_DYNAMICS_V15=Object.freeze(Object.fromEntries(
  Object.entries(entries).map(([name,[type,beats,follow,skew]])=>[name,Object.freeze({name,type,beats,follow,skew})])));
const T=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const codeLayer=(code)=>{
  if(/^W|^E|^N|^H[E]$/.test(code))return 'local';
  if(/^S[L-R]|^H[L-R]|^K[L-R]|^A[L-R]/.test(code))return 'intermediate';
  return 'global';
};
export const MOTION_LAYERS_V15=Object.freeze(['local','intermediate','global']);
export function kineticLayer(code){return codeLayer(code)}
function value(frame,code,axis){return frame?.pose?.[code]?.[axis]||0}
function tangent(frames,i,code,axis){
  if(i===0||i===frames.length-1)return 0;
  const l=frames[i-1],m=frames[i],r=frames[i+1];
  const prev=(value(m,code,axis)-value(l,code,axis))/(m.t-l.t);
  const next=(value(r,code,axis)-value(m,code,axis))/(r.t-m.t);
  // Limit curvature; no enormous interpolation overshoot at hold/reversal.
  return clamp((prev+next)*.31,-4.2,4.2);
}
function hermite(a,b,va,vb,ma,mb,p){
  const h=b-a,u=clamp((p-a)/h,0,1),u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*va+(u3-2*u2+u)*h*ma+(-2*u3+3*u2)*vb+(u3-u2)*h*mb;
}
export function sampleKineticJoint(frames,code,axis,phase,style){
  if(!style||!Array.isArray(frames)||frames.length<2)return 0;
  const p=clamp(Number.isFinite(phase)?phase:0,0,1);
  if(p===0||p===1)return 0;
  const layer=codeLayer(code),lag=layer==='local'?.018:layer==='intermediate'?.012:.006;
  const envelope=Math.sin(Math.PI*p)**2;
  // Follow-through is bounded in time: global mass leads, distal joints trail.
  const delayed=clamp(p-lag*envelope*(1+Math.abs(style.skew)*4),0,1);
  let at=frames.findIndex(f=>f.t>=delayed);if(at<1)at=frames.length-1;
  const a=at-1,b=at;
  const v=hermite(frames[a].t,frames[b].t,value(frames[a],code,axis),value(frames[b],code,axis),
    tangent(frames,a,code,axis),tangent(frames,b,code,axis),delayed);
  const displacement=layer==='local'?style.follow:layer==='intermediate'?style.follow*.42:style.follow*.26;
  const phaseOffset=layer==='local'?.46:layer==='intermediate'?.15:0;
  const axisGain=axis===2?1:axis===0?.52:.30;
  const wave=Math.sin(T*(style.beats*p-phaseOffset)+style.skew*T)*envelope*displacement*axisGain;
  return clamp(v+wave,-1.2,1.2);
}
export function styleForMotion(name){return Object.hasOwn(MOTION_DYNAMICS_V15,name)?MOTION_DYNAMICS_V15[name]:null}

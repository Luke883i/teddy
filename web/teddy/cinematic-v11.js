import {finishJointEnvelope} from './silhouette-v15.js';
import {M4,compose} from './math.js';
import {TeddyRenderer} from './render.js';

const clone=p=>({...p,pos:[...(p.pos||[0,0,0])],scale:[...(p.scale||[1,1,1])],rot:[...(p.rot||[0,0,0])]});
const ABS=Object.freeze({
  pelvisMass:{pos:[0,-.045,-.09],scale:[.585,.405,.50]},torso:{pos:[0,.06,-.055],scale:[.685,.96,.60]},chest:{pos:[0,.47,-.13],scale:[.58,.36,.50]},belly:{pos:[0,.07,.455],scale:[.345,.43,.125]},neckRoll:{pos:[0,.015,-.10],scale:[.255,.18,.245]},
  headShell:{pos:[0,.015,-.025],scale:[.72,.68,.67]},browPadL:{pos:[-.205,.215,.46],scale:[.125,.065,.055]},browPadR:{pos:[.205,.215,.46],scale:[.125,.065,.055]},cheekL:{pos:[-.26,-.105,.235],scale:[.205,.195,.205]},cheekR:{pos:[.26,-.105,.235],scale:[.205,.195,.205]},
  earL:{scale:[.238,.252,.218]},earR:{scale:[.238,.252,.218]},innerEarL:{pos:[0,-.012,.208],scale:[.130,.140,.012]},innerEarR:{pos:[0,-.012,.208],scale:[.130,.140,.012]},muzzlePad:{pos:[0,-.19,.565],scale:[.345,.225,.225]},muzzleL:{pos:[-.112,-.235,.635],scale:[.142,.115,.15]},muzzleR:{pos:[.112,-.235,.635],scale:[.142,.115,.15]},
  noseBridge:{pos:[0,-.11,.718],scale:[.102,.073,.064]},nose:{pos:[0,-.168,.82],scale:[.112,.075,.082],geometry:'sphere',rot:[.03,0,0]},eyeL:{pos:[-.205,.108,.605],scale:[.074,.082,.062]},eyeR:{pos:[.205,.108,.605],scale:[.074,.082,.062]},catchL:{pos:[-.182,.145,.667],scale:[.015,.018,.010]},catchR:{pos:[.228,.145,.667],scale:[.015,.018,.010]},browL:{pos:[-.205,.255,.615],scale:[.055,.010,.014]},browR:{pos:[.205,.255,.615],scale:[.055,.010,.014]},
  shoulderSocketL:{pos:[0,-.025,-.01],scale:[.165,.18,.18]},shoulderSocketR:{pos:[0,-.025,-.01],scale:[.165,.18,.18]},upperArmL:{pos:[0,-.225,.02],scale:[.205,.405,.21]},upperArmR:{pos:[0,-.225,.02],scale:[.205,.405,.21]},elbowPadL:{pos:[0,0,.015],scale:[.105,.11,.115]},elbowPadR:{pos:[0,0,.015],scale:[.105,.11,.115]},forearmL:{pos:[0,-.175,.065],scale:[.18,.345,.19]},forearmR:{pos:[0,-.175,.065],scale:[.18,.345,.19]},wristPadL:{pos:[0,0,.035],scale:[.095,.10,.11]},wristPadR:{pos:[0,0,.035],scale:[.095,.10,.11]},pawL:{pos:[0,-.020,.105],scale:[.19,.185,.215]},pawR:{pos:[0,-.020,.105],scale:[.19,.185,.215]},
  hipSocketL:{pos:[0,0,-.02],scale:[.165,.18,.19]},hipSocketR:{pos:[0,0,-.02],scale:[.165,.18,.19]},thighL:{pos:[0,-.165,.025],scale:[.245,.385,.265]},thighR:{pos:[0,-.165,.025],scale:[.245,.385,.265]},kneePadL:{pos:[0,0,.02],scale:[.115,.12,.13]},kneePadR:{pos:[0,0,.02],scale:[.115,.12,.13]},shinL:{pos:[0,-.155,.07],scale:[.19,.325,.21]},shinR:{pos:[0,-.155,.07],scale:[.19,.325,.21]},anklePadL:{pos:[0,0,.065],scale:[.105,.10,.13]},anklePadR:{pos:[0,0,.065],scale:[.105,.10,.13]},footL:{pos:[-.012,-.05,.295],scale:[.28,.17,.35],rot:[.075,-.055,-.035]},footR:{pos:[.012,-.05,.295],scale:[.28,.17,.35],rot:[.075,.055,.035]},footPadL:{pos:[0,-.042,.585],scale:[.18,.09,.022]},footPadR:{pos:[0,-.042,.585],scale:[.18,.09,.022]}
});

export const CINEMATIC_V11=Object.freeze({version:11,restYaw:-.075,objective:'readable plush volume from front and three-quarter views',depthModel:'explicit rest-stage depth plus embedded joints',cameraIntent:'near-frontal portrait; volume comes from geometry rather than billboard offsets'});
export function cinematicPart(input){const p=clone(input),a=ABS[p.id];if(a){if(a.pos)p.pos=[...a.pos];if(a.scale)p.scale=[...a.scale];if(a.rot)p.rot=[...a.rot];if(a.geometry)p.geometry=a.geometry;}if(/^toe/.test(p.id)){p.scale=[.031,.025,.008];p.pos[2]-=.075;}return finishJointEnvelope(p);}

const pivot=m=>[m?.[12]||0,m?.[13]||0,m?.[14]||0];
const deltaAt=(m,translation=[0,0,0],rotation=[0,0,0])=>{const p=pivot(m);return compose(M4.translate(...translation),M4.translate(...p),M4.rotZ(rotation[2]||0),M4.rotY(rotation[1]||0),M4.rotX(rotation[0]||0),M4.translate(-p[0],-p[1],-p[2]));};
const apply=(out,names,d)=>{for(const n of names)if(out[n])out[n]=M4.mul(d,out[n]);};
const LARM=['shoulderL','elbowL','wristL'],RARM=['shoulderR','elbowR','wristR'],LFORE=['elbowL','wristL'],RFORE=['elbowR','wristR'];
const LLEG=['hipL','kneeL','ankleL'],RLEG=['hipR','kneeR','ankleR'],LSHIN=['kneeL','ankleL'],RSHIN=['kneeR','ankleR'];
export function cinematicStageMatrices(base){const out={...base},rest=M4.rotY(CINEMATIC_V11.restYaw);for(const [name,m] of Object.entries(out))if(m?.length===16)out[name]=M4.mul(rest,m);apply(out,LARM,deltaAt(out.shoulderL,[.025,-.005,-.055],[-.045,.09,-.03]));apply(out,RARM,deltaAt(out.shoulderR,[-.025,-.005,-.055],[-.045,-.09,.03]));apply(out,LFORE,deltaAt(out.elbowL,[.010,.045,.030],[-.13,-.045,.05]));apply(out,RFORE,deltaAt(out.elbowR,[-.010,.045,.030],[-.13,.045,-.05]));apply(out,['wristL'],M4.translate(.006,.030,.010));apply(out,['wristR'],M4.translate(-.006,.030,.010));apply(out,LLEG,deltaAt(out.hipL,[.025,.010,-.035],[-.035,.06,.005]));apply(out,RLEG,deltaAt(out.hipR,[-.025,.010,-.035],[-.035,-.06,-.005]));apply(out,LSHIN,M4.translate(.010,.020,.025));apply(out,RSHIN,M4.translate(-.010,.020,.025));apply(out,['ankleL'],M4.translate(.006,.030,.045));apply(out,['ankleR'],M4.translate(-.006,.030,.045));return out;}

const tone=(hex,k)=>{const s=String(hex||'#000000').replace('#','').padEnd(6,'0'),n=parseInt(s.slice(0,6),16),f=c=>Math.max(0,Math.min(255,Math.round(c+(k>=0?(255-c):c)*k))),r=f((n>>16)&255),g=f((n>>8)&255),b=f(n&255);return `rgb(${r},${g},${b})`;};
function cinematicFallback2d(renderer){
  const c=renderer.ctx;if(!c)return;renderer.groupMatrices(renderer.lastPose||0,renderer.pose);const motion=renderer.motionStatus?.()||{},world=motion.world||{},bolt=motion.action?.name==='boltPose'?(motion.action.amount||0):0;const w=renderer.canvas.width,h=renderer.canvas.height,s=Math.min(w*.285,h*.215),cx=w*.50+(world.x||0)*s,cy=h*.55-(world.y||0)*s,fur=renderer.config.appearance.fur,muz=renderer.config.appearance.muzzle,eyes=renderer.config.appearance.eyes,inner=tone(muz,-.06),paw=tone(muz,-.12),dark=tone(fur,-.36),hx=(renderer.pose?.headYaw||0)*.055,hy=-(renderer.pose?.headPitch||0)*.045;
  const ell=(x,y,rx,ry,fill,rot=0,depth=.16)=>{const X=cx+x*s,Y=cy-y*s,RX=rx*s,RY=ry*s;c.save();c.translate(X,Y);c.rotate(rot);const g=c.createRadialGradient(-RX*.26,-RY*.32,Math.max(1,RX*.06),0,0,Math.max(RX,RY));g.addColorStop(0,tone(fill,.20));g.addColorStop(.58,fill);g.addColorStop(1,tone(fill,-depth));c.fillStyle=g;c.beginPath();c.ellipse(0,0,RX,RY,0,0,Math.PI*2);c.fill();
    if(renderer.furEnabled&&fill===fur){
      c.save();c.beginPath();c.ellipse(0,0,RX,RY,0,0,Math.PI*2);c.clip();
      c.globalAlpha=.16;c.strokeStyle=tone(fill,.34);c.lineWidth=Math.max(.55,s*.0014);
      for(let i=0;i<84;i++){
        const a=(i*.61803398875)%1,b=(i*.7548776662)%1,xx=(a*1.8-.9)*RX,yy=(b*1.8-.9)*RY;
        const len=Math.max(1,s*.005);c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+len*.42,yy-len);c.stroke();
      }
      c.restore();
    }
    c.restore();};
  c.clearRect(0,0,w,h);c.fillStyle=renderer.config.appearance.background;c.fillRect(0,0,w,h);
  c.save();c.globalAlpha=.28;c.fillStyle='#000';c.beginPath();c.ellipse(cx,cy+1.37*s,.72*s,.075*s,0,0,Math.PI*2);c.fill();c.restore();
  // Far-side chains first: depth is encoded in overlap order as well as shading.
  ell(-.36,-.82,.225,.45,fur,-.025,.24);ell(-.34,-1.18,.29,.17,fur,-.06,.22);ell(-.60,.13,.19,.62,fur,-.05,.24);ell(-.61,-.43,.19,.20,fur,-.03,.24);
  ell(.34,-.82,.235,.46,fur,.02,.18);ell(.34,-1.18,.29,.17,fur,.06,.16);
  ell(0,-.18,.585,.405,fur,0,.22);ell(0,.19,.685,.92,fur,0,.19);ell(0,.13,.345,.43,tone(muz,-.03),0,.12);
  ell(.61+bolt*.08,.13+bolt*.49,.205,.63,fur,.05-bolt*.42,.17);ell(.61+bolt*.21,-.43+bolt*.96,.20,.205,fur,.03-bolt*.42,.17);
  ell(-.55+hx,1.48+hy,.238,.252,fur,-.08,.22);ell(.55+hx,1.48+hy,.238,.252,fur,.08,.17);ell(-.55+hx,1.47+hy,.13,.14,inner,-.08,.10);ell(.55+hx,1.47+hy,.13,.14,inner,.08,.08);
  ell(hx,1.06+hy,.72,.68,fur,0,.18);ell(-.255+hx,.955+hy,.20,.19,fur,0,.15);ell(.255+hx,.955+hy,.20,.19,fur,0,.12);
  ell(hx,.87+hy,.345,.225,muz,0,.10);ell(-.11+hx,.82+hy,.142,.115,muz,0,.08);ell(.11+hx,.82+hy,.142,.115,muz,0,.08);
  const open=Math.max(.05,1-(renderer.pose?.blink||0)*.94-(renderer.pose?.squint||0)*.12);ell(-.205+hx,1.16+hy,.074,.082*open,eyes,0,.04);ell(.205+hx,1.16+hy,.074,.082*open,eyes,0,.04);if(open>.14){ell(-.184+hx,1.19+hy,.014,.018,'#fff8e6',0,.02);ell(.228+hx,1.19+hy,.014,.018,'#fff8e6',0,.02);}
  ell(hx,.805+hy,.112,.075,eyes,.02,.05);const jaw=renderer.pose?.jaw||0;if(jaw>.025)ell(hx,.70-jaw*.045+hy,.105,.012+.060*jaw,tone(eyes,-.05),0,.02);
  // Pads sit on the front of the feet, not as floating decals.
  ell(-.34,-1.195,.175,.07,paw,-.04,.08);ell(.34,-1.195,.175,.07,paw,.04,.08);
}

export function installCinematicV11(){if(TeddyRenderer.prototype.__cinematicV11)return;TeddyRenderer.prototype.__cinematicV11=true;const partTransform=TeddyRenderer.prototype.partTransform;TeddyRenderer.prototype.partTransform=function(part,g,sec,p){return partTransform.call(this,cinematicPart(part),g,sec,p);};const groupMatrices=TeddyRenderer.prototype.groupMatrices;TeddyRenderer.prototype.groupMatrices=function(sec,p){return cinematicStageMatrices(groupMatrices.call(this,sec,p));};TeddyRenderer.prototype.frame2d=function(){return cinematicFallback2d(this);};}

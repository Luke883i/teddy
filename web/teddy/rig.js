const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(value,target,speed,dt)=>lerp(value,target,1-Math.exp(-Math.max(0,speed)*Math.max(0,dt)));
const MODES=new Set(['idle','listening','thinking','speaking','concerned']);

function xorshift32(seed){
  let x=(Number(seed)>>>0)||0x6d2b79f5;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
}

export const EXPRESSION_LIMITS=Object.freeze({
  jaw:[0,1],round:[0,1],wide:[0,1],smile:[0,1],browRaise:[0,1],browPinch:[0,1],squint:[0,1],
  headYaw:[-.18,.18],headPitch:[-.12,.12],headRoll:[-.08,.08],earLift:[0,1],gesture:[0,1],shoulder:[0,1],blink:[0,1]
});

export function sanitizeVoiceFrame(frame={}){
  return {
    level:clamp(frame.level),raw:clamp(frame.raw),low:clamp(frame.low),mid:clamp(frame.mid),high:clamp(frame.high),
    brightness:clamp(frame.brightness),attack:clamp(frame.attack),plosive:clamp(frame.plosive),active:!!frame.active,
    clipped:!!frame.clipped,fallback:!!frame.fallback,at:Number.isFinite(Number(frame.at))?Number(frame.at):0
  };
}

export class ExpressionRig{
  constructor({reducedMotion=false,seed=0x54454444,persona={}}={}){
    this.reducedMotion=!!reducedMotion;this.rand=xorshift32(seed);this.mode='idle';this.modeSince=0;this.voice=sanitizeVoiceFrame();
    this.persona={warmth:clamp(persona.warmth??.5),irritability:clamp(persona.irritability??.5),wit:clamp(persona.wit??.5)};
    this.pose={jaw:0,round:0,wide:0,smile:.08,browRaise:.06,browPinch:.04,squint:0,headYaw:0,headPitch:0,headRoll:0,earLift:.08,gesture:0,shoulder:0,blink:0};
    this.blinkStart=-Infinity;this.blinkDuration=.145;this.nextBlink=2.4+this.rand()*2.4;this.lastNow=0;
  }
  setPersona(persona={}){for(const k of ['warmth','irritability','wit'])if(persona[k]!=null)this.persona[k]=clamp(persona[k]);}
  setMode(mode,now=this.lastNow){if(MODES.has(mode)&&mode!==this.mode){this.mode=mode;this.modeSince=Number(now)||0;}}
  setListening(value,now=this.lastNow){this.setMode(value?'listening':'thinking',now);}
  setVoice(frame){this.voice=sanitizeVoiceFrame(frame);}
  scheduleBlink(now){const attentional=this.mode==='listening'?1.15:this.mode==='speaking'?.9:1;this.nextBlink=now+(2.1+this.rand()*3.4)*attentional;}
  targets(now,pointer={x:0,y:0}){
    const v=this.voice,p=this.persona,active=v.active&&v.level>.025;
    const explicit=this.mode==='thinking'&&now-this.modeSince>3.2?'idle':this.mode;
    const effective=active?'speaking':explicit;
    const base={jaw:0,round:0,wide:0,smile:.05+.12*p.warmth,browRaise:.05,browPinch:.04+.08*p.irritability,squint:.02,headYaw:0,headPitch:0,headRoll:0,earLift:.08,gesture:0,shoulder:0};
    if(effective==='listening'){base.browRaise=.22;base.browPinch=.02;base.earLift=.42;base.headPitch=-.035;base.smile=.08+.16*p.warmth;}
    else if(effective==='thinking'){base.browRaise=.08;base.browPinch=.13+.08*p.wit;base.earLift=.18;base.headRoll=.018;base.headYaw=.018;}
    else if(effective==='concerned'){base.browRaise=.16;base.browPinch=.34;base.squint=.08;base.earLift=.05;base.headPitch=.035;base.smile=.01;}
    if(active){
      base.jaw=clamp(Math.pow(v.level,.72)*.92+v.attack*.18+v.plosive*.08);
      base.round=clamp((1-v.brightness)*v.level*.88+v.low*.18);
      base.wide=clamp(v.brightness*v.level*.92+v.high*.15);
      base.smile=clamp(.08+.22*p.warmth+.09*v.brightness);
      base.browRaise=clamp(.08+.16*v.high+.10*v.attack);
      base.browPinch=clamp(.03+.08*p.irritability*(1-v.level));
      base.squint=clamp(.02+.08*v.level+.06*v.attack);
      base.earLift=.14+.12*v.attack;
      base.gesture=clamp(v.level*.52+v.attack*.68);
      base.shoulder=clamp(v.level*.16+v.attack*.24);
      base.headPitch=-.012-.025*v.level;
      base.headRoll=(v.brightness-.5)*.025;
    }
    const pointerScale=this.reducedMotion?.25:1;
    base.headYaw+=clamp(pointer.x,-1,1)*.095*pointerScale;
    base.headPitch+=clamp(pointer.y,-1,1)*-.052*pointerScale;
    if(!this.reducedMotion){
      const idle=effective==='idle'?1:.45;base.headYaw+=Math.sin(now*.73)*.016*idle;base.headRoll+=Math.sin(now*.41+1.2)*.009*idle;
    }
    return base;
  }
  step(dt,now,pointer={x:0,y:0}){
    dt=Math.max(0,Math.min(.12,Number(dt)||0));now=Number(now)||0;this.lastNow=now;
    if(now>=this.nextBlink&&now-this.blinkStart>this.blinkDuration){this.blinkStart=now;this.scheduleBlink(now);}
    const bt=(now-this.blinkStart)/this.blinkDuration;const blink=bt>=0&&bt<=1?Math.sin(Math.PI*bt)**2:0;
    const t=this.targets(now,pointer),pose=this.pose,fast=['jaw','round','wide','squint'],medium=['browRaise','browPinch','smile','earLift','gesture','shoulder'],slow=['headYaw','headPitch','headRoll'];
    for(const k of fast){const speed=t[k]>pose[k]?24:15;pose[k]=smooth(pose[k],t[k],speed,dt);}
    for(const k of medium)pose[k]=smooth(pose[k],t[k],k==='gesture'?9:7.5,dt);
    for(const k of slow)pose[k]=smooth(pose[k],t[k],5.5,dt);
    pose.blink=blink;
    for(const [k,[a,b]] of Object.entries(EXPRESSION_LIMITS))pose[k]=Math.max(a,Math.min(b,pose[k]));
    const settledMode=this.mode==='thinking'&&now-this.modeSince>3.2?'idle':this.mode;
    return {...pose,mode:(this.voice.active&&this.voice.level>.025)?'speaking':settledMode,voice:{...this.voice}};
  }
}

export function poseIsSafe(pose={}){
  return Object.entries(EXPRESSION_LIMITS).every(([k,[a,b]])=>Number.isFinite(pose[k])&&pose[k]>=a-1e-9&&pose[k]<=b+1e-9);
}

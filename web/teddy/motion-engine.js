import {MOTION_LIMITS,sanitizeMotionIntent,motionInvariantViolations} from './motion-contract.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const clampRange=(v,[a,b])=>Math.max(a,Math.min(b,Number(v)||0));
const ease=t=>t*t*(3-2*t);

export class MotionEngine{
  constructor({reducedMotion=false}={}){
    this.reducedMotion=!!reducedMotion;this.queue=[];this.current=null;this.elapsed=0;
    this.world={x:0,y:0,z:0,yaw:0};this.last={gaitSpeed:0,gaitDirection:1,grounded:true,airborne:false,action:null,phase:0,duration:.28,queueDepth:0,footPenetration:0,footSlip:0,world:{...this.world}};
  }
  enqueue(raw){
    const intent=sanitizeMotionIntent(raw);if(!intent)return false;
    if(intent.name==='stand'){this.queue.length=0;this.current=null;this.elapsed=0;this.world.y=0;this.queue.push(intent);return true;}
    if(this.queue.length>=MOTION_LIMITS.queueMax)return false;
    const tail=this.queue[this.queue.length-1];if(this.current?.name===intent.name||tail?.name===intent.name)return true;
    this.queue.push(intent);return true;
  }
  _begin(){if(!this.current&&this.queue.length){this.current=this.queue.shift();this.elapsed=0;}}
  step(dt=1/60){
    dt=Math.max(0,Math.min(.08,Number(dt)||0));this._begin();
    const c=this.current;if(!c){this.world.y=0;return this._snapshot({duration:.28,phase:0});}
    this.elapsed+=dt;const phase=Math.min(1,this.elapsed/c.duration),smooth=ease(phase),i=c.intensity*(this.reducedMotion?.42:1),pulse=Math.sin(Math.PI*phase);
    let gaitSpeed=0,gaitDirection=1,action=null,airborne=false,footSlip=0;
    if(c.name==='walkForward'||c.name==='walkBack'){
      gaitSpeed=clamp(i*.92);gaitDirection=c.name==='walkBack'?-1:1;
      const velocity=(.11+.13*gaitSpeed)*gaitDirection;this.world.z=clampRange(this.world.z+velocity*dt,MOTION_LIMITS.worldZ);footSlip=.018+.026*gaitSpeed;
    }else if(c.name==='turnLeft'||c.name==='turnRight'){
      const sign=c.name==='turnLeft'?1:-1;this.world.yaw=clampRange(this.world.yaw+sign*dt*(.32+.46*i),MOTION_LIMITS.yaw);
    }else if(c.name==='jump'){
      const h=.12+.22*i;this.world.y=Math.max(0,Math.sin(Math.PI*phase)*h);airborne=this.world.y>MOTION_LIMITS.groundEpsilon;action={name:'jump',amount:clamp(pulse*i)};
    }else if(c.name==='waveLeft'||c.name==='waveRight'){
      action={name:c.name,amount:clamp((.35+.65*pulse)*i)};
    }else if(c.name==='nod'){
      action={name:'nod',amount:clamp(pulse*i)};
    }else if(c.name!=='stand'){
      action={name:c.name,amount:clamp(pulse*i)};
    }
    if(c.name!=='jump')this.world.y=0;
    const done=phase>=1-1e-9;
    const snap=this._snapshot({gaitSpeed,gaitDirection,action,airborne,grounded:!airborne,phase,duration:c.duration,footSlip});
    const violations=motionInvariantViolations(snap);if(violations.length){this.queue.length=0;this.current=null;this.world.y=0;return this._snapshot({duration:.28,phase:0,problem:violations[0]});}
    if(done){if(c.name==='jump')this.world.y=0;this.current=null;this.elapsed=0;}
    return snap;
  }
  _snapshot(extra={}){
    this.last={world:{...this.world},gaitSpeed:0,gaitDirection:1,grounded:true,airborne:false,action:null,phase:0,duration:.28,queueDepth:this.queue.length,footPenetration:0,footSlip:0,...extra};return this.last;
  }
  status(){return {...this.last,world:{...this.last.world},queued:this.queue.map(x=>x.name),current:this.current?.name||null};}
}

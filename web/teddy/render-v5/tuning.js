import {TeddyRenderer} from './renderer.js';
import {M4,compose} from '../math.js';

const byId=(model,id)=>model.parts.find(p=>p.id===id);
const patch=(model,id,values)=>Object.assign(byId(model,id),values);

export function tuneTeddyModel(model){
  model.groups.head.pos=[0,1.15,.02];
  model.groups.hipL.pos=[-.460,-.73,.02];model.groups.hipL.rot=[.02,0,-.10];
  model.groups.hipR.pos=[.460,-.73,.02];model.groups.hipR.rot=[.02,0,.10];
  patch(model,'torsoShell',{pos:[0,-.18,-.45],scale:[.79,1.07,.62],roughness:.97});
  patch(model,'tail',{pos:[0,-.57,-.84],scale:[.001,.001,.001],roughness:.99});
  patch(model,'templeL',{pos:[-.41,.04,-.38],scale:[.20,.24,.20],roughness:.99});patch(model,'templeR',{pos:[.41,.04,-.38],scale:[.20,.24,.20],roughness:.99});
  patch(model,'cheekL',{pos:[-.28,-.20,.02],scale:[.18,.16,.16],roughness:.99});patch(model,'cheekR',{pos:[.28,-.20,.02],scale:[.18,.16,.16],roughness:.99});
  patch(model,'browL',{pos:[-.250,.225,.650],scale:[.082,.006,.007],roughness:.92,rot:[0,0,.08],alpha:.24});patch(model,'browR',{pos:[.250,.225,.650],scale:[.082,.006,.007],roughness:.92,rot:[0,0,-.08],alpha:.24});
  patch(model,'thighL',{pos:[-.02,-.20,-.07],scale:[.38,.43,.39],roughness:.97});patch(model,'thighR',{pos:[.02,-.20,-.07],scale:[.38,.43,.39],roughness:.97});
  patch(model,'shinL',{geometry:'sphere',pos:[-.04,-.43,.12],scale:[.31,.31,.33],roughness:.97,rot:[.04,0,0]});patch(model,'shinR',{geometry:'sphere',pos:[.04,-.43,.12],scale:[.31,.31,.33],roughness:.97,rot:[.04,0,0]});
  patch(model,'footL',{pos:[-.09,-.57,.45],scale:[.43,.29,.49],roughness:.97,rot:[.10,0,-.08]});patch(model,'footR',{pos:[.09,-.57,.45],scale:[.43,.29,.49],roughness:.97,rot:[.10,0,.08]});
  patch(model,'footPadL',{pos:[-.09,-.56,.785]});patch(model,'footPadR',{pos:[.09,-.56,.785]});patch(model,'heelPadL',{pos:[-.09,-.645,.825]});patch(model,'heelPadR',{pos:[.09,-.645,.825]});
  patch(model,'toeL1',{pos:[-.24,-.465,.825]});patch(model,'toeL2',{pos:[-.09,-.445,.835]});patch(model,'toeL3',{pos:[.06,-.465,.825]});patch(model,'toeR1',{pos:[-.06,-.465,.825]});patch(model,'toeR2',{pos:[.09,-.445,.835]});patch(model,'toeR3',{pos:[.24,-.465,.825]});
  patch(model,'handL',{scale:[.27,.25,.23]});patch(model,'handR',{scale:[.27,.25,.23]});
  patch(model,'handPadL',{scale:[.145,.12,.030]});patch(model,'handPadR',{scale:[.145,.12,.030]});
  return model;
}

export class RealisticTeddyRenderer extends TeddyRenderer{
  constructor(canvas,config){super(canvas,config);tuneTeddyModel(this.model)}
  partTransform(part,groups,sec,pose){
    const speech=part.id==='mouthCavity'?{...pose,jaw:pose.jaw*.58}:pose;
    const model=super.partTransform(part,groups,sec,speech);
    if(part.id==='mouthCavity'&&pose.jaw<.08)return compose(model,M4.scale(1,.001,1));
    return part.id==='tongue'&&pose.jaw<.22?compose(model,M4.scale(.001,.001,.001)):model;
  }
}

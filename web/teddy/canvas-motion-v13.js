import {TeddyRenderer} from './render.js';
import {FLOOR_Y} from './model.js';

// Consume the same posed bone matrices and partTransform() as the WebGL2 path.
// This is intentionally a 2D rasterizer for existing parts, not a second rig.
export function canvasMotionPrimitives(renderer,seconds){
  const groups=renderer.groupMatrices(seconds,renderer.pose);
  return renderer.model.parts.map(part=>{
    const m=renderer.partTransform(part,groups,seconds,renderer.pose);
    // Orthographic projection of the transformed ellipsoid axes into screen XY.
    const xx=m[0]*m[0]+m[4]*m[4]+m[8]*m[8]*.04;
    const yy=m[1]*m[1]+m[5]*m[5]+m[9]*m[9]*.04;
    const xy=m[0]*m[1]+m[4]*m[5];
    const delta=Math.hypot(xx-yy,2*xy),major=Math.max(.000025,(xx+yy+delta)*.5);
    const minor=Math.max(.000025,(xx+yy-delta)*.5);
    return {id:part.id,material:part.material,x:m[12],y:m[13],z:m[14],
      rx:Math.sqrt(major),ry:Math.sqrt(minor),angle:.5*Math.atan2(2*xy,xx-yy)};
  }).filter(p=>Number.isFinite(p.x+p.y+p.z+p.rx+p.ry))
    .sort((a,b)=>a.z-b.z);
}
const tone=(hex,k)=>{
  const digits=String(hex||'#8a5a3b').replace('#','').slice(0,6);
  const n=parseInt(digits,16)||0;
  const adjust=v=>Math.round(Math.max(0,Math.min(255,v+(k>=0?(255-v):v)*k)));
  return 'rgb('+[n>>16&255,n>>8&255,n&255].map(adjust).join(',')+')';
};
function materialColor(appearance,material){
  const fur=appearance.fur||'#8a5a3b',muzzle=appearance.muzzle||'#d1a173',eye=appearance.eyes||'#17100d';
  if(material==='eyes'||material==='mouth'||material==='mouthCavity')return eye;
  if(material==='highlight')return '#fff9e9';
  if(material==='tongue')return '#ad5562';
  if(material==='muzzle'||material==='belly')return muzzle;
  if(material==='innerEar')return tone(muzzle,-.16);
  if(material==='paw'||material==='pawDark')return tone(fur,-.21);
  if(material==='muzzleDark')return tone(muzzle,-.19);
  if(material==='brow')return tone(fur,-.35);
  return fur;
}
export function drawCanvasMotion(renderer){
  const c=renderer.ctx;if(!c)return;
  const w=renderer.canvas.width,h=renderer.canvas.height;
  const scale=Math.min(w*.285,h*.215),cx=w*.5,cy=h*.55;
  const appearance=renderer.config.appearance;
  const parts=canvasMotionPrimitives(renderer,renderer.lastPose||0);
  c.clearRect(0,0,w,h);
  c.fillStyle=appearance.background||'#0b0c10';c.fillRect(0,0,w,h);
  // The shadow is a transparent decal. Teddy's parts remain entirely opaque.
  c.save();c.globalAlpha=.22;c.fillStyle='#090705';c.beginPath();
  const world=renderer.motionStatus?.()?.world||{};
  c.ellipse(cx+(world.x||0)*scale,cy-FLOOR_Y*scale,.75*scale,.095*scale,0,0,Math.PI*2);c.fill();c.restore();
  for(const part of parts){
    const X=cx+part.x*scale,Y=cy-part.y*scale;
    const rx=Math.max(.5,part.rx*scale),ry=Math.max(.5,part.ry*scale);
    const color=materialColor(appearance,part.material);
    c.save();c.translate(X,Y);c.rotate(-part.angle);
    c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);
    const g=c.createRadialGradient(-rx*.22,-ry*.26,Math.max(1,rx*.04),0,0,Math.max(rx,ry));
    g.addColorStop(0,tone(color,.13));g.addColorStop(.75,color);g.addColorStop(1,tone(color,-.19));
    c.fillStyle=g;c.fill();
    if(renderer.furEnabled&&['fur','belly','innerEar','paw'].includes(part.material)&&rx>7&&ry>7){
      c.save();c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.clip();
      c.strokeStyle=tone(color,.27);c.globalAlpha=.15;c.lineWidth=Math.max(.5,scale*.003);
      for(let i=0;i<12;i++){
        const a=(i*.61803398875)%1,b=(i*.7548776662)%1;
        const x=(a*1.8-.9)*rx,y=(b*1.8-.9)*ry;
        c.beginPath();c.moveTo(x,y);c.lineTo(x+1.3,y-2.8);c.stroke();
      }
      c.restore();
    }
    c.restore();
  }
}
export function installCanvasMotionV13(){
  if(TeddyRenderer.prototype.__canvasMotionV13)return;
  TeddyRenderer.prototype.__canvasMotionV13=true;
  TeddyRenderer.prototype.frame2d=function(){return drawCanvasMotion(this)};
}

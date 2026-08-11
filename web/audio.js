export class AudioPresence{
  constructor(audioEl,onLevel){this.audioEl=audioEl;this.onLevel=onLevel;this.ctx=null;this.an=null;this.data=null;this.src=null;this.gain=null;this.raf=0;this.fallback=false}
  async attach(stream,outputGain=1){
    this.stop(false);this.fallback=false;
    try{
      if(!this.ctx||this.ctx.state==='closed')this.ctx=new AudioContext();await this.ctx.resume();
      this.src=this.ctx.createMediaStreamSource(stream);this.gain=this.ctx.createGain();this.gain.gain.value=Math.max(0,Math.min(2,Number(outputGain)||1));this.an=this.ctx.createAnalyser();this.an.fftSize=256;this.an.smoothingTimeConstant=.72;
      this.src.connect(this.gain);this.gain.connect(this.an);this.gain.connect(this.ctx.destination);this.data=new Uint8Array(this.an.frequencyBinCount);this.tick();
    }catch{
      this.fallback=true;this.audioEl.srcObject=stream;this.audioEl.volume=Math.min(1,Math.max(0,Number(outputGain)||1));await this.audioEl.play().catch(()=>{});
    }
  }
  tick(){if(!this.an)return;this.an.getByteFrequencyData(this.data);let sum=0;for(let i=2;i<48;i++)sum+=this.data[i];const v=Math.min(1,sum/(46*105));this.onLevel(v);this.raf=requestAnimationFrame(()=>this.tick())}
  stop(suspend=true){cancelAnimationFrame(this.raf);try{this.src?.disconnect()}catch{};try{this.gain?.disconnect()}catch{};try{this.an?.disconnect()}catch{};this.src=null;this.gain=null;this.an=null;this.data=null;this.audioEl.srcObject=null;this.onLevel(0);if(suspend&&this.ctx?.state==='running')this.ctx.suspend().catch(()=>{})}
}

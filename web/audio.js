const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const finite=(v,d=1)=>Number.isFinite(Number(v))?Number(v):d;
export const normalizeOutputGain=(v,max=2)=>Math.max(0,Math.min(max,finite(v,1)));
const smooth=(value,target,speed,dt)=>value+(target-value)*(1-Math.exp(-Math.max(0,speed)*Math.max(0,dt)));

function bandEnergy(freq,fromHz,toHz,sampleRate,fftSize){
  const hzPerBin=sampleRate/fftSize,start=Math.max(1,Math.floor(fromHz/hzPerBin)),end=Math.min(freq.length-1,Math.ceil(toHz/hzPerBin));let sum=0,n=0;
  for(let i=start;i<=end;i++){const x=freq[i]/255;sum+=x*x;n++;}
  return n?Math.sqrt(sum/n):0;
}

export function analyzeAudioFrame(timeData,freqData,previous={},sampleRate=48000,fftSize=512,dt=1/60,at=0){
  const n=Math.max(1,timeData?.length||0);let sq=0,peak=0;
  for(let i=0;i<n;i++){const x=((timeData?.[i]??128)-128)/128;sq+=x*x;peak=Math.max(peak,Math.abs(x));}
  const raw=Math.sqrt(sq/n),clipped=peak>.985;
  let noise=Number.isFinite(previous.noiseFloor)?previous.noiseFloor:.012;
  const noiseTarget=Math.min(raw,.08),noiseSpeed=raw<noise*1.8?1.8:.12;noise=smooth(noise,noiseTarget,noiseSpeed,dt);noise=clamp(noise,.004,.09);
  const gate=noise*1.7+.006,normalized=clamp((raw-gate)/Math.max(.035,.20-gate));
  const priorLevel=clamp(previous.level),level=smooth(priorLevel,normalized,normalized>priorLevel?24:12,dt);
  const low=bandEnergy(freqData||[],90,320,sampleRate,fftSize),mid=bandEnergy(freqData||[],320,1700,sampleRate,fftSize),high=bandEnergy(freqData||[],1700,5200,sampleRate,fftSize),sum=low+mid+high;
  const brightness=sum>.01?clamp((high*.95+mid*.28)/sum):.45;
  const prevActive=!!previous.active,on=level>.075||raw>gate+.028,off=level<.035&&raw<gate+.012,active=prevActive?!off:on;
  const attack=clamp(Math.max(0,level-priorLevel)/Math.max(.008,dt)*.055),plosive=clamp(attack*(.35+low*.9));
  return {level,raw:clamp(raw*4),low:clamp(low),mid:clamp(mid),high:clamp(high),brightness,attack,plosive,active,clipped,noiseFloor:noise,peak,at:Number(at)||0};
}

function emitVoice(frame){
  if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('teddy:voice',{detail:frame}));
}

export class AudioPresence{
  constructor(audioEl,onLevel){this.audioEl=audioEl;this.onLevel=onLevel;this.ctx=null;this.an=null;this.time=null;this.freq=null;this.src=null;this.gain=null;this.comp=null;this.raf=0;this.fallback=false;this.voice={level:0,noiseFloor:.012,active:false};this.lastTick=0;}
  async attach(stream,outputGain=1){
    this.stop(false);this.fallback=false;
    try{
      if(!this.ctx||this.ctx.state==='closed')this.ctx=new AudioContext();await this.ctx.resume();
      this.src=this.ctx.createMediaStreamSource(stream);this.gain=this.ctx.createGain();this.gain.gain.value=normalizeOutputGain(outputGain,2);
      this.comp=this.ctx.createDynamicsCompressor();this.comp.threshold.value=-10;this.comp.knee.value=14;this.comp.ratio.value=4;this.comp.attack.value=.003;this.comp.release.value=.18;
      this.an=this.ctx.createAnalyser();this.an.fftSize=512;this.an.smoothingTimeConstant=.28;
      this.src.connect(this.gain).connect(this.comp).connect(this.an).connect(this.ctx.destination);
      this.time=new Uint8Array(this.an.fftSize);this.freq=new Uint8Array(this.an.frequencyBinCount);this.lastTick=performance.now();this.tick(this.lastTick);
    }catch{
      this.fallback=true;this.audioEl.srcObject=stream;this.audioEl.volume=normalizeOutputGain(outputGain,1);emitVoice({level:0,active:false,fallback:true,at:performance.now()});await this.audioEl.play().catch(()=>{});
    }
  }
  tick(now=performance.now()){
    if(!this.an)return;this.an.getByteTimeDomainData(this.time);this.an.getByteFrequencyData(this.freq);const dt=Math.max(.008,Math.min(.12,(now-this.lastTick)/1000||1/60));this.lastTick=now;
    this.voice=analyzeAudioFrame(this.time,this.freq,this.voice,this.ctx?.sampleRate||48000,this.an.fftSize,dt,now/1000);this.onLevel?.(this.voice.level,this.voice);emitVoice(this.voice);this.raf=requestAnimationFrame(t=>this.tick(t));
  }
  stop(suspend=true){
    cancelAnimationFrame(this.raf);try{this.src?.disconnect()}catch{};try{this.gain?.disconnect()}catch{};try{this.comp?.disconnect()}catch{};try{this.an?.disconnect()}catch{};this.src=null;this.gain=null;this.comp=null;this.an=null;this.time=null;this.freq=null;this.audioEl.srcObject=null;this.voice={level:0,noiseFloor:this.voice?.noiseFloor||.012,active:false};this.onLevel?.(0,this.voice);emitVoice({...this.voice,at:typeof performance!=='undefined'?performance.now()/1000:0});if(suspend&&this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});
  }
}

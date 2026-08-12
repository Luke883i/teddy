export class TeddyRealtime extends EventTarget{
  constructor(config){super();this.config=config;this.pc=null;this.dc=null;this.local=null;this.inputCtx=null;this.processedTrack=null}
  async connect(){
    if(this.pc)return;
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Microfono non disponibile in questo browser.');
    this.pc=new RTCPeerConnection();
    this.pc.addEventListener('connectionstatechange',()=>this.emit('state',this.pc.connectionState));
    this.pc.addEventListener('iceconnectionstatechange',()=>this.emit('ice',this.pc.iceConnectionState));
    this.pc.ontrack=e=>this.emit('remote',e.streams[0]||new MediaStream([e.track]));
    try{
      this.local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:this.config.audio.echoCancellation,noiseSuppression:this.config.audio.noiseSuppression,autoGainControl:this.config.audio.autoGainControl},video:false});
      let track=this.local.getAudioTracks()[0];if(!track)throw Error('Nessuna traccia microfono.');
      const inputGain=Number(this.config.audio.inputGain||1);
      if(Math.abs(inputGain-1)>.01&&window.AudioContext){
        this.inputCtx=new AudioContext();await this.inputCtx.resume();const src=this.inputCtx.createMediaStreamSource(this.local),gain=this.inputCtx.createGain(),dest=this.inputCtx.createMediaStreamDestination();gain.gain.value=inputGain;src.connect(gain).connect(dest);this.processedTrack=dest.stream.getAudioTracks()[0];track=this.processedTrack;
      }
      this.pc.addTrack(track,this.local);
      this.dc=this.pc.createDataChannel('oai-events');
      this.dc.addEventListener('open',()=>this.emit('data','open'));
      this.dc.addEventListener('message',e=>{try{this.emit('event',JSON.parse(e.data))}catch{}});
      const offer=await this.pc.createOffer();await this.pc.setLocalDescription(offer);
      const r=await fetch('/api/realtime/session',{method:'POST',headers:{'content-type':'application/sdp'},body:offer.sdp});
      if(!r.ok){let detail='';try{detail=JSON.stringify(await r.json())}catch{detail=await r.text()}throw Error(detail||`Realtime ${r.status}`)}
      await this.pc.setRemoteDescription({type:'answer',sdp:await r.text()});
    }catch(e){this.close();throw e}
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}))}
  close(){
    try{this.dc?.close()}catch{};for(const t of this.local?.getTracks()||[])t.stop();try{this.processedTrack?.stop()}catch{};try{this.pc?.close()}catch{};try{this.inputCtx?.close()}catch{};
    this.pc=null;this.dc=null;this.local=null;this.inputCtx=null;this.processedTrack=null;
  }
}

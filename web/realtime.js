export class TeddyConnectionError extends Error{
  constructor(problem={}){super(problem.error||problem.message||'realtime_connection_failed');this.name='TeddyConnectionError';this.problem=problem;this.status=Number(problem.status)||0;this.kind=problem.kind||'unknown';this.retryAfterSeconds=Number(problem.retryAfterSeconds)||0}
}
async function responseProblem(r){
  let text='';try{text=await r.text()}catch{}let body={};try{body=text?JSON.parse(text):{}}catch{body={message:text.slice(0,500)}}
  const retryHeader=Number(r.headers.get('retry-after'))||0;return {...body,status:Number(body.status)||r.status,retryAfterSeconds:Number(body.retryAfterSeconds)||retryHeader||0};
}
async function fetchWithTimeout(url,options={},timeoutMs=25_000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new DOMException('Timed out','TimeoutError')),timeoutMs);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}
}
function waitForPeer(pc,timeoutMs=15_000){
  return new Promise((resolve,reject)=>{let done=false;const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);pc.removeEventListener('connectionstatechange',onState);fn(value)};const onState=()=>{const s=pc.connectionState;if(s==='connected')finish(resolve);else if(['failed','closed'].includes(s))finish(reject,new TeddyConnectionError({error:'webrtc_transport_failed',kind:'webrtc',status:0,retryable:true}))};const timer=setTimeout(()=>finish(reject,new TeddyConnectionError({error:'webrtc_connect_timeout',kind:'webrtc',status:0,retryable:true,retryAfterSeconds:2})),timeoutMs);pc.addEventListener('connectionstatechange',onState);onState()});
}
export class TeddyRealtime extends EventTarget{
  constructor(config){super();this.config=config;this.pc=null;this.dc=null;this.local=null;this.inputCtx=null;this.processedTrack=null}
  async connect(){
    if(this.pc)return;if(!navigator.mediaDevices?.getUserMedia)throw new TeddyConnectionError({error:'microphone_unavailable',kind:'media',retryable:false});
    this.pc=new RTCPeerConnection();this.pc.addEventListener('connectionstatechange',()=>this.emit('state',this.pc?.connectionState||'closed'));this.pc.addEventListener('iceconnectionstatechange',()=>this.emit('ice',this.pc?.iceConnectionState||'closed'));this.pc.ontrack=e=>this.emit('remote',e.streams[0]||new MediaStream([e.track]));
    try{
      this.local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:this.config.audio.echoCancellation,noiseSuppression:this.config.audio.noiseSuppression,autoGainControl:this.config.audio.autoGainControl},video:false});let track=this.local.getAudioTracks()[0];if(!track)throw new TeddyConnectionError({error:'microphone_track_missing',kind:'media',retryable:false});
      const inputGain=Number(this.config.audio.inputGain||1);if(Math.abs(inputGain-1)>.01&&window.AudioContext){this.inputCtx=new AudioContext();await this.inputCtx.resume();const src=this.inputCtx.createMediaStreamSource(this.local),gain=this.inputCtx.createGain(),dest=this.inputCtx.createMediaStreamDestination();gain.gain.value=inputGain;src.connect(gain).connect(dest);this.processedTrack=dest.stream.getAudioTracks()[0];track=this.processedTrack}
      this.pc.addTrack(track,this.local);this.dc=this.pc.createDataChannel('oai-events');this.dc.addEventListener('open',()=>this.emit('data','open'));this.dc.addEventListener('message',e=>{try{this.emit('event',JSON.parse(e.data))}catch{}});
      const offer=await this.pc.createOffer();await this.pc.setLocalDescription(offer);const r=await fetchWithTimeout('/api/realtime/session',{method:'POST',headers:{'content-type':'application/sdp'},body:offer.sdp});if(!r.ok)throw new TeddyConnectionError(await responseProblem(r));await this.pc.setRemoteDescription({type:'answer',sdp:await r.text()});await waitForPeer(this.pc);
    }catch(e){const timeout=e?.name==='TimeoutError'||e?.name==='AbortError';const problem=e instanceof TeddyConnectionError?e:new TeddyConnectionError({error:timeout?'realtime_client_timeout':e?.name==='NotAllowedError'?'microphone_permission_denied':e?.name==='NotFoundError'?'microphone_not_found':'realtime_client_error',kind:timeout?'network':e?.name?.startsWith?.('Not')?'media':'client',retryable:timeout,message:e?.message,retryAfterSeconds:timeout?2:0});this.close();throw problem}
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}))}
  close(){try{this.dc?.close()}catch{};for(const t of this.local?.getTracks()||[])t.stop();try{this.processedTrack?.stop()}catch{};try{this.pc?.close()}catch{};try{this.inputCtx?.close()}catch{};this.pc=null;this.dc=null;this.local=null;this.inputCtx=null;this.processedTrack=null}
}

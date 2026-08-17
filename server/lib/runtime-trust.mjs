const SHA256=/^[0-9a-f]{64}$/i;
export const QWEN_PIN=Object.freeze({
  repository:'Qwen/Qwen3-0.6B-GGUF',
  revision:'1eaf4d9657fe65ad10a51eab76a8db5b363bddaa',
  name:'Qwen3-0.6B-Q8_0.gguf',
  sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031'
});
export const LEGACY_RELEASE_TRUST=Object.freeze({
  'asr-whisper-tiny':Object.freeze({repo:'k2-fsa/sherpa-onnx',tag:'asr-models',name:'sherpa-onnx-whisper-tiny.tar.bz2'}),
  'tts-riccardo':Object.freeze({repo:'k2-fsa/sherpa-onnx',tag:'tts-models',name:'vits-piper-it_IT-riccardo-x_low.tar.bz2'})
});
export function releaseDownloadUrl(repo,tag,name){return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`}
export function classifyReleaseTrust({repo,tag,artifactId,asset,digest}={}){
  const sha256=String(digest||'').toLowerCase();if(SHA256.test(sha256))return {trust:'sha256',sha256};
  const profile=LEGACY_RELEASE_TRUST[artifactId];
  if(profile&&profile.repo===repo&&profile.tag===tag&&profile.name===asset?.name&&asset?.browser_download_url===releaseDownloadUrl(repo,tag,asset.name)&&Number(asset?.size)>0)return {trust:'legacy_release_identity',sha256:null};
  throw Object.assign(new Error('artifact_integrity_metadata_missing'),{code:'artifact_integrity_metadata_missing',stage:'verify',artifactId,retryable:false});
}
export function qwenUrl(){return `https://huggingface.co/${QWEN_PIN.repository}/resolve/${QWEN_PIN.revision}/${QWEN_PIN.name}?download=true`}

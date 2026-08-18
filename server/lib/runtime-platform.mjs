const supported=Object.freeze({
  linux:Object.freeze(['x64','arm64']),
  darwin:Object.freeze(['x64','arm64']),
  win32:Object.freeze(['x64'])
});

export const RUNTIME_PLATFORM_MATRIX=supported;

export function runtimePlatformSpec(platform=process.platform,arch=process.arch,{sherpaVersion='1.13.3'}={}){
  if(!supported[platform]?.includes(arch))throw Object.assign(new Error('runtime_platform_unsupported'),{code:'runtime_platform_unsupported',stage:'catalog',retryable:false,platform,arch});
  if(platform==='linux')return Object.freeze({platform,arch,sherpa:`sherpa-onnx-v${sherpaVersion}-linux-${arch==='arm64'?'aarch64':'x64'}-static.tar.bz2`,llamaNeedle:`bin-ubuntu-${arch}`,llamaArchive:'tar',executableSuffix:'',tarCommand:'tar'});
  if(platform==='darwin')return Object.freeze({platform,arch,sherpa:`sherpa-onnx-v${sherpaVersion}-osx-${arch}-static.tar.bz2`,llamaNeedle:`bin-macos-${arch}`,llamaArchive:'tar',executableSuffix:'',tarCommand:'tar'});
  return Object.freeze({platform,arch,sherpa:`sherpa-onnx-v${sherpaVersion}-win-x64-static-MD-Release.tar.bz2`,llamaNeedle:'bin-win-cpu-x64',llamaArchive:'zip',executableSuffix:'.exe',tarCommand:'tar.exe'});
}

export function runtimeExecutableName(base,spec=runtimePlatformSpec()){return `${base}${spec.executableSuffix}`}
export function llamaAssetMatches(name,spec=runtimePlatformSpec()){
  const value=String(name||'');
  return value.includes(spec.llamaNeedle)&&(spec.llamaArchive==='zip'?value.endsWith('.zip'):/\.tar\.(?:gz|bz2)$/.test(value));
}
export function requiresExecutableBit(spec=runtimePlatformSpec()){return spec.platform!=='win32'}

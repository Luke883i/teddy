import fs from 'node:fs';
import path from 'node:path';

export function textReadyState({engines={},selfTest=null,currentGeneration=null}={}){
  return engines?.llm?.healthy===true && Boolean(currentGeneration?.id) && (currentGeneration.id==='external'||selfTest?.ok===true);
}
function inside(root,file){
  if(typeof file!=='string'||!path.isAbsolute(file))return false;
  const relative=path.relative(path.resolve(root),path.resolve(file));
  if(!relative||relative==='..'||relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative))return false;
  try{
    const canonicalRoot=fs.realpathSync(root),canonicalFile=fs.realpathSync(file),rel=path.relative(canonicalRoot,canonicalFile);
    return Boolean(rel && rel!=='..'&&!rel.startsWith(`..${path.sep}`)&&!path.isAbsolute(rel)&&fs.statSync(canonicalFile).isFile());
  }catch{return false}
}
export function validateTextGeneration(root,config){
  const port=Number(config?.llama?.port);
  if(!Number.isInteger(port)||port<1||port>65535)throw Object.assign(new Error('text_runtime_port_invalid'),{code:'text_runtime_port_invalid'});
  for(const property of ['executable','model']){
    if(!inside(root,config?.llama?.[property]))throw Object.assign(new Error('text_runtime_generation_invalid'),{code:'text_runtime_generation_invalid',property});
  }
  fs.accessSync(config.llama.executable,fs.constants.X_OK);
  return true;
}

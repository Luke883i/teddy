const SPECS=Object.freeze({
  'sherpa-runtime':Object.freeze({role:'runtime',publisher:'k2-fsa',version:'1.13.3',hosts:['github.com']}),
  'asr-whisper-tiny':Object.freeze({role:'asr',publisher:'k2-fsa',version:'tiny-multilingual',hosts:['github.com']}),
  'tts-riccardo':Object.freeze({role:'tts',publisher:'k2-fsa',version:'it_IT-riccardo-x_low',hosts:['github.com']}),
  'llama-runtime':Object.freeze({role:'runtime',publisher:'ggml-org',version:'b10218',hosts:['github.com']}),
  'qwen3-0.6b':Object.freeze({role:'llm',publisher:'QuantFactory',version:'Q4_K_M',hosts:['huggingface.co']})
});
const IDS=Object.freeze(Object.keys(SPECS)),SHA256=/^[0-9a-f]{64}$/i;
export const RUNTIME_CATALOG_SCHEMA=1;
export const RUNTIME_CATALOG_IDS=IDS;
const text=v=>typeof v==='string'?v.trim():'';
const safeSource=(id,value)=>{try{const u=new URL(value),spec=SPECS[id];return u.protocol==='https:'&&spec.hosts.includes(u.hostname)}catch{return false}};
export function runtimeCatalogKey({platform,arch,sherpaVersion,llamaBuild,asrModel,ttsModel,qwenModel}={}){const fields=[platform,arch,sherpaVersion,llamaBuild,asrModel,ttsModel,qwenModel].map(text);if(fields.some(v=>!v))throw new TypeError('runtime catalog key incomplete');return fields.join('|')}
export function runtimeCatalogCacheRecord(key,artifacts,{createdAt=new Date().toISOString()}={}){const normalized=normalizeArtifacts(artifacts);if(!normalized)throw new TypeError('runtime catalog invalid');return {schema:RUNTIME_CATALOG_SCHEMA,key:text(key),createdAt,artifacts:normalized.map(({phase,downloadedBytes,verified,catalogSource,...a})=>a)}}
export function hydrateRuntimeCatalogCache(record,key){if(!record||record.schema!==RUNTIME_CATALOG_SCHEMA||text(record.key)!==text(key))return null;const normalized=normalizeArtifacts(record.artifacts);if(!normalized)return null;return normalized.map(a=>({...a,phase:'pending',downloadedBytes:0,verified:false,catalogSource:'cache'}))}
function normalizeArtifacts(artifacts){if(!Array.isArray(artifacts)||artifacts.length!==IDS.length)return null;const seen=new Set(),out=[];for(const raw of artifacts){const id=text(raw?.id),spec=SPECS[id],role=text(raw?.role),name=text(raw?.name),version=text(raw?.version),publisher=text(raw?.publisher),source=text(raw?.source),sha256=text(raw?.sha256).toLowerCase(),totalBytes=Number(raw?.totalBytes||0);if(!spec||seen.has(id)||role!==spec.role||publisher!==spec.publisher||version!==spec.version||!name||!safeSource(id,source)||!SHA256.test(sha256)||!Number.isFinite(totalBytes)||totalBytes<0)return null;seen.add(id);out.push({id,role,name,version,publisher,source,totalBytes,sha256})}if(IDS.some(id=>!seen.has(id)))return null;return IDS.map(id=>out.find(a=>a.id===id))}

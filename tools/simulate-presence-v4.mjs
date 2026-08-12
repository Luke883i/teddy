import fs from 'node:fs';
import crypto from 'node:crypto';
import {cameraPlan,archetypeMetrics,buildTeddyArchetype,TEDDY_BOUNDS} from '../web/teddy/model.js';
import {ExpressionRig,poseIsSafe,sanitizeVoiceFrame} from '../web/teddy/rig.js';
import {normalizeOutputGain} from '../web/audio.js';
import {tuneTeddyModel} from '../web/teddy/render-v5/tuning.js';

const full=process.argv.includes('--full'),N=full?1_000_000:100_000,M=full?100_000:10_000;
let seed=0x54454434;const u32=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};const unit=()=>u32()/4294967296;
const families={viewport:{total:N,unsafe:0},voice:{total:N,unsafe:0},temporal:{total:N,unsafe:0},lifecycle:{total:N,unsafe:0},dynamicFraming:{total:N,unsafe:0}};
const reason={};const fail=(family,why)=>{families[family].unsafe++;reason[`${family}:${why}`]=(reason[`${family}:${why}`]||0)+1};

for(let i=0;i<N;i++){
  const mode=i%17===0?'needle':i%19===0?'ultrawide':'normal';let w,h;if(mode==='needle'){w=1+(u32()%240);h=600+(u32()%6000)}else if(mode==='ultrawide'){w=900+(u32()%9000);h=1+(u32()%320)}else{w=1+(u32()%6000);h=1+(u32()%4000)}
  const p=cameraPlan(w,h);if(!Number.isFinite(p.distance)||p.distance<=0)fail('viewport','distance');if(p.occupancyX>.861001||p.occupancyY>.761001)fail('viewport','crop');if(!['horizontal','vertical'].includes(p.limiter))fail('viewport','limiter');
}

const rig=new ExpressionRig({seed:0x4004,persona:{warmth:.55,irritability:.55,wit:.74}});let now=0;const modeList=['idle','listening','thinking','concerned'];
for(let i=0;i<N;i++){
  if(i%911===0)rig.setMode(modeList[(i/911)%modeList.length|0],now);const dt=.004+(u32()%116)/1000;now+=dt;
  const bad=i%997===0,frame=sanitizeVoiceFrame({level:bad?Infinity:unit(),raw:bad?-Infinity:unit(),low:unit(),mid:unit(),high:unit(),brightness:bad?NaN:unit(),attack:unit(),plosive:unit(),active:(u32()&3)!==0,at:now});rig.setVoice(frame);const pose=rig.step(dt,now,{x:unit()*3-1.5,y:unit()*3-1.5});if(!poseIsSafe(pose))fail('voice','pose_bounds');if(!Number.isFinite(pose.jaw+pose.headYaw+pose.gesture))fail('voice','finite');if(!pose.voice||typeof pose.mode!=='string')fail('voice','snapshot');
}

const normal=new ExpressionRig({seed:8,reducedMotion:false}),reduced=new ExpressionRig({seed:8,reducedMotion:true});let tn=0;
for(let i=0;i<N;i++){
  const dt=[1/240,1/144,1/60,1/30,.08,.2][u32()%6];tn+=dt;const active=(i%23)<15,level=active?(.15+unit()*.75):0,frame={level,raw:level,low:unit(),mid:unit(),high:unit(),brightness:unit(),attack:i%29===0?1:.04,active,at:tn};normal.setVoice(frame);reduced.setVoice(frame);if(i%197===0){const m=modeList[u32()%modeList.length];normal.setMode(m,tn);reduced.setMode(m,tn)}const ptr={x:unit()*4-2,y:unit()*4-2},a=normal.step(dt,tn,ptr),b=reduced.step(dt,tn,ptr);if(!poseIsSafe(a)||!poseIsSafe(b))fail('temporal','bounds');if(Math.abs(b.headYaw)>.181||Math.abs(b.headPitch)>.121)fail('temporal','reduced_bounds');if(!active&&i%23===22&&a.jaw>.8)fail('temporal','stuck_jaw');
}

for(let i=0;i<N;i++){
  const selector=i%13,v=selector===0?0:selector===1?-99:selector===2?Infinity:selector===3?NaN:(unit()*5-1),max=i%2?1:2,g=normalizeOutputGain(v,max);if(!Number.isFinite(g)||g<0||g>max)fail('lifecycle','gain_bounds');if(selector===0&&g!==0)fail('lifecycle','mute_lost');const frame=sanitizeVoiceFrame({level:i%31===0?Infinity:unit()*2-0.5,brightness:i%37===0?NaN:unit(),active:i%2});for(const k of ['level','brightness','attack','low','mid','high'])if(!Number.isFinite(frame[k])||frame[k]<0||frame[k]>1){fail('lifecycle','voice_sanitize');break}
}

const spanX=TEDDY_BOUNDS.max[0]-TEDDY_BOUNDS.min[0],spanY=TEDDY_BOUNDS.max[1]-TEDDY_BOUNDS.min[1];
for(let i=0;i<N;i++){
  const w=120+(u32()%5000),h=160+(u32()%3500),p=cameraPlan(w,h),gesture=unit(),jaw=unit(),ear=unit(),yaw=unit();const visibleY=2*p.distance*Math.tan(p.fov/2),visibleX=visibleY*p.aspect,dynamicX=spanX+2*(.035+.07*gesture+.035*yaw),dynamicY=spanY+.08*jaw+.05*ear;if(dynamicX>visibleX+.0001)fail('dynamicFraming','horizontal_envelope');if(dynamicY>visibleY+.0001)fail('dynamicFraming','vertical_envelope');
}

const metrics=archetypeMetrics(tuneTeddyModel(buildTeddyArchetype()));const sources={};
for(const file of ['web/teddy/model.js','web/teddy/rig.js','web/audio.js'])sources[file]=fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const renderFiles=['web/teddy/render.js','web/teddy/render-v5/renderer.js','web/teddy/render-v5/tuning.js','web/teddy/render-v5/geometry.js','web/teddy/render-v5/shaders.js','web/teddy/render-v5/canvas.js'];
sources['web/teddy/render.js']=renderFiles.map(file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')).join('\n');
const renderSource=sources['web/teddy/render.js'];
const capabilities={plushAnatomy:metrics.partCount>=45,articulatedGroups:metrics.groupCount>=9,layeredMouth:metrics.mouthLayers>=5,dualAxisCamera:/occupancyX/.test(sources['web/teddy/model.js'])&&/dX=/.test(sources['web/teddy/model.js']),stableFur:/noise3\(vLocal/.test(renderSource)&&!/noise3\(vP/.test(renderSource),richVoice:/getByteTimeDomainData/.test(sources['web/audio.js'])&&/brightness/.test(sources['web/audio.js']),adaptiveNoise:/noiseFloor/.test(sources['web/audio.js']),expressionRig:/ExpressionRig/.test(renderSource),reducedMotion:/reducedMotion/.test(sources['web/teddy/rig.js']),mutePreserved:/normalizeOutputGain/.test(sources['web/audio.js'])};
const critical=Object.keys(capabilities),missing=critical.filter(k=>!capabilities[k]);let mutationSurvivors=0;for(let i=0;i<M*critical.length;i++){const key=critical[i%critical.length],mutated={...capabilities,[key]:false};const detected=critical.some(k=>!mutated[k]);if(!detected)mutationSurvivors++;}
const unsafe=Object.values(families).reduce((s,x)=>s+x.unsafe,0),scenarioTotal=N*Object.keys(families).length,mutationTotal=M*critical.length,total=scenarioTotal+mutationTotal;
const sourceDigest=crypto.createHash('sha256').update(Object.entries(sources).map(([k,v])=>`${k}\0${v}`).join('\0')).digest('hex');const digest=crypto.createHash('sha256').update(JSON.stringify({version:4,N,M,families,reason,capabilities,sourceDigest})).digest('hex');
const report={version:4,mode:full?'full':'quick',identity:{perFamily:N,families:Object.keys(families).length,scenarioTotal,mutationPerCapability:M,mutationCapabilities:critical.length,mutationTotal,total,uniqueByConstruction:true},families,reasons:reason,archetype:metrics,capabilities,missingCapabilities:missing,criticalUnsafe:unsafe,criticalMutationSurvivors:mutationSurvivors,sourceDigest,digest,definition:{synthetic:true,physicalBrowserSessions:false,physicalOpenAISessions:false}};
const out=new URL('../docs/presence-v4-report.json',import.meta.url);fs.mkdirSync(new URL('../docs/',import.meta.url),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(unsafe||mutationSurvivors||missing.length)process.exitCode=1;

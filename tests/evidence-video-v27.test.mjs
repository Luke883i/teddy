import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assembleEvidenceVideo} from '../tools/assemble-evidence-video-v27.mjs';
const ffmpeg=spawnSync('ffmpeg',['-version'],{encoding:'utf8'});
test('real ffmpeg normalizes contrasting desktop and portrait browser frames before MP4 encoding',{skip:Boolean(ffmpeg.error)||ffmpeg.status!==0,timeout:40000},()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'teddy-video-v27-'));
 try{
   const frames=[];
   for(const [i,shape] of ['1280x800','390x844'].entries()){
     const out=path.join(root,'in-'+i+'.png');
     const src=spawnSync('ffmpeg',['-hide_banner','-nostdin','-y','-loglevel','error','-f','lavfi','-i','color=c=tan:s='+shape+':r=1','-frames:v','1',out],{encoding:'utf8',timeout:10000});
     assert.equal(src.status,0,src.stderr||String(src.error));frames.push(out);
   }
   const output=path.join(root,'evidence.mp4');
   const r=assembleEvidenceVideo({frames,output,workDir:root});
   assert.equal(r.frames,2);assert.equal(r.size,'960x540');assert.ok(fs.statSync(output).size>1000);
   const meta=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','default=noprint_wrappers=1',output],{encoding:'utf8'});
   if(!meta.error&&meta.status===0){assert.match(meta.stdout,/width=960/);assert.match(meta.stdout,/height=540/)}
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

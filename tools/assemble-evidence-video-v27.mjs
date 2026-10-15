// Teddy V27: normalize varying mobile/desktop browser PNGs before encoding evidence.
// MP4 is a sampled storyboard, not a continuous screen recording.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const checked=(args,timeout=30000)=>{
 const run=spawnSync('ffmpeg',args,{encoding:'utf8',timeout});
 if(run.error)throw Object.assign(new Error('ffmpeg_process_error: '+run.error.message),{code:'ffmpeg_process_error'});
 if(run.status!==0)throw Object.assign(new Error('ffmpeg_exit_'+run.status+': '+String(run.stderr||'').slice(-900)),{code:'ffmpeg_failed'});
};
export function assembleEvidenceVideo({frames,output,workDir}){
 if(!Array.isArray(frames)||!frames.length||frames.length>100)throw new Error('video_frames_invalid');
 if(!output||!workDir)throw new Error('video_destination_invalid');
 const normalized=path.join(workDir,'normalized-video-frames');
 fs.mkdirSync(normalized,{recursive:true});
 for(let i=0;i<frames.length;i++){
   const src=frames[i],dest=path.join(normalized,String(i+1).padStart(3,'0')+'.png');
   if(!fs.statSync(src).isFile())throw Error('video_frame_not_file_'+i);
   checked(['-hide_banner','-nostdin','-y','-loglevel','error','-i',src,
     '-vf','scale=960:540:force_original_aspect_ratio=decrease:flags=lanczos,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1',
     '-frames:v','1',dest],20000);
   if(!fs.statSync(dest).size)throw Error('video_normalized_frame_empty_'+i);
 }
 const input=path.join(normalized,'%03d.png');
 checked(['-hide_banner','-nostdin','-y','-loglevel','error','-framerate','1','-start_number','1','-i',input,
   '-frames:v',String(frames.length),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',output],60000);
 const bytes=fs.statSync(output).size;
 if(bytes<1000)throw Error('video_output_empty');
 return {created:true,frames:frames.length,bytes,format:'mp4',size:'960x540',type:'sampled-frame-storyboard'};
}

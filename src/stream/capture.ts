import {command} from './client';
/** Sharing is owned by the operator tab and survives panel navigation. */
export class TabRelay{
 private stream:MediaStream|null=null;private video:HTMLVideoElement|null=null;private timer:ReturnType<typeof setInterval>|null=null;private generation=0;private request:AbortController|null=null;onStatus:(active:boolean,message?:string)=>void=()=>{};
 async start(metadata:Record<string,unknown>){this.stop();const generation=++this.generation;const current=()=>generation===this.generation;const controller=new AbortController();this.request=controller;
 const media=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:15,max:30}},audio:false});if(!current()){media.getTracks().forEach(t=>t.stop());return;}this.stream=media;const track=media.getVideoTracks()[0];track.addEventListener('ended',()=>{if(current()){this.stop();this.onStatus(false,'Sharing ended. The output falls back safely.');}},{once:true});
 try{if(track.readyState==='ended')throw Error('Sharing ended during startup');const video=document.createElement('video');this.video=video;video.srcObject=media;video.muted=true;await video.play();if(!current())return;
 const added=await command('queue_add',{...metadata,source:'capture',duration:3600,tags:[],category:'live'},controller.signal);if(!current())return;const item=added.state?.queue.at(-1);if(!item)throw Error('Capture queue item was not created');await command('queue_play',{id:item.id},controller.signal);if(!current())return;if(media.getVideoTracks()[0]?.readyState!=='live')throw Error('Sharing ended during startup');this.onStatus(true);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=432;const ctx=canvas.getContext('2d')!;let busy=false;
 this.timer=setInterval(()=>{if(!current()||busy||video.readyState<2||track.readyState==='ended')return;const scale=Math.min(768/video.videoWidth,432/video.videoHeight);ctx.fillStyle='#090e10';ctx.fillRect(0,0,768,432);ctx.drawImage(video,(768-video.videoWidth*scale)/2,(432-video.videoHeight*scale)/2,video.videoWidth*scale,video.videoHeight*scale);busy=true;canvas.toBlob(async blob=>{try{if(blob&&current()){const r=await fetch('/api/capture',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob,signal:controller.signal});if(current()&&!r.ok&&r.status!==429){this.stop();this.onStatus(false,'Capture relay stopped. Check source permission and runtime.');}}}catch{if(current()){this.stop();this.onStatus(false,'Capture connection lost. Share again when the runtime is available.');}}finally{busy=false;}},'image/jpeg',.72);},350);
 }catch(e){if(current()){this.stop();throw e;}}
 }
 stop(){this.generation++;this.request?.abort();this.request=null;if(this.timer)clearInterval(this.timer);this.timer=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;if(this.video){this.video.pause();this.video.srcObject=null;this.video=null;}this.onStatus(false);}
}


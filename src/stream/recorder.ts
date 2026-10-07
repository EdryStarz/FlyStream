import type {FlyBrainState} from './types';
/** Retain complete bounded WebM files; incomplete container chunks are never exported. */
export class ClipRecorder{
 onStatus:(message:string)=>void=()=>{};
 onSegment:(segment:{id:string;at:number;blob:Blob})=>void=()=>{};
 private recorder:MediaRecorder|null=null;
 private stream:MediaStream|null=null;
 private raf=0;
 private timeout:ReturnType<typeof setTimeout>|null=null;
 private running=false;
 private canvas=document.createElement('canvas');
 private bytes=0;
 private generation=0;
 constructor(private state:()=>FlyBrainState|null,private scene:()=>HTMLCanvasElement|null){this.canvas.width=720;this.canvas.height=1280;}
 start(){
  if(!('MediaRecorder'in window)||!HTMLCanvasElement.prototype.captureStream)throw Error('This browser cannot record WebM. Marker export remains available.');
  if(this.running)return;this.running=true;const generation=++this.generation;
  const ctx=this.canvas.getContext('2d')!;let last=0;
  const draw=(now:number)=>{
   if(!this.running||generation!==this.generation)return;this.raf=requestAnimationFrame(draw);if(now-last<1000/24)return;last=now;
   const state=this.state(),source=this.scene();ctx.fillStyle='#111719';ctx.fillRect(0,0,720,1280);
   ctx.fillStyle='#79d6bc';ctx.font='600 46px Plex, sans-serif';ctx.fillText('M0XA / Мокса',38,77);
   ctx.fillStyle='#a9b8bd';ctx.font='20px Plex, sans-serif';ctx.fillText('FICTIONAL FLY · REAL PIXELS',40,114);
   if(source?.width){const scale=Math.max(720/source.width,720/source.height);ctx.save();ctx.beginPath();ctx.rect(0,155,720,720);ctx.clip();ctx.drawImage(source,(720-source.width*scale)/2,155+(720-source.height*scale)/2,source.width*scale,source.height*scale);ctx.restore();}
   if(state){
    const current=state.queue.find(item=>item.id===state.currentContentId);
    ctx.fillStyle='#e9eeed';ctx.font='25px Plex, sans-serif';ctx.fillText((state.safe?'SAFE SCENE':current?.title||'Лаборатория').slice(0,43),38,940);
    ctx.fillStyle='#79d6bc';ctx.font='19px Plex, sans-serif';ctx.fillText(`${state.character.mood} · CHARACTER`,38,980);
    if(current?.attribution&&!state.safe){ctx.font='16px Plex, sans-serif';ctx.fillStyle='#a9b8bd';const credit=current.attribution+' · '+current.license;for(let i=0;i<4;i++)ctx.fillText(credit.slice(i*72,(i+1)*72),38,1008+i*22);}
    ctx.fillStyle='#e9eeed';ctx.font='32px Plex, sans-serif';const text=state.character.speechExpiresAt>Date.now()&&!state.safe?state.character.subtitle:'';
    let line='',y=current?.attribution?1120:1040;
    for(const word of text.split(' ')){const next=line+word+' ';if(ctx.measureText(next).width>640&&line){ctx.fillText(line,38,y);line=word+' ';y+=45;if(y>1220)break;}else line=next;}
    if(y<=1220)ctx.fillText(line,38,y);
   }
  };
  this.raf=requestAnimationFrame(draw);this.stream=this.canvas.captureStream(24);this.segment(generation);
 }
 private segment(generation:number){
  if(!this.running||generation!==this.generation||!this.stream)return;
  const at=Date.now(),chunks:Blob[]=[];this.bytes=0;
  const mime=['video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  const recorder=new MediaRecorder(this.stream,mime?{mimeType:mime,videoBitsPerSecond:1800000}:undefined);this.recorder=recorder;
  recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);this.bytes+=event.data.size;if(this.bytes>16*1024*1024&&recorder.state==='recording')recorder.stop();}};
  recorder.onstop=()=>{if(this.recorder===recorder&&this.timeout)clearTimeout(this.timeout);if(chunks.length)this.onSegment({id:crypto.randomUUID(),at,blob:new Blob(chunks,{type:recorder.mimeType})});if(this.running&&generation===this.generation)this.segment(generation);else this.onStatus('Recording stopped · complete segment ready');};
  recorder.onerror=()=>{this.onStatus('Encoder failed · marker export remains available');this.stop();};
  recorder.start(1000);this.onStatus('Recording 9:16 · next complete segment in 30 seconds');this.timeout=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},30000);
 }
 stop(){this.running=false;cancelAnimationFrame(this.raf);if(this.timeout)clearTimeout(this.timeout);if(this.recorder?.state==='recording')this.recorder.stop();this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;}
}

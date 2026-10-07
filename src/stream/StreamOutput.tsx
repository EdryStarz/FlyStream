import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {FlyScene} from '../FlyScene';
import {VisionEngine,defaults,zeroMetrics} from '../engine';
import {drawSample} from '../sample';
import {Anatomy} from '../Anatomy';
import {getAnatomy,type Neuron} from '../vfb';
import type {FlyBrainState} from './types';
import {command,useBrain} from './client';
import {VoiceQueue,type VoiceStatus} from './voice';

export function StreamRoute(){const {state,connected}=useBrain();return state?<StreamOutput state={state} connected={connected}/>:<div className="stream-boot"><strong>M0XA</strong><p>Лаборатория готовится к эфиру.</p><span>Waiting for the local runtime</span></div>;}
export function StreamOutput({state,connected=true,preview=false,onRenderCanvas}:{state:FlyBrainState;connected?:boolean;preview?:boolean;onRenderCanvas?:(canvas:HTMLCanvasElement|null)=>void}){
 const original=useRef<HTMLCanvasElement>(null),retina=useRef<HTMLCanvasElement>(null),decoder=useRef<HTMLVideoElement>(null),image=useRef<HTMLImageElement>(null),webgl=useRef<HTMLCanvasElement|null>(null),metrics=useRef({...zeroMetrics});
 const [mediaError,setMediaError]=useState(''),[neurons,setNeurons]=useState<Neuron[]>([]),[voiceStatus,setVoiceStatus]=useState<VoiceStatus>({state:'Muted',latencyMs:0,queued:0,provider:'browser'});
 const latest=useRef(state);latest.current=state;const linkAlive=useRef(connected);linkAlive.current=connected;const voice=useRef<VoiceQueue|null>(null);
 const current=state.queue.find(i=>i.id===state.currentContentId),sourceId=current?.id;
 const science=state.settings.scienceUntil>Date.now();const silent=preview||new URLSearchParams(location.search).get('audio')==='0';
 useEffect(()=>{const v=new VoiceQueue();voice.current=v;v.onStatus=setVoiceStatus;return()=>v.dispose();},[]);
 useEffect(()=>{voice.current?.configure(!silent&&state.settings.voiceEnabled&&!state.safe&&connected&&state.running&&!state.pausedAI,state.settings.volume,state.settings.voiceProvider==='mock'?'silent':state.settings.voiceProvider);if(!state.character.subtitle)voice.current?.interrupt();if(state.character.speechExpiresAt>Date.now())voice.current?.push(String(state.character.speechId),state.character.subtitle,state.character.mood==='SCARED'?5:1);},[state.character.speechId,state.safe,state.running,state.pausedAI,state.settings.voiceEnabled,state.settings.volume,state.settings.voiceProvider,connected,silent]);
 useEffect(()=>{if(!science||neurons.length)return;const ac=new AbortController();getAnatomy(ac.signal).then(d=>setNeurons(d.neurons)).catch(()=>{});return()=>ac.abort();},[science,neurons.length]);
 useEffect(()=>{const v=decoder.current;setMediaError('');if(!v)return;v.pause();v.removeAttribute('src');v.load();if(!current||state.safe||!state.running||!connected)return;
  if(current.source==='sample'||(current.source==='local'&&current.category!=='image')||current.source==='url'){
   v.src=current.url||'/sample.webm';v.load();const ready=()=>{const offset=Math.max(0,(Date.now()-(current.startedAt||Date.now()))/1000);if(Number.isFinite(v.duration)&&v.duration>0)v.currentTime=offset%v.duration;v.play().catch(()=>setMediaError('Video playback blocked. Open the scene once in your browser.'));};v.addEventListener('loadedmetadata',ready,{once:true});return()=>{v.removeEventListener('loadedmetadata',ready);v.pause();v.removeAttribute('src');v.load();};}
 },[sourceId,current?.startedAt,state.safe,state.running,connected]);
 useEffect(()=>{const v=decoder.current;const engine=new VisionEngine();engine.configure(192,108,defaults);const small=document.createElement('canvas');small.width=192;small.height=108;const sc=small.getContext('2d',{willReadFrequently:true})!;let raf=0,nextFrame=0,report=performance.now(),frames=0,lastAnalysis=0,captureBusy=false,captureFrame:ImageBitmap|null=null,captureLast=0,disposed=false;
  const readCapture=async()=>{if(captureBusy)return;captureBusy=true;try{const r=await fetch('/api/capture/frame',{cache:'no-store'});if(!r.ok||r.status===204)throw Error('Shared source disconnected');const next=await createImageBitmap(await r.blob());if(disposed){next.close();return;}captureFrame?.close();captureFrame=next;captureLast=performance.now();setMediaError('');}catch{if(!disposed)setMediaError('Shared source ended · safe stimulus shown');}finally{captureBusy=false;}};
  const tick=(now:number)=>{raf=requestAnimationFrame(tick);if(now+.5<nextFrame)return;nextFrame=Math.max(nextFrame+1000/30,now+1);const s=latest.current,item=s.queue.find(x=>x.id===s.currentContentId),canvas=original.current,ctx=canvas?.getContext('2d');if(!ctx||!canvas)return;
   const safe=s.safe||!s.running||!linkAlive.current;let got=false;ctx.fillStyle='#090e10';ctx.fillRect(0,0,768,432);
   const draw=(source:CanvasImageSource,w:number,h:number)=>{const scale=Math.min(768/w,432/h);ctx.drawImage(source,(768-w*scale)/2,(432-h*scale)/2,w*scale,h*scale);got=true;};
   if(!safe&&item){if(item.source==='capture'){if(now-captureLast>300)void readCapture();if(captureFrame&&now-captureLast<3000)draw(captureFrame,captureFrame.width,captureFrame.height);}else if(item.category==='image'&&image.current?.complete&&image.current.naturalWidth)draw(image.current,image.current.naturalWidth,image.current.naturalHeight);else if((item.source==='sample'||item.source==='local'||item.source==='url')&&v&&v.readyState>=2)draw(v,v.videoWidth,v.videoHeight);}
   if(!got){const pattern=!safe&&item?.source==='synthetic'?item.tags.find(t=>['grating','edge','loom','static'].includes(t))||'grating':'static';drawSample(ctx,safe?0:now/1000,pattern);}
   frames++;
   if(now-lastAnalysis>=125){const dt=now-lastAnalysis;lastAnalysis=now;sc.drawImage(canvas,0,0,192,108);try{metrics.current=engine.process(sc.getImageData(0,0,192,108).data,dt,now/1000);const rc=retina.current?.getContext('2d');if(rc)engine.render(rc,'retina',384,216);}catch{setMediaError('Source pixels unavailable · choose a local or shared source');}}
   if(now-report>1500){const m=metrics.current;void command('report_metrics',{motion:m.right+m.left+m.up+m.down,change:m.change,luminance:m.luminance,on:m.on,off:m.off,fps:frames*1000/Math.max(1,now-report),processingMs:m.cost,sourceId:item?.id}).catch(()=>{});frames=0;report=now;}
  };raf=requestAnimationFrame(tick);return()=>{disposed=true;cancelAnimationFrame(raf);captureFrame?.close();};
 },[sourceId,current?.startedAt,preview]);
 const character=useMemo(()=>({mood:state.character.mood,action:state.character.action,intensity:.7,since:state.actions.at(-1)?.at||state.updatedAt,cosmetic:`${state.cosmetics.body} ${state.cosmetics.hat}`,safe:state.safe||!connected||!state.running,light:state.cosmetics.room==='night'?.28:1}),[state.character.mood,state.character.action,state.actions,state.cosmetics,state.safe,connected,state.running]);
 const onCanvas=useCallback((canvas:HTMLCanvasElement|null)=>{webgl.current=canvas;onRenderCanvas?.(canvas);},[onRenderCanvas]);
 const selected=useCallback(()=>{},[]);
 const activeSubtitle=!state.safe&&connected&&state.character.speechExpiresAt>Date.now()?state.character.subtitle:'';
 return <div className={`broadcast-scene ${new URLSearchParams(location.search).get('layout')==='vertical'?'vertical-output':''}`} data-mood={state.character.mood} data-safe={state.safe||!connected}>
  <video ref={decoder} muted playsInline loop={current?.source==='sample'} crossOrigin="anonymous" className="decoder" onError={()=>setMediaError('Media could not decode · safe stimulus shown')}/>
  {current?.category==='image'&&<img ref={image} src={current.url} alt="" className="decoder" crossOrigin="anonymous" onError={()=>setMediaError('Image unavailable')}/>}
  <div className="broadcast-world"><FlyScene source={original} mode="sample" character={character} output onCanvas={onCanvas}/></div>
  <div className="broadcast-brand"><strong>M0XA<span> / Мокса</span></strong><span>FICTIONAL FLY · REAL PIXELS</span></div>
  <div className="broadcast-context"><span>{state.safe||!connected?'SAFE SCENE':!state.running?'STANDBY':state.health.kick==='DEMO'?'DEMO STREAM':'CHARACTER STREAM'}</span><strong>{state.safe||!connected?'Тихая лаборатория':current?.title||'Перерыв между экспериментами'}</strong><small>{state.character.mood} · {state.mode}</small>{!state.safe&&current?.attribution&&<small className="broadcast-credit">{current.attribution} · {current.license}</small>}</div>
  <div className={`broadcast-evidence ${science?'science-expanded':''}`}>
   <div><span>WHAT THE FLY SEES <b>SOURCE</b></span><canvas ref={original} width={768} height={432} aria-label="Stream source frame"/></div>
   <div><span>WHAT THE MODEL PREDICTS <b>MODELLED</b></span><canvas ref={retina} width={384} height={216} aria-label="Stream fly POV"/></div>
   {science&&<div className="broadcast-anatomy"><span>OPTIC LOBE <b>SOURCE + INFERRED</b></span><div><Anatomy neurons={neurons} selected="VFB_00104bfr" onSelect={selected} metrics={metrics} overlay/></div></div>}
  </div>
  {state.game&&state.game.status!=='FINISHED'&&<div className="broadcast-event"><span>CHAT VS FLY</span><strong>{state.game.title}</strong><p>{state.game.status==='WAITING'?'Жди сигнала…':state.game.instruction}</p>{state.game.type==='findfood'&&state.game.status==='LIVE'&&<div className="food-lanes">{[1,2,3].map(n=><span key={n} className={n===state.game!.target?'food-target':''}>{n}{n===state.game!.target?' · САХАР':''}</span>)}</div>}</div>}
  {state.poll?.status==='OPEN'&&<div className="broadcast-poll"><strong>{state.poll.question}</strong>{state.poll.options.map((o,i)=><span key={o.id}>!choose {i+1} · {o.label} <b>{o.votes}</b></span>)}</div>}
  {state.running&&state.outputsArmed&&!state.safe&&connected&&state.sponsor.enabled&&state.sponsor.visibleUntil>Date.now()&&<div className="broadcast-sponsor"><strong>РЕКЛАМА / AD</strong><span>{state.sponsor.title}</span><small>{state.sponsor.disclosure}</small></div>}
  {activeSubtitle&&<div className="broadcast-subtitles"><span>WHAT THE FLY SAYS · CHARACTER</span><p>{activeSubtitle}</p></div>}
  <div className="broadcast-footer"><span>{mediaError||(!connected?'Runtime disconnected · source and voice stopped':state.safe?'External media and voice stopped':'!food · !dance · !brain · !question')}</span><span>{!silent?voiceStatus.state:'Preview audio muted'} · {state.cosmetics.room==='night'?'NIGHT LAB':'LAB 01'}</span></div>
 </div>;
}





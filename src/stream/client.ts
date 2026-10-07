import {useEffect,useState} from 'react';
import type {FlyBrainState,FlyCommand} from './types';
export async function command(type:string,payload:Record<string,unknown>={},signal?:AbortSignal){
 const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({type,payload} satisfies FlyCommand)});
 const result=await r.json();if(!r.ok||result.ok===false)throw new Error(result.error||result.message||'Command was rejected');return result;
}
export function useBrain(){
 const [state,setState]=useState<FlyBrainState|null>(null),[connected,setConnected]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true,lastUpdate=Date.now();const watchdog=setInterval(()=>{if(Date.now()-lastUpdate>6000){setConnected(false);setError('Runtime heartbeat lost. Safe scene active.');}},2000);const feed=new EventSource('/api/events');feed.onmessage=e=>{try{const next=JSON.parse(e.data);if(next.character){lastUpdate=Date.now();setState(previous=>!previous||next.revision>=previous.revision?next:previous);setConnected(true);setError('');}}catch{setError('Unreadable runtime update');}};feed.onerror=()=>{setConnected(false);setError('Runtime connection lost. Reconnecting…');};
 fetch('/api/state').then(r=>{if(!r.ok)throw new Error('Start the runtime with npm run dev');return r.json();}).then(data=>{if(live)setState(previous=>!previous||data.revision>=previous.revision?data:previous);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;clearInterval(watchdog);feed.close();};},[]);
 return {state,connected,error};
}
export const timeLabel=(at:number)=>new Date(at).toLocaleTimeString([], {timeZone:'Asia/Tbilisi',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
export const elapsed=(seconds:number)=>`${Math.floor(seconds/3600).toString().padStart(2,'0')}:${Math.floor(seconds/60%60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
export function download(data:Blob|string,name:string){const url=URL.createObjectURL(typeof data==='string'?new Blob([data],{type:'application/json'}):data);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}



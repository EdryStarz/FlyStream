import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceQueue} from '../src/stream/voice';

test('late TTS response cannot play after timeout; safe mute owns and stops every audio',async()=>{
 const original={fetch:globalThis.fetch,Audio:(globalThis as any).Audio,window:(globalThis as any).window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 const pending:{resolve:(r:Response)=>void;signal?:AbortSignal}[]=[],timers=new Map<number,()=>void>(),audios:{playing:boolean;onended:any;onerror:any;pause:()=>void;play:()=>Promise<void>;removeAttribute:()=>void}[]=[];let id=0,revoked=0; let voice:VoiceQueue|undefined;
 try{
  (globalThis as any).window={speechSynthesis:{cancel(){},getVoices(){return[];}}};
  globalThis.fetch=((_url:any,options:any)=>new Promise<Response>(resolve=>pending.push({resolve,signal:options.signal}))) as typeof fetch;
  globalThis.setTimeout=((fn:any)=>{timers.set(++id,fn);return id;}) as unknown as typeof setTimeout;globalThis.clearTimeout=((n:any)=>{timers.delete(n);}) as typeof clearTimeout;
  URL.createObjectURL=()=>`blob:test-${id}`;URL.revokeObjectURL=()=>{revoked++;};
  (globalThis as any).Audio=class{playing=false;volume=1;onended=null;onerror=null;constructor(){audios.push(this);}async play(){this.playing=true;}pause(){this.playing=false;}removeAttribute(){}};
  voice=new VoiceQueue();voice.configure(true,.5,'server');voice.push('1','Первая реплика');voice.push('2','Вторая реплика');assert.equal(pending.length,1);
  const watchdog=timers.values().next().value!;watchdog();assert.equal(pending[0].signal?.aborted,true);assert.equal(pending.length,2);
  pending[0].resolve({ok:true,blob:async()=>new Blob(['late'],{type:'audio/mpeg'})} as Response);pending[1].resolve({ok:true,blob:async()=>new Blob(['current'],{type:'audio/mpeg'})} as Response);
  for(let flush=0;flush<8;flush++)await Promise.resolve();assert.equal(audios.filter(a=>a.playing).length,1);assert.equal(audios.length,1);
  voice.configure(false,.5,'server');assert.equal(audios.filter(a=>a.playing).length,0);assert.equal(revoked,1);voice.dispose();
 }finally{voice?.dispose();globalThis.fetch=original.fetch;(globalThis as any).Audio=original.Audio;(globalThis as any).window=original.window;globalThis.setTimeout=original.setTimeout;globalThis.clearTimeout=original.clearTimeout;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke;}
});


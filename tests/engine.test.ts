import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VisionEngine,defaults,alpha} from '../src/engine';
import {parseKickStatus} from '../src/source';
import {parseSWC} from '../src/vfb';
import {stimulusGeometry} from '../src/experiment';
const w=192,h=108;
function frame(phase:number,axis:'x'|'y'='x',flat?:number){const rgba=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=flat??Math.round(127+100*Math.sin(((axis==='x'?x:y)-phase)*Math.PI*2/48));const i=(y*w+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=c;rgba[i+3]=255;}return rgba;}
test('motion reverses sign with source direction in both axes',()=>{
 for(const axis of ['x','y'] as const){const results=[];for(const direction of [1,-1]){const e=new VisionEngine();e.configure(w,h,defaults);let signed=0;for(let i=0;i<120;i++){const m=e.process(frame(direction*i*1.2,axis),1000/30,i/30);if(i>30)signed+=axis==='x'?m.right-m.left:m.down-m.up;}results.push(signed);}assert.ok(results[0]>.01,`${axis} positive: ${results}`);assert.ok(results[1]<-.01,`${axis} negative: ${results}`);}
});
test('stationary image settles to zero temporal and motion energy',()=>{const e=new VisionEngine();e.configure(w,h,defaults);let m=e.process(frame(0),33,0);for(let i=0;i<100;i++)m=e.process(frame(0),33,i/30);assert.ok(m.change<1e-6);assert.ok(m.on+m.off<1e-6);assert.ok(m.right+m.left+m.down+m.up<1e-6);});
test('brightness step changes ON/OFF without fabricated units',()=>{const e=new VisionEngine();e.configure(w,h,defaults);e.process(frame(0,'x',30),33,0);const on=e.process(frame(0,'x',220),33,1);assert.ok(on.on>.5);assert.equal(on.off,0);e.reset();e.process(frame(0,'x',220),33,0);const off=e.process(frame(0,'x',30),33,1);assert.ok(off.off>.5);assert.equal(off.on,0);});
test('optical averaging suppresses fine spatial patterns; patch sampling is bounded',()=>{const e=new VisionEngine();e.configure(w,h,defaults);assert.ok(e.sites.length>100&&e.sites.length<750);const im=frame(0);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=x%2?255:0;const i=(y*w+x)*4;im[i]=im[i+1]=im[i+2]=c;}const m=e.process(im,33,0);assert.ok(m.contrast<.1);assert.ok(Math.abs(m.luminance-.5)<.1);});
test('elapsed-time lowpass coefficient composes consistently',()=>{assert.ok(Math.abs((1-alpha(10,30))**3-(1-alpha(30,30)))<1e-12);});
test('official status distinguishes LIVE, OFFLINE and missing evidence',()=>{assert.equal(parseKickStatus({data:[{slug:'jesusavgn',stream:{is_live:true}}]}).state,'LIVE');assert.equal(parseKickStatus({data:[{slug:'jesusavgn',stream:{is_live:false}}]}).state,'OFFLINE');assert.equal(parseKickStatus({data:[{slug:'someone-else',stream:{is_live:true}}]}).state,'UNKNOWN');assert.equal(parseKickStatus({error:403}).state,'UNKNOWN');});
test('SWC uses actual parent segments',()=>{assert.deepEqual([...parseSWC('# comment\n1 1 1 2 3 1 -1\n2 3 4 5 6 .5 1')],[4,5,6,1,2,3]);assert.throws(()=>parseSWC('garbage'));});
test('real-fly geometry refuses ambiguous tracked orientation',()=>{const pose={timestampMs:0,xMm:0,yMm:0,bodyYawRad:0,headYawRad:null,confidence:.9,headTailResolved:false,evidence:'MEASURED' as const},screen={widthMm:100,heightMm:60,centerXmm:100,centerYmm:0,normalYawRad:0};assert.equal(stimulusGeometry(pose,screen),null);assert.equal(stimulusGeometry({...pose,headTailResolved:true},screen)?.usesBodyProxy,true);});

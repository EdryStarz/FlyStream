// A deterministic synthetic stimulus, never a recording or an alleged live feed.
export function drawSample(ctx:CanvasRenderingContext2D,t:number,pattern:string,w=768,h=432){
 ctx.fillStyle='#1c282c';ctx.fillRect(0,0,w,h);
 if(pattern==='grating'){
  const direction=t%20<10?1:-1;const phase=direction*(t%10)*58;
  for(let x=-160;x<w+160;x+=96){const pos=(x+phase)%(w+192)-96;ctx.fillStyle='#d6e0db';ctx.fillRect(pos,0,44,h);}
 }else if(pattern==='edge'){
  const x=(t*110)%(w+160)-80;ctx.fillStyle='#e3e9e3';ctx.fillRect(x,0,80,h);
 }else if(pattern==='loom'){
  ctx.fillStyle='#cdd9d2';ctx.fillRect(0,0,w,h);const r=10+((t%4)/4)**2*h*.9;ctx.fillStyle='#172326';ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);ctx.fill();
 }else{
  for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=64){ctx.fillStyle=((x+y)/64)%2?'#cdd9d2':'#243438';ctx.fillRect(x,y,64,64);}
 }
}

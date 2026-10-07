import type { Metrics } from './engine';
export function drawTrace(ctx:CanvasRenderingContext2D,records:Metrics[]){
 const visibleWidth=Math.max(100,Math.round(ctx.canvas.clientWidth||960));
 if(ctx.canvas.width!==visibleWidth)ctx.canvas.width=visibleWidth;
 const w=ctx.canvas.width,h=ctx.canvas.height,left=34,top=16,bottom=h-20;
 ctx.fillStyle='#121b1e';ctx.fillRect(0,0,w,h);ctx.font='13px PlexMono, monospace';ctx.lineWidth=1;
 for(const value of [0,1,2]){const y=bottom-value/2*(bottom-top);ctx.strokeStyle='#2d3b40';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w,y);ctx.stroke();ctx.fillStyle='#a9b8bd';ctx.fillText(String(value),9,y+4);}
 const lines:[keyof Metrics,string][]=[['on','#79d6bc'],['off','#f2ba72'],['change','#b9c5c8']];
 for(const [key,color] of lines){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();records.forEach((m,i)=>{const x=w-(records.length-1-i)*(w-left)/450,y=bottom-Math.min(2,Number(m[key]))/2*(bottom-top);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
}

export type Stage = 'retina' | 'photoreceptor' | 'temporal' | 'motion' | 'downstream';
export type Params = { spacing: number; acceptance: number; fov: number; delay: number; adaptation: number; gain: number };
export const defaults: Params = { spacing: 4.5, acceptance: 5, fov: 100, delay: 30, adaptation: 200, gain: 4 };
export type Metrics = { luminance: number; contrast: number; change: number; on: number; off: number; right: number; left: number; up: number; down: number; samples: number; time: number; cost: number };
export const zeroMetrics: Metrics = { luminance:0,contrast:0,change:0,on:0,off:0,right:0,left:0,up:0,down:0,samples:0,time:0,cost:0 };
type Site = { x:number;y:number;row:number;col:number;weights:[number,number][];right:number;down:number };
const linear = Float32Array.from({length:256},(_,i)=> {const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
export const alpha = (dt:number,tau:number) => 1-Math.exp(-dt/Math.max(1,tau));
export function correlate(a:number,b:number,delayedA:number,delayedB:number) {return delayedA*b-a*delayedB;}
export class VisionEngine {
  sites:Site[]=[]; baseline=new Float32Array(); delayedOn=new Float32Array(); delayedOff=new Float32Array(); previous=new Float32Array();
  sampled=new Float32Array(); on=new Float32Array(); off=new Float32Array(); motionX=new Float32Array(); motionY=new Float32Array();
  initialized=false; key=''; w=192;h=108; params=defaults;
  configure(w:number,h:number,p:Params) {
    this.params=p;const key=[w,h,p.spacing,p.acceptance,p.fov].join('/');if(key===this.key)return;this.key=key;this.w=w;this.h=h;
    this.sites=[];const tan=Math.tan(p.fov*Math.PI/360),vfov=2*Math.atan(tan*h/w)*180/Math.PI,stepY=p.spacing*Math.sqrt(3)/2;
    const rows=Math.floor(vfov/stepY)+1,cols=Math.floor(p.fov/p.spacing)+1,lookup=new Map<string,number>();
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const ax=-p.fov/2+c*p.spacing+(r%2)*p.spacing/2,ay=-vfov/2+r*stepY;
      const x=(Math.tan(ax*Math.PI/180)/tan+1)*w/2,y=(Math.tan(ay*Math.PI/180)/(tan*h/w)+1)*h/2;
      if(x<0||x>=w||y<0||y>=h)continue;
      const weights:[number,number][]=[];const sigma=p.acceptance/2.355;
      const radius=Math.ceil(3*sigma*w/p.fov/Math.max(.2,Math.cos(ax*Math.PI/180)**2));let sum=0;
      for(let py=Math.max(0,Math.floor(y)-radius);py<=Math.min(h-1,Math.ceil(y)+radius);py++)for(let px=Math.max(0,Math.floor(x)-radius);px<=Math.min(w-1,Math.ceil(x)+radius);px++){
        const pa=Math.atan(((px+.5)/w*2-1)*tan)*180/Math.PI,pb=Math.atan(((py+.5)/h*2-1)*tan*h/w)*180/Math.PI;
        const d2=(pa-ax)**2+(pb-ay)**2;if(d2>9*sigma*sigma)continue;const weight=Math.exp(-d2/(2*sigma*sigma));weights.push([py*w+px,weight]);sum+=weight;
      }
      for(const item of weights)item[1]/=sum||1;
      lookup.set(`${r}:${c}`,this.sites.length);this.sites.push({x,y,row:r,col:c,weights,right:-1,down:-1});
    }
    for(const s of this.sites){s.right=lookup.get(`${s.row}:${s.col+1}`)??-1;s.down=lookup.get(`${s.row+2}:${s.col}`)??-1;}
    const n=this.sites.length;this.baseline=new Float32Array(n);this.delayedOn=new Float32Array(n);this.delayedOff=new Float32Array(n);this.previous=new Float32Array(n);this.sampled=new Float32Array(n);this.on=new Float32Array(n);this.off=new Float32Array(n);this.motionX=new Float32Array(n);this.motionY=new Float32Array(n);this.initialized=false;
  }
  reset(){this.initialized=false;this.delayedOn.fill(0);this.delayedOff.fill(0);}
  process(rgba:Uint8ClampedArray,dt:number,time:number):Metrics {
    const start=performance.now(),p=this.params,n=this.sites.length,luma=new Float32Array(this.w*this.h);
    for(let k=0;k<luma.length;k++)luma[k]=.2126*linear[rgba[k*4]]+.7152*linear[rgba[k*4+1]]+.0722*linear[rgba[k*4+2]];
    let mean=0,sq=0,change=0,onMean=0,offMean=0;
    for(let i=0;i<n;i++){
      let value=0;for(const [j,v] of this.sites[i].weights)value+=luma[j]*v;this.sampled[i]=value;
      if(!this.initialized){this.baseline[i]=value;this.previous[i]=value;}
      const contrast=(value-this.baseline[i])/Math.max(.05,this.baseline[i]);
      this.on[i]=Math.max(0,Math.min(2,contrast));this.off[i]=Math.max(0,Math.min(2,-contrast));
      this.baseline[i]+=alpha(dt,p.adaptation)*(value-this.baseline[i]);
      mean+=value;sq+=value*value;change+=Math.abs(value-this.previous[i]);onMean+=this.on[i];offMean+=this.off[i];this.previous[i]=value;
    }
    let right=0,left=0,up=0,down=0,nx=0,ny=0;
    for(let i=0;i<n;i++){
      const s=this.sites[i];let mx=0,my=0;
      if(s.right>=0){const j=s.right;mx=correlate(this.on[i],this.on[j],this.delayedOn[i],this.delayedOn[j])+correlate(this.off[i],this.off[j],this.delayedOff[i],this.delayedOff[j]);right+=Math.max(0,mx);left+=Math.max(0,-mx);nx++;}
      if(s.down>=0){const j=s.down;my=correlate(this.on[i],this.on[j],this.delayedOn[i],this.delayedOn[j])+correlate(this.off[i],this.off[j],this.delayedOff[i],this.delayedOff[j]);down+=Math.max(0,my);up+=Math.max(0,-my);ny++;}
      this.motionX[i]=mx;this.motionY[i]=my;
    }
    for(let i=0;i<n;i++){this.delayedOn[i]+=alpha(dt,p.delay)*(this.on[i]-this.delayedOn[i]);this.delayedOff[i]+=alpha(dt,p.delay)*(this.off[i]-this.delayedOff[i]);}
    this.initialized=true;mean/=n||1;return {luminance:mean,contrast:Math.sqrt(Math.max(0,sq/(n||1)-mean*mean)),change:change/(n||1),on:onMean/(n||1),off:offMean/(n||1),right:right/(nx||1),left:left/(nx||1),down:down/(ny||1),up:up/(ny||1),samples:n,time,cost:performance.now()-start};
  }
  render(ctx:CanvasRenderingContext2D,stage:Stage,width:number,height:number){
    ctx.fillStyle='#090e10';ctx.fillRect(0,0,width,height);
    const sx=width/this.w,sy=height/this.h;
    for(let i=0;i<this.sites.length;i++){
      const s=this.sites[i],x=s.x*sx,y=s.y*sy,rx=Math.max(2,this.params.spacing/this.params.fov*width*.62),ry=rx;
      let r=0,g=0,b=0;
      if(stage==='retina'||stage==='photoreceptor'){const v=Math.round(255*Math.pow(this.sampled[i],1/2.2));r=stage==='retina'?v:v*.52;g=v;b=stage==='retina'?v:v*.81;}
      else if(stage==='temporal'){const on=Math.min(1,this.on[i]*this.params.gain),off=Math.min(1,this.off[i]*this.params.gain);r=30+220*off;g=35+200*on;b=40+150*on;}
      else {const mx=this.motionX[i],my=this.motionY[i],a=Math.min(1,Math.hypot(mx,my)*this.params.gain*8);r=25+Math.max(0,-mx)*800*this.params.gain;g=35+Math.max(0,mx)*800*this.params.gain;b=40+Math.abs(my)*800*this.params.gain;if(stage==='downstream'){r=35+215*a;g=35+130*a;b=40+50*a;}}
      ctx.fillStyle=`rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;ctx.beginPath();for(let j=0;j<6;j++){const a=(j*60+30)*Math.PI/180,px=x+rx*Math.cos(a),py=y+ry*Math.sin(a);j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();
    }
  }
}

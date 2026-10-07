import {useEffect,useRef,useState,type RefObject} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Maximize,RotateCcw} from 'lucide-react';

type Mode='sample'|'kick'|'capture'|'file';
type View='desk'|'fly'|'screen';
type Point=[number,number,number];
export type FlyCharacter={mood:string;action:string;intensity:number;since:number;cosmetic:string;safe:boolean;light:number};
export type FlySceneProps={source:RefObject<HTMLCanvasElement|null>;mode:Mode;onShare?:()=>void;busy?:boolean;character?:FlyCharacter;output?:boolean;onCanvas?:(canvas:HTMLCanvasElement|null)=>void};
type Leg={side:number;index:number;hip:THREE.Vector3;knee:THREE.Vector3;ankle:THREE.Vector3;toe:THREE.Vector3;upper:THREE.Mesh;lower:THREE.Mesh;foot:THREE.Mesh};
const up=new THREE.Vector3(0,1,0);
const segmentDirection=new THREE.Vector3();
function fitSegment(item:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,radius:number){
 segmentDirection.copy(b).sub(a);
 item.position.copy(a).add(b).multiplyScalar(.5);
 item.scale.set(radius,segmentDirection.length(),radius);
 item.quaternion.setFromUnitVectors(up,segmentDirection.normalize());
}

/** Authored illustrative geometry, not a reconstruction or a calibrated animal. */
function buildDesk(scene:THREE.Scene,screen:THREE.CanvasTexture){
 const shell=new THREE.MeshStandardMaterial({color:'#242f34',roughness:.55,metalness:.35});
 const edge=new THREE.MeshStandardMaterial({color:'#090e10',roughness:.65});
 const keyMaterial=new THREE.MeshStandardMaterial({color:'#526169',roughness:.7});
 const body=new THREE.MeshStandardMaterial({color:'#8c683c',roughness:.58,metalness:.12});
 const dark=new THREE.MeshStandardMaterial({color:'#30281d',roughness:.72});
 // Physical highlights break across real, flat facets of the compound eyes.
 const eye=new THREE.MeshPhysicalMaterial({color:'#ad392c',roughness:.27,metalness:.15,clearcoat:.85,clearcoatRoughness:.22,flatShading:true});
 const wing=new THREE.MeshStandardMaterial({color:'#b8d3d5',transparent:true,opacity:.34,roughness:.32,side:THREE.DoubleSide,depthWrite:false});
 const vein=new THREE.LineBasicMaterial({color:'#9db7ba',transparent:true,opacity:.55});
 const sphereGeometry=new THREE.SphereGeometry(1,24,16),rodGeometry=new THREE.CylinderGeometry(.65,1,1,8);
 const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material,position:Point,scale:Point=[1,1,1],parent:THREE.Object3D=scene)=>{
  const item=new THREE.Mesh(geometry,material);item.position.set(...position);item.scale.set(...scale);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;
 };
 const box=(size:Point,position:Point,material:THREE.Material=shell,parent:THREE.Object3D=scene)=>mesh(new THREE.BoxGeometry(...size),material,position,[1,1,1],parent);
 const sphere=(position:Point,scale:Point,material:THREE.Material,parent:THREE.Object3D=scene)=>mesh(sphereGeometry,material,position,scale,parent);
 const rod=(a:Point,b:Point,r:number,material:THREE.Material,parent:THREE.Object3D=scene)=>{
  const item=mesh(rodGeometry,material,[0,0,0],[1,1,1],parent);fitSegment(item,new THREE.Vector3(...a),new THREE.Vector3(...b),r);return item;
 };
 box([6.8,.16,4.7],[0,-.1,.15],new THREE.MeshStandardMaterial({color:'#344047',roughness:.9}));
 box([3.56,2.12,.16],[0,1.77,-1.55]);
 box([3.36,1.91,.035],[0,1.79,-1.45],edge);
 const display=mesh(new THREE.PlaneGeometry(3.2,1.8),new THREE.MeshBasicMaterial({map:screen,toneMapped:false}),[0,1.8,-1.425]);display.castShadow=false;
 box([.18,.55,.16],[0,.47,-1.6]);box([1.22,.08,.62],[0,.06,-1.48]);
 sphere([1.57,.8,-1.45],[.023,.023,.01],new THREE.MeshBasicMaterial({color:'#79d6bc'}));
 // A whole keyboard uses one instanced draw call.
 box([2.05,.085,.64],[-.48,.06,-.65],edge);
 const keys=new THREE.InstancedMesh(new THREE.BoxGeometry(.115,.045,.105),keyMaterial,56);
 const matrix=new THREE.Matrix4();for(let row=0;row<4;row++)for(let col=0;col<14;col++){matrix.makeTranslation(-1.38+col*.138,.124,-.88+row*.147);keys.setMatrixAt(row*14+col,matrix);}scene.add(keys);
 box([.66,.045,.09],[-.45,.125,-.31],keyMaterial);
 sphere([1.2,.14,-.58],[.18,.1,.27],shell);rod([1.2,.22,-.77],[1.2,.22,-.57],.006,edge);

 // These set pieces appear only in the explicitly fictional character scene.
 const room=new THREE.Group();scene.add(room);room.visible=false;
 const roomMaterial=new THREE.MeshStandardMaterial({color:'#182024',roughness:.95});
 box([12,7,.16],[0,2,-3.4],roomMaterial,room);
 box([12,.12,12],[0,-1.45,0],roomMaterial,room);
 box([.18,1.3,.18],[-2.8,-.78,-1.55],shell,room);box([.18,1.3,.18],[2.8,-.78,-1.55],shell,room);
 box([.95,.06,.52],[-2.25,.02,-1.5],edge,room);
 rod([-2.4,.07,-1.6],[-2.4,1.02,-1.6],.045,shell,room);
 rod([-2.4,1.02,-1.6],[-1.9,1.25,-1.52],.035,shell,room);
 const lamp=mesh(new THREE.ConeGeometry(.23,.32,24,1,true),shell,[-1.89,1.14,-1.52],[1,1,1],room);lamp.rotation.z=-.22;
 sphere([-1.86,1,-1.52],[.14,.022,.14],new THREE.MeshBasicMaterial({color:'#ffe4a4'}),room);
 const deskLamp=new THREE.PointLight('#f2ba72',1.5,4,2);deskLamp.position.set(-1.87,.95,-1.52);room.add(deskLamp);
 const tubeMaterial=new THREE.MeshPhysicalMaterial({color:'#a9b8bd',roughness:.18,transparent:true,opacity:.35,depthWrite:false});
 for(let i=0;i<3;i++){
  mesh(new THREE.CylinderGeometry(.085,.085,.5,12),tubeMaterial,[2.22+i*.24,.32,-1.43],[1,1,1],room);
  mesh(new THREE.CylinderGeometry(.074,.074,.12+i*.07,12),new THREE.MeshStandardMaterial({color:i===1?'#f2ba72':'#79d6bc',roughness:.45}),[2.22+i*.24,.14+i*.035,-1.43],[1,1,1],room);
 }
 box([.9,.07,.36],[2.46,.03,-1.43],shell,room);
 // A sugar cube gives the hungry/eat action a concrete object to look toward.
 const food=box([.14,.13,.14],[-.58,.07,.25],new THREE.MeshStandardMaterial({color:'#e8eeeb',roughness:1}),room);food.rotation.y=.22;

 const fly=new THREE.Group();fly.position.set(.2,0,1);scene.add(fly);
 const torso=new THREE.Group();fly.add(torso);
 const abdomen=new THREE.Group();abdomen.position.set(0,.67,.18);torso.add(abdomen);
 sphere([0,0,0],[.29,.26,.53],body,abdomen);
 sphere([0,.79,-.29],[.31,.31,.37],dark,torso);
 const head=new THREE.Group();head.position.set(0,.83,-.66);torso.add(head);
 sphere([0,0,-.02],[.27,.24,.21],body,head);
 const proboscis=new THREE.Group();proboscis.position.set(0,-.15,-.18);head.add(proboscis);
 sphere([0,0,0],[.036,.065,.046],dark,proboscis);
 const antennae:THREE.Group[]=[],wings:THREE.Group[]=[],legs:Leg[]=[];
 for(const side of [-1,1]){
  const compound=mesh(new THREE.IcosahedronGeometry(1,3),eye,[side*.22,.03,-.075],[.18,.22,.18],head);compound.rotation.z=side*-.15;
  const antenna=new THREE.Group();antenna.position.set(side*.08,.02,-.21);head.add(antenna);antennae.push(antenna);
  sphere([0,0,0],[.035,.045,.035],dark,antenna);
  rod([0,0,0],[side*.09,.19,-.08],.009,dark,antenna);
  const hairs:number[]=[];for(let n=0;n<4;n++)hairs.push(side*(.04+n*.012),.07+n*.027,-.04-n*.01,side*(.1+n*.018),.1+n*.025,-.05-n*.01);
  antenna.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(hairs,3)),new THREE.LineBasicMaterial({color:'#30281d'})));
  for(let i=0;i<3;i++){
   const hip=new THREE.Vector3(side*.21,.7,-.43+i*.26),knee=new THREE.Vector3(side*(.58+i*.035),.46,-.78+i*.56);
   const ankle=new THREE.Vector3(side*(.7+i*.08),.055,-.94+i*.76),toe=ankle.clone().add(new THREE.Vector3(side*.12,-.03,-.13));
   legs.push({side,index:i,hip,knee,ankle,toe,upper:rod(hip.toArray() as Point,knee.toArray() as Point,.035,body,fly),lower:rod(knee.toArray() as Point,ankle.toArray() as Point,.021,dark,fly),foot:rod(ankle.toArray() as Point,toe.toArray() as Point,.012,dark,fly)});
  }
  sphere([side*.36,.73,-.06],[.05,.055,.05],body,torso);
  rod([side*.25,.69,-.1],[side*.36,.73,-.06],.011,body,torso);
  const hinge=new THREE.Group();hinge.position.set(side*.13,.91,-.25);torso.add(hinge);wings.push(hinge);
  const outline=new THREE.Shape();outline.moveTo(0,0);
  outline.bezierCurveTo(side*.4,.2,side*.89,.81,side*.73,1.24);
  outline.bezierCurveTo(side*.52,1.42,side*.11,.8,0,0);
  const geometry=new THREE.ShapeGeometry(outline,24);geometry.rotateX(Math.PI/2);
  const membrane=mesh(geometry,wing,[0,0,0],[1,1,1],hinge);membrane.castShadow=false;
  const veinPoints:number[]=[];
  for(const end of [[side*.69,1.17],[side*.58,1.07],[side*.45,.9]]){
   const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,.006,0),new THREE.Vector3(side*.3,.006,.53),new THREE.Vector3(end[0],.006,end[1]));
   const points=curve.getPoints(14);for(let i=1;i<points.length;i++)veinPoints.push(...points[i-1].toArray(),...points[i].toArray());
  }
  hinge.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(veinPoints,3)),vein));
 }
 for(let i=0;i<5;i++){
  const z=-.2+i*.13,r=Math.sqrt(1-(z/.53)**2);
  const band=mesh(new THREE.TorusGeometry(1,.055,6,32),dark,[0,0,z],[.292*r,.262*r,.21],abdomen);band.castShadow=false;
 }
 const hairs:number[]=[];
 for(let i=0;i<65;i++){
  const angle=i*2.39996,y=1-2*(i+.5)/65,rad=Math.sqrt(1-y*y);
  const p=new THREE.Vector3(Math.cos(angle)*rad*.31,y*.3,Math.sin(angle)*rad*.35);
  const tip=p.clone().multiplyScalar(1.2);hairs.push(p.x,p.y+.79,p.z-.29,tip.x,tip.y+.79,tip.z-.29);
 }
 torso.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(hairs,3)),new THREE.LineBasicMaterial({color:'#60513b'})));
 const cap=new THREE.Group();cap.position.set(0,.2,.015);head.add(cap);cap.visible=false;
 const capMaterial=new THREE.MeshStandardMaterial({color:'#79d6bc',roughness:.8});
 mesh(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2),capMaterial,[0,0,0],[.24,.14,.23],cap);
 sphere([0,.004,-.19],[.23,.018,.18],capMaterial,cap);
 const crown=new THREE.Group();crown.position.set(0,.21,.02);head.add(crown);crown.visible=false;
 const goldMaterial=new THREE.MeshStandardMaterial({color:'#c49b50',roughness:.3,metalness:.7});
 const crownBand=mesh(new THREE.TorusGeometry(.18,.027,6,20),goldMaterial,[0,0,0],[1,1,1],crown);crownBand.rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;mesh(new THREE.ConeGeometry(.042,.15,4),goldMaterial,[Math.sin(angle)*.17,.064,Math.cos(angle)*.17],[1,1,1],crown);}
 return {fly,torso,abdomen,head,antennae,wings,legs,proboscis,body,wing,vein,cap,crown,room,deskLamp,food};
}

export function FlyScene({source,mode,onShare,busy=false,character,output=false,onCanvas}:FlySceneProps){
 const host=useRef<HTMLDivElement>(null),section=useRef<HTMLElement>(null),canvasRef=useRef<HTMLCanvasElement|null>(null);
 const currentMode=useRef(mode),currentCharacter=useRef(character),canvasCallback=useRef(onCanvas),setCamera=useRef<(view:View)=>void>(()=>{});
 const [error,setError]=useState(''),[view,setView]=useState<View>('desk');
 currentMode.current=mode;currentCharacter.current=character;canvasCallback.current=onCanvas;
 useEffect(()=>{onCanvas?.(canvasRef.current);return()=>onCanvas?.(null);},[onCanvas]);
 useEffect(()=>{
  const mount=host.current;if(!mount)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:output});}catch{setError('3D is unavailable in this browser. Enable hardware acceleration and reload.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,output?1.5:1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);canvasRef.current=renderer.domElement;canvasCallback.current?.(renderer.domElement);
  renderer.domElement.tabIndex=output?-1:0;renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label',output?'Animated fictional fly watching a laboratory monitor.':'3D fly facing a computer. Drag or use arrow keys to orbit; plus and minus to zoom.');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#111719');
  const camera=new THREE.PerspectiveCamera(37,1,.05,60),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.12;controls.enablePan=false;controls.minDistance=1.6;controls.maxDistance=15;controls.maxPolarAngle=Math.PI*.49;controls.enabled=!output;
  scene.add(new THREE.HemisphereLight('#d9efeb','#4d4435',2.1));
  const key=new THREE.DirectionalLight('#fff0d7',3.4);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;scene.add(key);
  const rim=new THREE.DirectionalLight('#91bdec',1.7);rim.position.set(4,3,-3);scene.add(rim);
  const monitorLight=new THREE.PointLight('#c8d4d7',2.2,5,2);monitorLight.position.set(0,1.5,-1.15);scene.add(monitorLight);
  const screenCanvas=document.createElement('canvas');screenCanvas.width=768;screenCanvas.height=432;
  const ctx=screenCanvas.getContext('2d')!;
  const texture=new THREE.CanvasTexture(screenCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const sampler=document.createElement('canvas');sampler.width=4;sampler.height=4;const sampleCtx=sampler.getContext('2d',{willReadFrequently:true});
  const rig=buildDesk(scene,texture);
  const presets:Record<View,{position:Point;target:Point}>={desk:{position:[5.1,3.75,6.6],target:[0,1,0]},fly:{position:[2.1,1.65,-.3],target:[.2,.67,1]},screen:{position:[0,2.7,5.4],target:[0,1.3,-.75]}};
  const choose=(name:View)=>{const p=presets[name];controls.target.set(...p.target);camera.position.set(...p.position);if(mount.clientWidth<600&&name==='desk')camera.position.sub(controls.target).multiplyScalar(1.3).add(controls.target);controls.update();};setCamera.current=choose;choose('desk');
  if(output){camera.position.set(4.7,2.9,5.6);controls.target.set(0,1,-.1);controls.update();}
  const resize=new ResizeObserver(()=>{const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(mount);
  const keyboard=(e:KeyboardEvent)=>{
   if(output||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();
   const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
   if(e.key==='+'||e.key==='-')spherical.radius=THREE.MathUtils.clamp(spherical.radius*(e.key==='+'?.9:1.1),controls.minDistance,controls.maxDistance);
   else if(e.key==='ArrowLeft'||e.key==='ArrowRight')spherical.theta+=(e.key==='ArrowLeft'?1:-1)*.12;
   else spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.12:.12),.05,controls.maxPolarAngle);
   camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
  };renderer.domElement.addEventListener('keydown',keyboard);
  const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');let reducedMotion=motionQuery.matches;
  const motionChange=()=>{reducedMotion=motionQuery.matches;};motionQuery.addEventListener('change',motionChange);
  let visible=true,raf=0,last=0,lastLight=0,placeholder='',cosmetic='',sampleReadable=true,wasCharacter=false;
  let elapsed=0,previousFrame=0,currentEvent='',eventStart=0,measuredFrames=0,measurementStart=0;
  const hip=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3(),toe=new THREE.Vector3();
  const cameraGoal=new THREE.Vector3(),targetGoal=new THREE.Vector3(),lightColor=new THREE.Color('#c8d4d7');
  let lightLevel=2.2;
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{rootMargin:'100px'});observer.observe(mount);
  const drawPlaceholder=(safe:boolean,isCharacter:boolean)=>{
   const state=safe?'safe':isCharacter?'character':'science';if(placeholder===state)return;placeholder=state;
   ctx.fillStyle='#090e10';ctx.fillRect(0,0,768,432);ctx.textAlign='center';ctx.fillStyle='#79d6bc';ctx.font='500 44px sans-serif';
   ctx.fillText(safe?'Quiet at the bench':isCharacter?'FLYSTREAM LAB':'jesusavgn / Kick',384,184);
   ctx.fillStyle='#c8d4d7';ctx.font='26px sans-serif';ctx.fillText(safe?'The fly is taking a pause.':isCharacter?'Waiting for permitted content':'Share the Kick tab to show its video',384,245);texture.needsUpdate=true;
  };
  const frame=(now:number)=>{
   raf=requestAnimationFrame(frame);
   // Keep a fixed cadence without rounding 60Hz RAF down to 20Hz after a late frame.
   // Broadcast recording remains active when its operator preview is offscreen.
   // Background RAF throttling is still controlled by the host browser/OBS.
   const interval=1000/30;if((!output&&(document.hidden||!visible))||now-last<interval-.5)return;last+=Math.max(1,Math.floor((now-last+.5)/interval))*interval;
   const dt=Math.min(.1,previousFrame?(now-previousFrame)/1000:1/30);previousFrame=now;elapsed+=dt;
   const c=currentCharacter.current,safe=!!c?.safe;
   const mood=c?.mood.toLowerCase()??'',action=c?.action.toLowerCase()??'';
   const intensity=Number.isFinite(c?.intensity)?THREE.MathUtils.clamp(c!.intensity,0,1):.5;
   const event=`${c?.since}:${action}:${mood}`;if(event!==currentEvent){currentEvent=event;eventStart=now;}
   const since=c?.since??0;
   const age=since>1e11?Math.max(0,(Date.now()-since)/1000):since>0&&since<=now?Math.max(0,(now-since)/1000):(now-eventStart)/1000;
   const input=source.current;
   if(!safe&&input&&input.width&&input.height&&currentMode.current!=='kick'){
    try{ctx.drawImage(input,0,0,768,432);texture.needsUpdate=true;placeholder='';}catch{drawPlaceholder(false,!!c);}
   }else drawPlaceholder(safe,!!c);
   // Only 16 pixels, at 4Hz, feed the actual monitor light. No per-frame readback.
   if(now-lastLight>=250){
    lastLight=now;
    if(c&&!safe&&sampleCtx&&sampleReadable&&placeholder===''){
     try{
      sampleCtx.drawImage(screenCanvas,0,0,4,4);const data=sampleCtx.getImageData(0,0,4,4).data;let r=0,g=0,b=0;
      for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];}
      lightColor.setRGB(r/(16*255),g/(16*255),b/(16*255),THREE.SRGBColorSpace);
      const brightness=(r*.2126+g*.7152+b*.0722)/(16*255),gain=Number.isFinite(c.light)?THREE.MathUtils.clamp(c.light,0,1):1;
      lightLevel=(.7+brightness*4)*(.4+gain*.6);
     }catch{sampleReadable=false;lightColor.set('#c8d4d7');lightLevel=1.2;}
    }else if(safe||!c){lightColor.set('#c8d4d7');lightLevel=safe?.6:0;}
   }
   monitorLight.color.lerp(lightColor,1-Math.exp(-dt*3));monitorLight.intensity=THREE.MathUtils.lerp(monitorLight.intensity,lightLevel,1-Math.exp(-dt*3));
   rig.room.visible=!!c;rig.deskLamp.intensity=safe?.7:1.5;
   if(c){
    const quiet=safe||reducedMotion,speed=mood==='sleepy'||action==='sleep'?.35:1,t=elapsed*speed;
    const sleeping=mood==='sleepy'||action==='sleep',hungry=mood==='hungry'||action==='eat';
    const excited=mood==='excited'||action==='dance',chaotic=mood==='chaotic'||mood==='overstimulated';
    const scared=mood==='scared'||action==='fly'||action==='scare';
    const flight=!quiet&&scared&&age<4.8?Math.sin(Math.PI*THREE.MathUtils.clamp(age/4.8,0,1)):0;
    const dancing=!quiet&&action==='dance'&&age<8;
    const dart=!quiet&&chaotic?.28*Math.sin(elapsed*3):0;
    const blend=1-Math.exp(-dt*5),breath=Math.sin(t*2.2)*(quiet?.003:sleeping?.004:.008);
    rig.fly.position.x=THREE.MathUtils.lerp(rig.fly.position.x,.2+dart+flight*.32,blend);
    rig.fly.position.y=THREE.MathUtils.lerp(rig.fly.position.y,flight*.85,blend);
    rig.fly.position.z=THREE.MathUtils.lerp(rig.fly.position.z,1+flight*.5,blend);
    rig.fly.rotation.y=THREE.MathUtils.lerp(rig.fly.rotation.y,quiet?0:mood==='bored'?.24:dancing?Math.sin(t*4)*.16:dart*.3,blend);
    rig.torso.position.y=breath+(dancing?Math.abs(Math.sin(t*5))*.035:0);
    rig.torso.rotation.z=dancing?Math.sin(t*5)*.065:0;
    rig.abdomen.scale.set(1+breath*.6,1+breath*2,1+breath*.4);
    const looking=quiet?0:hungry?Math.sin(t*1.25)*.3:mood==='bored'?.75:mood==='confused'?Math.sin(t*1.7)*.28:Math.sin(t*.8)*.095;
    rig.head.rotation.y=THREE.MathUtils.lerp(rig.head.rotation.y,looking,blend);
    rig.head.rotation.x=THREE.MathUtils.lerp(rig.head.rotation.x,sleeping?-.27:hungry?-.2+(action==='eat'?Math.sin(t*5)*.05:0):mood==='curious'?.12:flight?.15:0,blend);
    rig.head.rotation.z=quiet?0:mood==='confused'?Math.sin(t*1.3)*.15:mood==='annoyed'?Math.sin(t*3.4)*.08:Math.sin(t*.57)*.018;
    rig.proboscis.scale.y=action==='eat'&&!safe?1.3+Math.sin(t*7)*.2:1;
    for(let i=0;i<2;i++){
     const side=i===0?-1:1;
     rig.antennae[i].rotation.x=quiet?0:Math.sin(t*2.1+i)*.075;
     rig.antennae[i].rotation.z=quiet?0:side*Math.sin(t*1.7+i*.7)*.09;
     const flutter=quiet?.015:sleeping?.012:flight>.02?.45+Math.sin(t*43)*.35:excited?.18+Math.sin(t*27)*(.1+intensity*.13):.025+Math.sin(t*1.5)*.008;
     rig.wings[i].rotation.z=side*flutter;
     rig.wings[i].rotation.y=side*(flight>.02?.18:0);
    }
    // Feet stay planted during idle/breathing; only the hip and knee settle.
    for(const leg of rig.legs){
     hip.copy(leg.hip);hip.y+=rig.torso.position.y;knee.copy(leg.knee);knee.y+=breath*.45;
     ankle.copy(leg.ankle);toe.copy(leg.toe);
     const gait=!quiet&&(Math.abs(dart)>.005||dancing)?Math.max(0,Math.sin(t*8+leg.index*Math.PI+leg.side))* .085:0;
     const search=!quiet&&hungry&&leg.index===0?Math.max(0,Math.sin(t*1.7+leg.side))* .09:0;
     const tuck=flight*.18;
     ankle.y+=gait+search+tuck;toe.y+=gait+search+tuck;
     if(search){ankle.z-=search*.45;toe.z-=search*.45;}
     knee.x-=leg.side*tuck*.6;knee.y+=tuck*.3;
     fitSegment(leg.upper,hip,knee,.035);fitSegment(leg.lower,knee,ankle,.021);fitSegment(leg.foot,ankle,toe,.012);
    }
    const nextCosmetic=safe?'plain':c.cosmetic.toLowerCase();
    if(cosmetic!==nextCosmetic){
     cosmetic=nextCosmetic;const parts=cosmetic.split(/[\s:+,/]+/);
     rig.cap.visible=parts.includes('cap')||parts.includes('lab');rig.crown.visible=parts.includes('crown');
     const gold=parts.includes('gold')||parts.includes('goldbody')||parts.includes('amber'),neon=parts.includes('neon');
     rig.body.color.set(gold?'#c49b50':parts.includes('mint')?'#729b86':parts.includes('graphite')?'#66716d':'#8c683c');rig.body.metalness=gold?.65:.12;rig.body.roughness=gold?.35:.58;
     rig.wing.emissive.set(neon?'#79d6bc':'#000000');rig.wing.emissiveIntensity=neon?.2:0;rig.vein.color.set(neon?'#79d6bc':'#9db7ba');
    }
    if(output&&!reducedMotion){
     const close=!safe&&(action==='zoom_camera'||action==='zoom'||action==='eat'||action==='dance')&&age<8;
     if(close){cameraGoal.set(2.85,1.9,-.4);targetGoal.copy(rig.fly.position);targetGoal.y+=.7;targetGoal.z-=.05;}
     else{cameraGoal.set(scared&&!safe?5.3:4.7,scared&&!safe?3.25:2.9,scared&&!safe?6.4:5.6);targetGoal.set(0,1,-.1);}
     // More distance protects the full bench composition in a portrait viewport.
     if(camera.aspect<1)cameraGoal.sub(targetGoal).multiplyScalar(1.3).add(targetGoal);
     const cameraEase=1-Math.exp(-dt*.7);camera.position.lerp(cameraGoal,cameraEase);controls.target.lerp(targetGoal,cameraEase);
    }
    wasCharacter=true;
   }else if(wasCharacter){
    rig.fly.position.set(.2,0,1);rig.fly.rotation.set(0,0,0);rig.torso.position.set(0,0,0);rig.torso.rotation.set(0,0,0);rig.abdomen.scale.setScalar(1);rig.head.rotation.set(0,0,0);rig.cap.visible=false;rig.crown.visible=false;
    rig.antennae.forEach(antenna=>antenna.rotation.set(0,0,0));rig.wings.forEach(wing=>wing.rotation.set(0,0,0));
    rig.legs.forEach(leg=>{fitSegment(leg.upper,leg.hip,leg.knee,.035);fitSegment(leg.lower,leg.knee,leg.ankle,.021);fitSegment(leg.foot,leg.ankle,leg.toe,.012);});
    rig.body.color.set('#8c683c');rig.body.metalness=.12;rig.body.roughness=.58;rig.wing.emissive.set('#000000');rig.vein.color.set('#9db7ba');rig.proboscis.scale.setScalar(1);cosmetic='';wasCharacter=false;
   }
   controls.update();renderer.render(scene,camera);
   // Recorder/health panels can read real rendering telemetry from the canvas.
   if(!measurementStart)measurementStart=now;
   measuredFrames++;
   if(now-measurementStart>=1000){
    renderer.domElement.dataset.fps=(measuredFrames*1000/(now-measurementStart)).toFixed(1);
    renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);
    renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);
    measurementStart=now;measuredFrames=0;
   }
  };raf=requestAnimationFrame(frame);
  const contextLost=(event:Event)=>{event.preventDefault();setError('The 3D renderer lost its connection. Reload to restore the scene.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{
   cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();controls.dispose();motionQuery.removeEventListener('change',motionChange);
   renderer.domElement.removeEventListener('keydown',keyboard);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
   const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
   scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);if(object instanceof THREE.InstancedMesh)object.dispose();}});
   geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());texture.dispose();key.shadow.dispose();
   canvasRef.current=null;canvasCallback.current?.(null);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();setCamera.current=()=>{};
  };
 },[source,output]);
 const choose=(next:View)=>{setView(next);setCamera.current(next);};
 const stage=<div className="fly-stage"><div className="fly-canvas" ref={host}/>{error&&<p className="fly-error" role="status">{error}</p>}{!output&&<div className="fly-scene-tag">{mode==='kick'?'WAITING FOR SHARED VIDEO':mode==='sample'?'SAMPLE ON SCREEN':mode==='capture'?'SHARED VIDEO ON SCREEN':'LOCAL VIDEO ON SCREEN'}</div>}</div>;
 if(output)return <section className="fly-output" ref={section} aria-label="Fictional fly character broadcast">{stage}</section>;
 return <section className="fly-scene" ref={section} aria-labelledby="fly-scene-title">
  <div className="fly-scene-heading"><div><h2 id="fly-scene-title">Fly at the computer</h2><p>{mode==='capture'?'The monitor shows your shared video.':mode==='file'?'The monitor shows your local video.':mode==='sample'?'Try the scene with a sample, or share the JesusAVGN stream.':'Share the JesusAVGN tab to put the stream on this monitor.'}</p></div>{onShare&&<button onClick={onShare} disabled={busy}>Share Kick tab</button>}</div>
  {stage}
  <div className="fly-scene-tools"><div className="fly-view-buttons" aria-label="3D camera presets">{(['desk','fly','screen'] as const).map(v=><button key={v} aria-pressed={view===v} className={view===v?'active':''} onClick={()=>choose(v)}>{v==='desk'?'Whole desk':v==='fly'?'Fly close-up':'Screen view'}</button>)}<button className="icon-button" aria-label="Reset fly scene camera" onClick={()=>choose('desk')}><RotateCcw size={16}/></button></div><span>Drag to orbit · scroll to zoom</span><button className="icon-button" aria-label="Expand fly scene" onClick={()=>{if(document.fullscreenElement===section.current)document.exitFullscreen?.();else section.current?.requestFullscreen?.().catch(()=>setError('Fullscreen is unavailable. You can still rotate and zoom the scene.'));}}><Maximize size={17}/></button></div>
  <p className="fly-scene-caption">{character?'Fictional character animation · moods and reactions are entertainment, not measured fly behavior.':'Schematic 3D fly · enlarged for visibility. Pose and proportions are illustrative, not tracked behavior or calibrated screen geometry.'}</p>
 </section>;
}

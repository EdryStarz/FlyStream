export type Connection={id:string;name:string;synapses:number};
export type Neuron = { id:string;name:string;type:string;dataset:string;template?:string;swc:string;sourceUrl:string;vfbUrl:string;neurotransmitter?:{name:string;evidence:string}|null;upstream?:Connection[];downstream?:Connection[];[key:string]:unknown };
export type Manifest = {neurons:Neuron[];[key:string]:unknown};
export async function getAnatomy(signal?:AbortSignal):Promise<Manifest>{
  const response=await fetch('/data/neurons.json',{signal});if(!response.ok)throw new Error('Anatomy catalogue unavailable. Open VFB or retry.');
  const data=await response.json();if(!Array.isArray(data.neurons))throw new Error('Invalid anatomy catalogue.');return data;
}
export function parseSWC(text:string){
  const rows=text.split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith('#')).map(line=>line.trim().split(/\s+/).map(Number)).filter(r=>r.length>=7&&r.every(Number.isFinite));
  const points=new Map(rows.map(r=>[r[0],[r[2],r[3],r[4]]])),segments:number[]=[];
  for(const r of rows){const parent=points.get(r[6]);if(parent)segments.push(r[2],r[3],r[4],...parent);}
  if(!segments.length)throw new Error('No valid skeleton segments.');return new Float32Array(segments);
}

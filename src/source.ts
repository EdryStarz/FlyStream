/** Optional official-status adapter. Endpoint must be a same-origin server that
 * holds its own Kick app credentials. No secret is ever accepted by this UI. */
export type BroadcastStatus={state:'LIVE'|'OFFLINE'|'UNKNOWN';checkedAt:string|null;source:string};
export const unknownStatus:BroadcastStatus={state:'UNKNOWN',checkedAt:null,source:'No authenticated status service configured'};
export function parseKickStatus(payload:unknown,checkedAt=new Date().toISOString()):BroadcastStatus{
 const p=payload as {data?:{slug?:string;stream?:{is_live?:unknown}}[]};
 const channel=p?.data?.find(c=>c.slug==='jesusavgn');
 if(typeof channel?.stream?.is_live!=='boolean')return unknownStatus;
 return {state:channel.stream.is_live?'LIVE':'OFFLINE',checkedAt,source:'Kick official channels API'};
}
export async function readBroadcastStatus(endpoint:string,signal:AbortSignal):Promise<BroadcastStatus>{
 if(!endpoint)return unknownStatus;
 const url=new URL(endpoint,location.origin);if(url.origin!==location.origin)throw new Error('Status endpoint must be same-origin.');
 const response=await fetch(url,{signal,cache:'no-store'});if(!response.ok)throw new Error('Status service unavailable.');return parseKickStatus(await response.json());
}

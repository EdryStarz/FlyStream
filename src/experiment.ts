/** Future hardware adapter contract. These quantities describe geometry and
 * behaviour, never attention or measured neural activity. */
export interface TrackedPose {
 timestampMs:number;
 xMm:number;yMm:number;
 bodyYawRad:number;
 headYawRad:number|null;
 confidence:number;
 headTailResolved:boolean;
 evidence:'MEASURED';
}
export interface DisplayCalibration {widthMm:number;heightMm:number;centerXmm:number;centerYmm:number;normalYawRad:number;}
export interface PoseProvider {start(video:HTMLVideoElement):Promise<void>;getPose():TrackedPose|null;stop():void;}
export function stimulusGeometry(pose:TrackedPose,screen:DisplayCalibration){
 const dx=screen.centerXmm-pose.xMm,dy=screen.centerYmm-pose.yMm,distanceMm=Math.hypot(dx,dy);
 if(!Number.isFinite(distanceMm)||distanceMm<=0||pose.confidence<.8||!pose.headTailResolved)return null;
 const gaze=pose.headYawRad??pose.bodyYawRad;
 const bearing=Math.atan2(dy,dx)-gaze;
 return {distanceMm,bearingRad:Math.atan2(Math.sin(bearing),Math.cos(bearing)),angularWidthRad:2*Math.atan(screen.widthMm/2/distanceMm),usesBodyProxy:pose.headYawRad===null,evidence:'MODELLED' as const,assumption:'Display treated as frontoparallel; head direction is unknown when only body yaw is supplied.'};
}

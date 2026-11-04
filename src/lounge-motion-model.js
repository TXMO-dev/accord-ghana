// World coordinates, restricted to the Lounge plot and approach.
export function cleanLoungePose(p){
 if(!p||p.active===false)return {active:false};
 if(p.active!==true||![p.x,p.z,p.yaw].every(Number.isFinite)||p.x < -31||p.x > -15||p.z < 11||p.z > 25)throw Error('Walk within the Lounge to share movement.');
 return {active:true,x:Math.round(p.x*100)/100,z:Math.round(p.z*100)/100,yaw:Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw)),moving:p.moving===true};
}
export function smoothPose(current,target,dt){
 const a=1-Math.exp(-Math.min(Math.max(dt,0),.1)*8);
 return {x:current.x+(target.x-current.x)*a,z:current.z+(target.z-current.z)*a,yaw:current.yaw+Math.atan2(Math.sin(target.yaw-current.yaw),Math.cos(target.yaw-current.yaw))*a};
}

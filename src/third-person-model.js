export function movementDelta(forward,right,yaw,distance){
 const length=Math.hypot(forward,right);if(!length)return {x:0,z:0};
 return {x:(-Math.sin(yaw)*forward+Math.cos(yaw)*right)/length*distance,z:(-Math.cos(yaw)*forward-Math.sin(yaw)*right)/length*distance};
}
export function nearestInteraction(position,items,radius=2.1){
 let result=null,best=radius;for(const item of items){const p=item.object?.position||item.position;if(!p)continue;const distance=Math.hypot(p.x-position.x,p.z-position.z);if(distance<best){result=item;best=distance;}}return result;
}

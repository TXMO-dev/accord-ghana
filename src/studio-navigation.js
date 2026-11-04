import {courtyardObstacles} from './courtyard-layout.js';
// Shared by the visible character station and walking collision geometry.
export const characterStation={x:-4.8,z:-.65,w:.6,d:.5};
export const studioObstacles=[
 characterStation,...courtyardObstacles,
 {x:-4.4,z:3.7,w:1.5,d:.9},{x:5,z:-.6,w:.8,d:.6},{x:-.9,z:3.6,w:.85,d:.5},
 {x:-6.5,z:0,w:.25,d:10},{x:0,z:-5,w:13,d:.25},
 {x:-3,z:1,w:2.4,d:1.2},{x:-3,z:-2.5,w:1.5,d:1.2},{x:2.5,z:-2.4,w:2.2,d:1.1},
 {x:3,z:1.6,w:2.4,d:.3},{x:3,z:2.4,w:2.7,d:.65},{x:3.6,z:3.8,w:2,d:.85},
 {x:-6,z:-1,w:.7,d:2.8},...[[ -5.6,-3.8],[5.4,-3.8],[5.3,3.7],[-11,3],[11,-6],[14,10],[-10,-7]].map(([x,z])=>({x,z,w:.7,d:.7})),
 ...[-8,8].flatMap(x=>[-5,4].map(z=>({x,z,w:.22,d:.22}))),{x:-4.2,z:1.8,w:.45,d:.45},{x:1,z:-2.1,w:.45,d:.45}
];
export function blocked(x,z,obstacles=studioObstacles,radius=.27){
 if(x < -33||x>33||z < -9||z>37)return true;
 return obstacles.some(o=>{const cx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2)),cz=Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));return (x-cx)**2+(z-cz)**2<radius**2-1e-10;});
}
export function walkWithCollisions(position,delta,obstacles=studioObstacles){
 let {x,z}=position;const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.09));
 for(let i=0;i<steps;i++){const nx=x+delta.x/steps;if(!blocked(nx,z,obstacles))x=nx;const nz=z+delta.z/steps;if(!blocked(x,nz,obstacles))z=nz;}
 return {x,z};
}

// Grid routes keep the guide out of furniture; every segment is collision checked.
export function findStudioPath(start,goal,obstacles=studioObstacles){
 const step=.25,key=p=>`${p.x},${p.z}`;
 const clear=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05);for(let i=0;i<=n;i++){const t=n?i/n:0;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,obstacles))return false;}return true;};
 if(!clear(start,start)||!clear(goal,goal))return [];
 if(clear(start,goal))return [goal];
 const rounded={x:Math.round(start.x/step)*step,z:Math.round(start.z/step)*step};
 const candidates=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)candidates.push({x:rounded.x+dx*step,z:rounded.z+dz*step});
 candidates.sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));
 const origin=candidates.find(p=>clear(start,p));if(!origin)return [];
 const queue=[origin],parents=new Map([[key(origin),null]]);let end;
 for(let i=0;queue.length&&i<50000;i++){
  let best=0;for(let j=1;j<queue.length;j++)if(Math.hypot(queue[j].x-goal.x,queue[j].z-goal.z)<Math.hypot(queue[best].x-goal.x,queue[best].z-goal.z))best=j;
  const p=queue.splice(best,1)[0];if(Math.hypot(p.x-goal.x,p.z-goal.z)<.4&&clear(p,goal)){end=p;break;}
  for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const q={x:p.x+dx,z:p.z+dz};if(!parents.has(key(q))&&clear(p,q)){parents.set(key(q),p);queue.push(q);}}
 }
 if(!end)return [];
 const path=[goal];for(let p=end;p;p=parents.get(key(p)))path.unshift(p);
 return path;
}

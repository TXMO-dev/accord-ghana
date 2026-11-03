export const studioObstacles=[
 {x:-6.5,z:0,w:.25,d:10},{x:0,z:-5,w:13,d:.25},
 {x:-3,z:1,w:2.4,d:1.2},{x:-3,z:-2.5,w:1.5,d:1.2},{x:2.5,z:-2.4,w:2.2,d:1.1},
 {x:3,z:1.6,w:2.4,d:.3},{x:3,z:2.4,w:2.7,d:.65},{x:3.6,z:3.8,w:2,d:.85},
 {x:-6,z:-1,w:.7,d:2.8},...[[ -5.6,-3.8],[5.4,-3.8],[5.3,3.7],[-8,4],[8,-4],[11,9],[-10,-7]].map(([x,z])=>({x,z,w:.7,d:.7})),
 ...[-8,8].flatMap(x=>[-5,4].map(z=>({x,z,w:.22,d:.22}))),{x:-4.2,z:1.8,w:.45,d:.45},{x:1,z:-2.1,w:.45,d:.45}
];
export function blocked(x,z,obstacles=studioObstacles,radius=.27){
 if(x < -12||x>13||z < -9||z>12)return true;
 return obstacles.some(o=>{const cx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2)),cz=Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));return (x-cx)**2+(z-cz)**2<radius**2;});
}
export function walkWithCollisions(position,delta,obstacles=studioObstacles){
 let {x,z}=position;const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.09));
 for(let i=0;i<steps;i++){const nx=x+delta.x/steps;if(!blocked(nx,z,obstacles))x=nx;const nz=z+delta.z/steps;if(!blocked(x,nz,obstacles))z=nz;}
 return {x,z};
}

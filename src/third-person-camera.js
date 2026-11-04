import {Raycaster,Vector3} from 'three';

// Raise the camera above obstructions rather than pushing it inside the avatar.
export function chooseFollowPosition(target,yaw,pitch,hit){
 const distance=4.5,elevation=Math.max(1.6,Math.min(3.2,2.2+pitch));
 let position;
 for(const lift of [0,1.5,3.5,6]){
  position=new Vector3(target.x+Math.sin(yaw)*distance,target.y+elevation+lift,target.z+Math.cos(yaw)*distance);
  if(!hit(position))return position;
 }
 return position;
}

// Labels, particles and the controlled character are not camera obstacles.
export function cameraCollision(camera){
 const ray=new Raycaster(),direction=new Vector3();ray.camera=camera;
 return (scene,origin,destination,actor)=>{
  direction.subVectors(destination,origin);ray.far=direction.length();
  if(ray.far<.001)return null;
  ray.set(origin,direction.normalize());
  const meshes=[];
  function collect(object){
   if(!object.visible||object===actor)return;
   if(object.isMesh)meshes.push(object);
   for(const child of object.children)collect(child);
  }
  scene.updateMatrixWorld(true);collect(scene);
  return ray.intersectObjects(meshes,false).find(hit=>hit.distance>.15)||null;
 };
}

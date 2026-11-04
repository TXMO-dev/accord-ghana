import {Raycaster,Vector3} from 'three';

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

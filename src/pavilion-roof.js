import * as THREE from 'three';
// Roofs share one fade material per pavilion; timber posts remain solid.
export function createPavilionRoof(group,box){
 const material=new THREE.MeshStandardMaterial({color:'#866347',metalness:.45,roughness:.66,transparent:true});
 const skin=new THREE.Group();skin.position.set(0,2.78,0);skin.rotation.x=-.055;group.add(skin);
 for(let x=-1.5;x<=1.5;x+=1)box(.1,.12,2.7,x,-.085,0,'wood',skin);
 box(3.72,.045,2.76,0,0,0,material,skin);
 for(let x=-1.7;x<1.8;x+=.34)box(.025,.055,2.76,x,.048,0,material,skin);
 for(const z of [-1.38,1.38])box(3.76,.11,.045,0,-.035,z,material,skin);
 const bounds=new THREE.Box3(),ray=new THREE.Ray(),direction=new THREE.Vector3(),hit=new THREE.Vector3();
 return {update(camera,target,dt,instant=false){
  group.updateWorldMatrix(true,true);bounds.setFromObject(skin);
  direction.subVectors(target,camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());
  const blocks=!!ray.intersectBox(bounds,hit)&&hit.distanceTo(camera.position)<distance;
  const below=camera.position.x>bounds.min.x&&camera.position.x<bounds.max.x&&camera.position.z>bounds.min.z&&camera.position.z<bounds.max.z&&camera.position.y<bounds.max.y;
  const goal=(blocks||below)? .16 : 1;
  material.opacity=instant?goal:THREE.MathUtils.damp(material.opacity,goal,12,Math.max(dt,1/60));
  if(Math.abs(material.opacity-goal)<.005)material.opacity=goal;
  material.depthWrite=material.opacity>.98;
  skin.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=material.opacity>.98;});
  return material.opacity!==goal;
 },dispose(){material.dispose();}};
}

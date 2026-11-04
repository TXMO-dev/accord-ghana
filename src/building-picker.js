import * as THREE from 'three';
import {courtyardPlaces} from './courtyard-layout.js';
export function createBuildingPicker(){
 const material=new THREE.MeshBasicMaterial();
 const places=[{id:'studio',title:'THE STUDIO',x:0,z:0},...courtyardPlaces];
 const meshes=places.map(p=>{const cafe=p.id==='lounge',studio=p.id==='studio';const mesh=new THREE.Mesh(new THREE.BoxGeometry(studio?13:cafe?12:8,3.5,studio?10:cafe?10:5.8),material);mesh.position.set(p.x,1.4,p.z);mesh.updateMatrixWorld();mesh.userData.place=p;return mesh;});
 return {pick(raycaster){return raycaster.intersectObjects(meshes,false)[0]?.object.userData.place??null;},dispose(){for(const m of meshes)m.geometry.dispose();material.dispose();}};
}

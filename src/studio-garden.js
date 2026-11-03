import * as THREE from 'three';

// Planting stays beyond the walking boundary, preserving all project routes.
export function plantGarden(scene){
 const spots=[];for(let x=-18;x<=18;x+=3)spots.push({x,z:-19-(Math.abs(x)%2)});
 for(const x of [-24,24])for(let z=-12;z<=6;z+=3.5)spots.push({x,z});
 const dummy=new THREE.Object3D();
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.22,2.5,7),new THREE.MeshStandardMaterial({color:'#77563b',roughness:1}),spots.length);
 const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#547444',roughness:1}),spots.length*3);
 spots.forEach((p,i)=>{dummy.position.set(p.x,.7,p.z);dummy.rotation.set(0,i,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<3;j++){dummy.position.set(p.x+Math.sin(j*2.1)*.6,2.3+(j===0?.7:0),p.z+Math.cos(j*2.1)*.6);dummy.scale.set(1.35,1.15+(i%3)*.15,1.25);dummy.updateMatrix();leaves.setMatrixAt(i*3+j,dummy.matrix);leaves.setColorAt(i*3+j,new THREE.Color(['#537647','#67824b','#3f653e'][i%3]));}});
 trunks.castShadow=leaves.castShadow=true;scene.add(trunks,leaves);
 const shrubs=new THREE.InstancedMesh(new THREE.SphereGeometry(.45,8,6),new THREE.MeshStandardMaterial({color:'#6e8c50',roughness:1}),80);
 const blossoms=new THREE.InstancedMesh(new THREE.SphereGeometry(.065,6,4),new THREE.MeshStandardMaterial({color:'#eab9a0',roughness:.8}),160);
 for(let i=0;i<80;i++){const x=i<40?-13.3:14.1,z=-3+(i%40)*.5;dummy.position.set(x,.05,z);dummy.scale.set(1.2,.75,1.15);dummy.rotation.y=i;dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);for(let j=0;j<2;j++){dummy.position.set(x+Math.sin(i+j)*.25,.4+(i%3)*.04,z+Math.cos(i+j)*.2);dummy.scale.set(1,1,1);dummy.updateMatrix();blossoms.setMatrixAt(i*2+j,dummy.matrix);blossoms.setColorAt(i*2+j,new THREE.Color(['#f4d785','#d5a0b2','#eee3bd'][i%3]));}}
 scene.add(shrubs,blossoms);
}

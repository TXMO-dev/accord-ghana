import * as THREE from 'three';
import {courtyardPlaces,gardenTreeSpots} from './courtyard-layout.js';

// Planting stays beyond the walking boundary, preserving all project routes.
export function plantGarden(scene,wind){
 const spots=gardenTreeSpots();
 const dummy=new THREE.Object3D();
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.22,2.5,7),new THREE.MeshStandardMaterial({color:'#77563b',roughness:1}),spots.length);
 const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#547444',roughness:1}),spots.length*3);
 spots.forEach((p,i)=>{dummy.position.set(p.x,.7,p.z);dummy.rotation.set(0,i,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<3;j++){dummy.position.set(p.x+Math.sin(j*2.1)*.6,2.3+(j===0?.7:0),p.z+Math.cos(j*2.1)*.6);dummy.scale.set(1.35,1.15+(i%3)*.15,1.25);dummy.updateMatrix();leaves.setMatrixAt(i*3+j,dummy.matrix);leaves.setColorAt(i*3+j,new THREE.Color(['#537647','#67824b','#3f653e'][i%3]));}});
 const tips=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,3),new THREE.MeshStandardMaterial({color:'#89a05d',roughness:.95}),spots.length*24);
 spots.forEach((p,i)=>{for(let j=0;j<24;j++){const a=j*2.399,y=(j%8)/7,ring=Math.sqrt(1-(y-.5)*(y-.5));dummy.position.set(p.x+Math.cos(a)*1.55*ring,2.15+y*1.8,p.z+Math.sin(a)*1.55*ring);dummy.rotation.set(.4*Math.sin(a),a,.3);dummy.scale.set(.24,.055,.1);dummy.updateMatrix();tips.setMatrixAt(i*24+j,dummy.matrix);tips.setColorAt(i*24+j,new THREE.Color(j%2?'#78934f':'#a1ae6c'));}});
 scene.add(tips);wind?.sway(tips,{amplitude:.2,base:-1,height:2,flutter:.45});
 trunks.castShadow=leaves.castShadow=true;scene.add(trunks,leaves);wind?.sway(leaves,{amplitude:.18,base:-1,height:2});
 const shrubs=new THREE.InstancedMesh(new THREE.SphereGeometry(.45,8,6),new THREE.MeshStandardMaterial({color:'#6e8c50',roughness:1}),80);
 const blossoms=new THREE.InstancedMesh(new THREE.SphereGeometry(.065,6,4),new THREE.MeshStandardMaterial({color:'#eab9a0',roughness:.8}),160);
 for(let i=0;i<80;i++){const x=i<40?-13.3:14.1,z=-3+(i%40)*.5;const pathGap=z>5&&z<18;
 dummy.position.set(x,.05,z);dummy.scale.setScalar(pathGap?0:1);if(!pathGap)dummy.scale.set(1.2,.75,1.15);dummy.rotation.y=i;dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);for(let j=0;j<2;j++){dummy.position.set(x+Math.sin(i+j)*.25,.4+(i%3)*.04,z+Math.cos(i+j)*.2);dummy.scale.setScalar(pathGap?0:1);dummy.updateMatrix();blossoms.setMatrixAt(i*2+j,dummy.matrix);blossoms.setColorAt(i*2+j,new THREE.Color(['#f4d785','#d5a0b2','#eee3bd'][i%3]));}}
 // Stems and flowers share the same root, so gusts bend the complete plant.
 const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.018,.35,4),new THREE.MeshStandardMaterial({color:'#617848',roughness:1}),160);
 for(let i=0;i<160;i++){blossoms.getMatrixAt(i,dummy.matrix);dummy.matrix.decompose(dummy.position,dummy.quaternion,dummy.scale);dummy.position.y-=.175;dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);}
 wind?.sway(stems,{amplitude:.06,base:-.175,height:.35,flutter:.02});
 scene.add(stems);plantMeadow(scene,wind);
 scene.add(shrubs,blossoms);wind?.sway(shrubs,{amplitude:.08,base:-.45,height:.9});wind?.sway(blossoms,{amplitude:.04,base:-.065,height:.13});
}

// Instanced, segmented blades bend at their tips without per-frame CPU mesh updates.
function plantMeadow(scene,wind){
 let seed=7351;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const points=[];
 for(let i=0;i<12000;i++){
  const x=random()*76-38,z=random()*78-25;
  if(Math.abs(x)<15&&z<19&&z>-14)continue;
  if(Math.abs(x)<2.3||Math.abs(z-6.2)<2||Math.abs(z-22)<1.4)continue;
  if(courtyardPlaces.some(p=>Math.abs(x-p.x)<(p.id==='lounge'?9:6)&&Math.abs(z-p.z)<9))continue;
  points.push([x,z]);
 }
 const geometry=new THREE.PlaneGeometry(.09,.42,1,4);geometry.translate(0,.21,0);
 const position=geometry.attributes.position;
 for(let i=0;i<position.count;i++){const h=position.getY(i)/.42;position.setX(i,position.getX(i)*(1-h*.92));position.setZ(i,h*h*.07);}
 geometry.computeVertexNormals();
 const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,side:THREE.DoubleSide}),points.length);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 points.forEach(([x,z],i)=>{dummy.position.set(x,-.46,z);dummy.rotation.y=random()*Math.PI*2;dummy.scale.set(.65+random(),.55+random()*1.2,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setHSL(.19+random()*.07,.3+random()*.18,.23+random()*.13);mesh.setColorAt(i,color);});
 wind?.sway(mesh,{amplitude:.16,base:0,height:.42,flutter:.12});mesh.receiveShadow=true;scene.add(mesh);
}

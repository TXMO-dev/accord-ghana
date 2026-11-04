import * as THREE from 'three';
import {loungeSeats} from './courtyard-layout.js';
// Every destination has its own plot, with a clear approach down its centre.
export function buildDestinationPlot({group,box,place}){
 const cafe=place.id==='lounge',w=cafe?16:10,d=cafe?14:8;
 box(w,.08,d,0,-.21,1,'plaster',group);
 box(w+.6,.06,d+.6,0,-.3,1,'green',group);
 // Low planters define the boundary without screening the entrance.
 for(const side of [-1,1])for(const z of [-2,2,5]){
  box(.6,.35,1.2,side*(w/2-.45),.01,z,'wood',group);
  const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),new THREE.MeshStandardMaterial({color:'#68864a',roughness:1}));bush.position.set(side*(w/2-.45),.38,z);bush.scale.z=1.35;group.add(bush);
 }
 if(!cafe)return;
 box(12,.18,10,0,-.1,0,'floor',group);
 box(12,2.6,.2,0,1.2,-4.8,'plaster',group);
 for(let x=-5.5;x<6;x+=.5)box(.08,2.4,.09,x,1.2,-4.65,'wood',group);
 for(const x of [-5.8,5.8])for(const z of [-4.4,4.4])box(.2,3,.2,x,1.35,z,'wood',group);
 for(const z of [-4.4,4.4])box(12,.2,.2,0,2.75,z,'wood',group);
 for(const x of [-5.8,5.8])box(.2,.2,9,x,2.75,0,'wood',group);
 for(const [x,z] of loungeSeats){
  box(1.2,.1,.8,x,.75,z,'wood',group);box(.18,.75,.18,x,.32,z,'green',group);
  for(const side of [-1,1]){box(.5,.12,.55,x+side*.95,.4,z,'wood',group);box(.12,.8,.55,x+side*1.17,.7,z,'green',group);for(const dz of [-.2,.2])box(.07,.4,.07,x+side*.95,.15,z+dz,'wood',group);}
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.13,10),new THREE.MeshStandardMaterial({color:'#fff8e6'}));cup.position.set(x,.87,z);group.add(cup);
 }
 // Terrace tables sit under the open sides of a broad roof; the centre aisle stays clear.
}

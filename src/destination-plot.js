import * as THREE from 'three';
import {decorateDestination} from './destination-decor.js';
import {loungeSeats} from './courtyard-layout.js';
// Every destination has its own plot, with a clear approach down its centre.
export function buildDestinationPlot({group,box,place,materials}){
 const cafe=place.id==='lounge',w=cafe?16:10,d=cafe?14:8;
 box(w,.08,d,0,-.21,1,materials.tile,group);
 box(w+.6,.06,d+.6,0,-.3,1,'green',group);
 // Low planters define the boundary without screening the entrance.
 for(const side of [-1,1])for(const z of [-2,2,5]){
  box(.6,.35,1.2,side*(w/2-.45),.01,z,'wood',group);
  const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),new THREE.MeshStandardMaterial({color:'#68864a',roughness:1}));bush.position.set(side*(w/2-.45),.38,z);bush.scale.z=1.35;group.add(bush);
 }

 // Bicycle racks beside the approach, away from the centre aisle.
 for(const z of [-2.5,-1.5]){for(const x of [-.4,.4])box(.06,.75,.06,-w/2+1.3+x,.2,z,materials.metal,group);box(.86,.06,.06,-w/2+1.3,.57,z,materials.metal,group);}
 // Path lights and benches sit outside the main walkways.
 for(const side of [-1,1]){
  box(.12,.8,.12,side*(w/2-.8),.2,-3.8,materials.metal,group);
  box(.24,.1,.24,side*(w/2-.8),.65,-3.8,materials.lamp,group);
  box(1.5,.13,.5,side*(w/2-1.3),.4,6,'wood',group);
  for(const dx of [-.55,.55])box(.1,.5,.4,side*(w/2-1.3)+dx,.12,6,materials.metal,group);
 }
 if(!cafe){
  box(8,.1,5.8,0,-.08,0,materials.tile,group);
  box(8,2.8,.2,0,1.3,-2.8,materials.wall,group);
  for(const x of [-3.9,3.9])for(const z of [-2.5,2.5])box(.18,3.1,.18,x,1.4,z,materials.metal,group);
  for(const z of [-2.5,2.5])box(8,.18,.18,0,2.93,z,'wood',group);
  for(const x of [-3.9,3.9])box(.18,.18,5.2,x,2.93,0,'wood',group);
  // Clerestory panels add depth without closing the open sides.
  for(const side of [-1,1])box(.035,.7,3.3,side*3.9,2.4,-.6,materials.glass,group);
  if(place.id==='archive'){
   for(const x of [-2.8,2.8])for(const y of [.6,1.3,2]){
    box(1.3,.08,.4,x,y,-2.45,'wood',group);
    for(let i=0;i<4;i++)box(.18,.34,.25,x-.45+i*.3,y+.2,-2.43,i%2?'paper':'gold',group);
   }
  }else if(place.id==='review'){
   for(const x of [-2.2,2.2]){box(2,.95,.12,x,1.75,-2.62,materials.metal,group);box(1.8,.75,.025,x,1.75,-2.54,'green',group);for(let i=0;i<3;i++)box(1.3-i*.2,.035,.03,x,1.95-i*.17,-2.52,'paper',group);}
  }else{
   for(const side of [-1,1]){box(.7,.2,2,side*2.8,.4,.2,'wood',group);box(.7,.18,2,side*2.8,.59,.2,'paper',group);box(.12,.6,2,side*3.1,.8,.2,'green',group);}
   box(2.8,1.2,.08,0,1.8,-2.64,'green',group);
   for(let i=0;i<5;i++)box(.35,.35,.02,-1+i*.5,1.85,-2.58,i%2?'paper':'gold',group);
  }
  decorateDestination({group,box,place,materials});
  return;
 }
 box(12,.18,10,0,-.1,0,'floor',group);
 for(const y of [1.1,1.8]){box(4,.08,.4,-2.5,y,-4.4,'wood',group);for(let i=0;i<8;i++)box(.25,.3,.23,-4.1+i*.45,y+.19,-4.4,i%2?'green':'paper',group);}
 // Café service cabinet and glass display, distinct from the networking tables.
 box(2.6,.9,.7,3,.35,-3.8,'green',group);box(2.7,.08,.8,3,.84,-3.8,'wood',group);box(1.8,.5,.65,3,1.1,-3.8,materials.glass,group);
 for(let i=0;i<5;i++){const pastry=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshStandardMaterial({color:'#b98143',roughness:.9}));pastry.position.set(2.4+i*.3,.95,-3.8);pastry.scale.y=.6;group.add(pastry);}

 box(12,2.6,.2,0,1.2,-4.8,materials.wall,group);
 for(let x=-5.5;x<6;x+=.5)box(.08,2.4,.09,x,1.2,-4.65,'wood',group);
 for(const x of [-5.8,5.8])for(const z of [-4.4,4.4])box(.2,3,.2,x,1.35,z,'wood',group);
 for(const z of [-4.4,4.4])box(12,.2,.2,0,2.75,z,'wood',group);
 for(const x of [-5.8,5.8])box(.2,.2,9,x,2.75,0,'wood',group);
 for(const [x,z] of loungeSeats){
  box(1.2,.1,.8,x,.75,z,'wood',group);box(.18,.75,.18,x,.32,z,'green',group);
  for(const side of [-1,1]){box(.5,.12,.55,x+side*.95,.4,z,'wood',group);box(.12,.8,.55,x+side*1.17,.7,z,'green',group);for(const dz of [-.2,.2])box(.07,.4,.07,x+side*.95,.15,z+dz,'wood',group);}
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.13,10),new THREE.MeshStandardMaterial({color:'#fff8e6'}));cup.position.set(x,.87,z);group.add(cup);
 }
 decorateDestination({group,box,place,materials});
 // Terrace tables sit under the open sides of a broad roof; the centre aisle stays clear.
}

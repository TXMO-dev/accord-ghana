import * as THREE from 'three';
import {courtyardPlaces} from './courtyard-layout.js';
export function cyclingLane(position){return (Math.abs(position.x)>12||position.z>19)&&courtyardPlaces.every(p=>Math.hypot(position.x-p.x,position.z-p.z)>7);}
export function createGuideBicycle(scene){
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const metal=new THREE.MeshStandardMaterial({color:'#b4cb78',metalness:.6,roughness:.35}),rubber=new THREE.MeshStandardMaterial({color:'#253b32',roughness:1}),gold=new THREE.MeshStandardMaterial({color:'#c49552',metalness:.6,roughness:.4});
 const wheels=[];
 function rod(a,b,r=.035,material=metal){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),direction=bv.clone().sub(av),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,direction.length(),8),material);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(m);return m;}
 for(const z of [-.62,.62]){const wheel=new THREE.Group();wheel.position.set(0,.36,z);const tire=new THREE.Mesh(new THREE.TorusGeometry(.32,.045,8,20),rubber);tire.rotation.y=Math.PI/2;wheel.add(tire);for(let i=0;i<8;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.018,.62,.018),gold);spoke.rotation.x=i*Math.PI/8;wheel.add(spoke);}group.add(wheel);wheels.push(wheel);}
 const rear=[0,.36,-.62],front=[0,.36,.62],crank=[0,.38,-.05],seat=[0,.9,-.24],head=[0,.85,.4];
 for(const [a,b] of [[rear,crank],[crank,seat],[seat,rear],[seat,head],[head,crank],[head,front]])rod(a,b);
 rod([-.3,1.02,.4],[.3,1.02,.4],.03,gold);rod(head,[0,1.02,.4]);
 const saddle=new THREE.Mesh(new THREE.BoxGeometry(.25,.07,.25),rubber);saddle.position.set(0,.94,-.24);group.add(saddle);
 return {update(position,angle,active,dt){const amount=typeof active==='number'?active:Number(active);group.visible=amount>.01;if(!group.visible)return;
 for(const m of [metal,rubber,gold]){m.transparent=amount<.99;m.opacity=amount;}
 group.position.set(position.x,0,position.z);const difference=Math.atan2(Math.sin(angle-group.rotation.y),Math.cos(angle-group.rotation.y));group.rotation.y+=difference*Math.min(1,dt*9);wheels.forEach(w=>w.rotation.x+=dt*5*amount);},dispose(){scene.remove(group);group.traverse(o=>o.geometry?.dispose());metal.dispose();rubber.dispose();gold.dispose();}};
}

// Latch riding for the whole outdoor leg, rather than flickering at lane boundaries.
export function createRideState(){
 let target=null,eligible=false,amount=0;
 return {update(position,goal,dt,reduced=false){
  if(goal!==target){target=goal;eligible=!!goal&&Math.hypot(goal.x-position.x,goal.z-position.z)>12;}
  const distance=goal?Math.hypot(goal.x-position.x,goal.z-position.z):0;
  const outdoors=Math.abs(position.x)>8||position.z>5;
  const riding=!reduced&&eligible&&outdoors&&distance>2.8;
  const step=Math.max(0,Math.min(dt,.05))*2;
  amount=THREE.MathUtils.clamp(amount+(riding?step:-step),0,1);
  return {riding,amount};
 }};
}

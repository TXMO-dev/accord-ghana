import * as THREE from 'three';
import {createAvatar} from './avatar-character.js';
import {courtyardPlaces} from './courtyard-layout.js';
export function createGardeners(scene,register,speak){
 const workers=courtyardPlaces.filter(p=>p.id==='lounge'||p.id==='review').map((p,i)=>{
  const avatar=createAvatar({outfit:'striped-smock',region:i?'Upper East':'Northern',hair:'crop',skin:'#815138'}),g=avatar.group;scene.add(g);const x=p.x+(p.id==='lounge'?8.5:5.5),z=p.z+2.8;
  const canMaterial=new THREE.MeshStandardMaterial({color:'#b38a4a',metalness:.4,roughness:.5}),can=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.13,.12,.22,10),canMaterial);can.add(body);const spout=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.35,8),canMaterial);spout.rotation.z=-1;spout.position.set(-.2,.04,0);can.add(spout);can.position.set(-.35,.9,.22);g.add(can);
  const drops=new Float32Array(18*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(drops,3));const water=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#b6e0ed',size:.035,transparent:true,opacity:.65}));g.add(water);
  register(g,'Gardener — tending Accord’s gardens',()=>speak('A little care every day keeps this place growing. The paths lead to the studio, lounge and project buildings. Use the map whenever you need a shortcut.'));
  return {avatar,g,x,z,can,water,geometry,drops,material:canMaterial,offset:i*5000};
 });
 return {update(t,reduced){for(const w of workers){const phase=((t+w.offset)%18000)/18000,walking=phase<.3||phase>.7;w.avatar.update(t,reduced);w.g.position.set(w.x,0,w.z+(phase<.3?phase/.3:phase>.7?1-(phase-.7)/.3:1)*1.2);w.g.rotation.y=walking?(phase<.3?0:Math.PI):-Math.PI/2;w.avatar.walk(t,!reduced&&walking);w.can.rotation.z=walking?0:-.45;w.water.visible=!reduced&&!walking;for(let i=0;i<18;i++){const fall=((t*.0006+i/18)%1);w.drops.set([-.5-fall*.32,.85-fall*.75,.22+Math.sin(i)*.045],i*3);}w.geometry.attributes.position.needsUpdate=true;}},dispose(){for(const w of workers){scene.remove(w.g);w.avatar.dispose();w.material.dispose();w.geometry.dispose();w.water.material.dispose();}}};
}

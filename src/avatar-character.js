import * as THREE from 'three';
import {cleanAvatar} from './avatar-model.js';
export function createAvatar(value){
 const a=cleanAvatar(value),group=new THREE.Group(),materials={};
 for(const [key,color] of Object.entries({skin:a.skin,shirt:a.shirt,trousers:a.trousers,hair:'#241c19',shoes:'#242724',eyes:'#fffaf0'}))materials[key]=new THREE.MeshStandardMaterial({color,roughness:.8});
 const mesh=(geometry,material,x,y,z=0)=>{const m=new THREE.Mesh(geometry,materials[material]);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 const sphere=(r,mat,x,y,z=0)=>mesh(new THREE.SphereGeometry(r,12,8),mat,x,y,z);
 const body=mesh(new THREE.CapsuleGeometry(.2,.38,4,10),'shirt',0,1.02);body.scale.z=.7;
 sphere(.18,'skin',0,1.55);sphere(.055,'skin',0,1.53,.16);
 for(const side of [-1,1]){sphere(.028,'eyes',side*.065,1.59,.16);sphere(.014,'hair',side*.065,1.59,.183);sphere(.04,'skin',side*.18,1.54);}
 if(a.hair!=='none'){const cap=sphere(.19,'hair',0,1.65,-.02);cap.scale.y=a.hair==='crop'?.45:.7;if(a.hair==='bun')sphere(.12,'hair',0,1.78,-.1);if(a.hair==='curls')for(let i=0;i<7;i++)sphere(.065,'hair',Math.cos(i)*.15,1.69+Math.sin(i*2)*.03,Math.sin(i)*.12);}
 if(a.accessory==='glasses')for(const side of [-1,1])mesh(new THREE.TorusGeometry(.048,.009,5,12),'shoes',side*.065,1.59,.19);
 const arms=[],legs=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.25,1.24,0);group.add(arm);const limb=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.33,4,8),materials.skin);limb.position.y=-.22;arm.add(limb);arms.push(arm);legs.push(mesh(new THREE.CapsuleGeometry(.08,.49,4,8),'trousers',side*.11,.41));const foot=sphere(.1,'shoes',side*.11,.08,.06);foot.scale.set(1,.65,1.6);}
 let until=0,gesture='wave';
 return {group,react(action){gesture=['fund','submit','release','dispute','settle','thanks'].includes(action)?action:'wave';until=performance.now()+3200;},update(t,reduced=false){
 const active=!reduced&&t<until,celebrate=active&&gesture==='release',relief=active&&gesture==='settle';
 group.position.y=celebrate?Math.abs(Math.sin(t*.008))*.13:0;group.rotation.z=active&&gesture==='dispute'?Math.sin(t*.002)*.025:0;
 legs.forEach(l=>l.rotation.x=0);body.rotation.x=active&&gesture==='thanks'?.16:0;body.scale.y=relief?1+Math.sin(t*.003)*.035:1;
 arms.forEach((arm,i)=>{arm.rotation.set(0,0,i?.1:-.1);});
 if(active){if(gesture==='thanks'){arms[0].rotation.set(-.9,0,-.8);arms[1].rotation.set(-.9,0,.8);}else if(gesture==='submit'){arms.forEach(a=>a.rotation.x=-1.25);}else if(gesture==='fund'){arms[1].rotation.x=-1;arms[1].rotation.z=.35;}else if(gesture==='dispute'){arms[1].rotation.x=-.8;arms[1].rotation.z=2;}else if(relief){arms[0].rotation.z=-.7;arms[1].rotation.z=.7;}else{arms[1].rotation.z=2.5+Math.sin(t*.012)*.2;if(celebrate)arms[0].rotation.z=-2.5;}}
 },walk(t,moving){legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(t*.009+i*Math.PI)*.3:0);if(moving){arms.forEach((arm,i)=>arm.rotation.x=-Math.sin(t*.009+i*Math.PI)*.2);group.position.y=Math.abs(Math.sin(t*.009))*.025;}},dispose(){group.traverse(o=>{if(o.isMesh)o.geometry?.dispose();if(o.isSprite)o.material.dispose();});Object.values(materials).forEach(m=>m.dispose());}};
}

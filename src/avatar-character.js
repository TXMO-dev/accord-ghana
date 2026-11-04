import {clothingTexture} from './clothing-texture.js';
import * as THREE from 'three';
import {cleanAvatar} from './avatar-model.js';
export function createAvatar(value){
 const a=cleanAvatar(value),group=new THREE.Group(),materials={};
 for(const [key,color] of Object.entries({skin:a.skin,shirt:a.shirt,trousers:a.trousers,hair:'#241c19',shoes:'#242724',eyes:'#fffaf0'}))materials[key]=new THREE.MeshStandardMaterial({color,roughness:.8});
 const textile=clothingTexture(a.outfit,a.region);if(textile){materials.shirt.map=textile;materials.shirt.color.set('#ffffff');}
 const mesh=(geometry,material,x,y,z=0)=>{const m=new THREE.Mesh(geometry,materials[material]);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 const sphere=(r,mat,x,y,z=0)=>mesh(new THREE.SphereGeometry(r,12,8),mat,x,y,z);
 const body=mesh(new THREE.CapsuleGeometry(.2,.38,4,10),'shirt',0,1.02);body.scale.z=.7;
 if(a.outfit!=='plain'){const hem=mesh(new THREE.CylinderGeometry(.2,a.outfit==='striped-smock'?.32:.25,a.outfit==='woven-wrap'?.53:.3,12),'shirt',0,a.outfit==='woven-wrap'?.73:.85);hem.scale.z=.72;if(a.outfit==='woven-wrap'){const sash=mesh(new THREE.BoxGeometry(.18,.57,.035),'shirt',.07,1.12,.16);sash.rotation.z=-.4;}}
 sphere(.18,'skin',0,1.55);sphere(.055,'skin',0,1.53,.16);
 for(const side of [-1,1]){sphere(.028,'eyes',side*.065,1.59,.16);sphere(.014,'hair',side*.065,1.59,.183);sphere(.04,'skin',side*.18,1.54);}
 if(a.hair!=='none'){const cap=sphere(.19,'hair',0,1.65,-.02);cap.scale.y=a.hair==='crop'?.45:.7;if(a.hair==='bun')sphere(.12,'hair',0,1.78,-.1);if(a.hair==='curls')for(let i=0;i<7;i++)sphere(.065,'hair',Math.cos(i)*.15,1.69+Math.sin(i*2)*.03,Math.sin(i)*.12);}
 if(a.accessory==='glasses')for(const side of [-1,1])mesh(new THREE.TorusGeometry(.048,.009,5,12),'shoes',side*.065,1.59,.19);
 const upper=new THREE.Group();upper.name='upper-body';upper.position.y=.9;for(const part of [...group.children]){part.position.y-=.9;upper.add(part);}group.add(upper);
 const arms=[],legs=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.25,.34,0);upper.add(arm);const limb=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.33,4,8),materials.skin);limb.position.y=-.22;arm.add(limb);if(a.outfit!=='plain'){const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.1,.11,.2,10),materials.shirt);sleeve.position.y=-.08;arm.add(sleeve);}arms.push(arm);
 const leg=new THREE.Group();leg.name=side<0?'left-leg':'right-leg';leg.position.set(side*.11,.72,0);group.add(leg);const shin=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.49,4,8),materials.trousers);shin.position.y=-.31;leg.add(shin);const foot=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),materials.shoes);foot.position.set(0,-.64,.06);foot.scale.set(1,.65,1.6);leg.add(foot);legs.push(leg);}
 const folio=new THREE.Mesh(new THREE.BoxGeometry(.3,.04,.23),materials.eyes);folio.position.set(0,.12,.42);folio.name='delivery-document';folio.visible=false;upper.add(folio);
 let until=0,clock=0,gesture='wave';
 return {group,react(action){gesture=['fund','submit','release','dispute','settle','thanks','revision','review','receive'].includes(action)?action:'wave';until=clock+3200;},update(t,reduced=false){
 clock=t;const active=!reduced&&t<until,celebrate=active&&gesture==='release',relief=active&&gesture==='settle';
 folio.visible=active&&['submit','revision'].includes(gesture);group.position.y=celebrate?Math.abs(Math.sin(t*.008))*.13:0;group.rotation.z=active&&gesture==='dispute'?Math.sin(t*.002)*.025:0;
 legs.forEach(l=>l.rotation.x=0);upper.rotation.x=active&&gesture==='thanks'?Math.sin(Math.PI*Math.max(0,Math.min(1,1-(until-t)/3200)))*.3:0;if(active&&['receive','review'].includes(gesture))upper.rotation.x=Math.sin(t*.004)*.06;body.scale.y=relief?1+Math.sin(t*.003)*.035:1;
 arms.forEach((arm,i)=>{arm.rotation.set(0,0,i?.1:-.1);});
 if(active){if(gesture==='thanks'){arms[0].rotation.set(-.9,0,-.8);arms[1].rotation.set(-.9,0,.8);}else if(['submit','revision','receive'].includes(gesture)){arms.forEach(a=>a.rotation.x=-1.25);}else if(gesture==='review'){arms[1].rotation.x=-1;arms[1].rotation.z=.5;}else if(gesture==='fund'){arms[1].rotation.x=-1;arms[1].rotation.z=.35;}else if(gesture==='dispute'){arms[1].rotation.x=-.8;arms[1].rotation.z=2;}else if(relief){arms[0].rotation.z=-.7;arms[1].rotation.z=.7;}else{arms[1].rotation.z=2.5+Math.sin(t*.012)*.2;if(celebrate)arms[0].rotation.z=-2.5;}}
 },walk(t,moving){legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(t*.009+i*Math.PI)*.3:0);if(moving){arms.forEach((arm,i)=>arm.rotation.x=-Math.sin(t*.009+i*Math.PI)*.2);group.position.y=Math.abs(Math.sin(t*.009))*.025;}},dispose(){group.traverse(o=>{if(o.isMesh)o.geometry?.dispose();if(o.isSprite)o.material.dispose();});textile?.dispose();Object.values(materials).forEach(m=>m.dispose());}};
}

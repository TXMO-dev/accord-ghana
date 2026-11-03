import * as THREE from 'three';
import {courtyardPlaces} from './courtyard-layout.js';

export function buildCourtyard({scene,box,register,actions,focus,speak,wake,paused,shortcuts}){
 const textures=[],lamps=[];
 const map=document.createElement('dialog');map.className='room-keyboard-help courtyard-map';map.innerHTML='<h2>Your Accord neighbourhood</h2><p>Choose a destination to move the camera. Select its desk to open your project tools, or use Walk inside to explore on foot.</p><div class="courtyard-map-grid"></div><button type="button" class="secondary courtyard-map-close">Back to the world</button>';document.body.append(map);
 const mapButton=document.createElement('button');mapButton.type='button';mapButton.textContent='World map';mapButton.onclick=()=>{if(!map.open)map.showModal();};document.querySelector('.room-view-controls').append(mapButton);
 map.querySelector('.courtyard-map-close').onclick=()=>map.close();map.addEventListener('close',wake);
 for(const place of [{title:'THE STUDIO',caption:'Agree, fund, deliver and release',x:0,z:0},...courtyardPlaces]){const button=document.createElement('button'),name=document.createElement('strong'),caption=document.createElement('span');button.type='button';name.textContent=place.title;caption.textContent=place.caption;button.append(name,caption);button.onclick=()=>{map.close();focus(place);};map.querySelector('.courtyard-map-grid').append(button);}
 for(const p of courtyardPlaces){
  const group=new THREE.Group();group.position.set(p.x,0,p.z);scene.add(group);
  // Flush paving keeps the walking surface continuous; open pergolas retain sightlines.
  box(3.6,.04,2.7,0,-.13,0,'plaster',group);
  for(const dx of [-1.65,1.65])for(const dz of [-.9,.9])box(.16,3.1,.16,dx,1.4,dz,'wood',group);
  for(let i=0;i<8;i++)box(.12,.1,2.3,-1.6+i*.46,3,0,i%2?'gold':'wood',group);
  box(2.1,.12,.7,0,.85,0,'wood',group);box(.55,.85,.5,0,.35,0,'green',group);
  box(1.7,.025,.48,0,.925,0,'paper',group);
  const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');
  ctx.fillStyle='#123d30';ctx.fillRect(0,0,768,192);ctx.textAlign='center';ctx.fillStyle='#e1ecad';ctx.font='bold 38px Arial';ctx.fillText(p.title,384,72);ctx.fillStyle='#fff8e6';ctx.font='28px Arial';ctx.fillText(p.caption,384,128);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3,.75),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(0,2.35,.92);group.add(sign);
  // Courtyard is viewed from the entrance as well as from the front-facing overview.
  const reverse=sign.clone();reverse.material=sign.material.clone();reverse.rotation.y=Math.PI;reverse.position.z=-.92;group.add(reverse);
  const material=new THREE.MeshStandardMaterial({color:'#e1ecad',emissive:'#a3c887',emissiveIntensity:.25});
  const light=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),material);light.position.set(.85,1.05,0);group.add(light);lamps.push({id:p.id,material});
  const activate=()=>{focus(p);actions[p.id]();};register(group,p.title+' — '+p.caption,activate);
  const button=document.createElement('button');button.type='button';button.textContent='Visit '+p.title.toLowerCase();button.onclick=()=>{focus(p);speak(p.caption+'. Select the pavilion desk to open it.');};shortcuts.append(button);
 }
 // Low-cost paving accents connect the three destinations without blocking the entrance.
 for(let x=-6;x<=6;x+=.75)box(.32,.012,.12,x,-.165,6.8,'gold');
 // Instanced planting adds a soft green boundary with one draw call.
 const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.075,.4,3),new THREE.MeshStandardMaterial({color:'#71884e',roughness:1}),160),dummy=new THREE.Object3D();
 for(let i=0;i<160;i++){const side=i<80?-1:1,j=i%80;dummy.position.set(side*(8.5+(j%8)*.14),-.01,6.5+Math.floor(j/8)*.48);dummy.rotation.y=j*2.4;dummy.scale.set(1,.65+(j%5)*.17,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);
 let unread=false;
 const notice=()=>{unread=true;wake();},read=()=>{unread=false;wake();};
 addEventListener('accord-review-notice',notice);addEventListener('accord-room-new-comment',notice);
 addEventListener('accord-open-review-table',read);addEventListener('accord-open-project-room',read);addEventListener('accord-wallet',read);
 return {update(t){for(const lamp of lamps)lamp.material.emissiveIntensity=unread&&lamp.id!=='archive'?(paused()?.45:.45+Math.sin(t*.002)*.15):.2;},dispose(){map.remove();mapButton.remove();for(const t of textures)t.dispose();removeEventListener('accord-review-notice',notice);removeEventListener('accord-room-new-comment',notice);removeEventListener('accord-open-review-table',read);removeEventListener('accord-open-project-room',read);removeEventListener('accord-wallet',read);}};
}

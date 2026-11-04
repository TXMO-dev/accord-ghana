import {buildDestinationPlot} from './destination-plot.js';
import * as THREE from 'three';
import {createPavilionRoof} from './pavilion-roof.js';
import {courtyardPlaces} from './courtyard-layout.js';

export function buildCourtyard({scene,box,register,actions,focus,speak,wake,paused,shortcuts}){
 const textures=[],lamps=[],roofs=[];
 for(const p of courtyardPlaces){
  const group=new THREE.Group();group.position.set(p.x,0,p.z);scene.add(group);
  buildDestinationPlot({group,box,place:p});
  // Flush paving keeps the walking surface continuous; open pergolas retain sightlines.
  box(3.6,.04,2.7,0,-.13,0,'plaster',group);
  if(p.id!=='lounge'){
   for(const dx of [-1.65,1.65]){
    for(const z of [-.9,.9])box(.16,2.8,.16,dx,1.25,z,'wood',group);
    const brace=box(.1,.1,Math.hypot(.8,1.7),dx,2.1,-.05,'wood',group);brace.rotation.x=-Math.atan2(.8,1.7);
   }
   for(const z of [-.9,.8])box(3.5,.18,.16,0,2.56+z*.055,z,'wood',group);
   roofs.push(createPavilionRoof(group,box));
  }
  if(p.id==='lounge'){const roofGroup=new THREE.Group();roofGroup.scale.set(3.3,1,3.5);group.add(roofGroup);roofs.push(createPavilionRoof(roofGroup,box));}
  box(2.1,.12,.7,0,.85,0,'wood',group);box(.55,.94,.5,0,.32,0,'green',group);
  box(1.7,.025,.48,0,.925,0,'paper',group);
  if(p.id==='lounge'){
   // Coffee machine, cups and a woven counter runner distinguish the café.
   box(.55,.48,.32,-.48,1.18,0,'green',group);
   box(.42,.08,.38,-.48,.98,.06,'gold',group);
   for(const x of [.15,.46,.77]){
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.07,.055,.13,12),new THREE.MeshStandardMaterial({color:'#fff8e6',roughness:.65}));cup.position.set(x,1,.08);group.add(cup);
   }
   for(let i=0;i<9;i++)box(.035,.008,.42,-.05+i*.1,.948,0,i%2?'gold':'green',group);
  }
  const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');
  ctx.fillStyle='#123d30';ctx.fillRect(0,0,768,192);ctx.textAlign='center';ctx.fillStyle='#e1ecad';ctx.font='bold 38px Arial';ctx.fillText(p.title,384,72);ctx.fillStyle='#fff8e6';ctx.font='28px Arial';ctx.fillText(p.caption,384,128);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
  for(const x of [-.8,.8])box(.06,.84,.06,x,1.33,.38,'wood',group);
  box(2.24,.59,.04,0,1.75,.38,'wood',group);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.55),new THREE.MeshBasicMaterial({map:texture,side:THREE.FrontSide}));sign.position.set(0,1.75,.405);group.add(sign);
  // Courtyard is viewed from the entrance as well as from the front-facing overview.
  const reverse=sign.clone();reverse.material=sign.material.clone();reverse.rotation.y=Math.PI;reverse.position.z=.355;group.add(reverse);
  const material=new THREE.MeshStandardMaterial({color:'#e1ecad',emissive:'#a3c887',emissiveIntensity:.25});
  const light=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),material);light.position.set(.85,1.05,0);group.add(light);lamps.push({id:p.id,material});
  const activate=()=>{focus(p);actions[p.id]();};register(group,p.title+' — '+p.caption,activate);
  const button=document.createElement('button');button.type='button';button.textContent='Visit '+p.title.toLowerCase();button.onclick=()=>{focus(p);speak(p.caption+'. Select the pavilion desk to open it.');};shortcuts.append(button);
 }
 for(let z=7;z<=28;z+=1)box(2,.02,.8,0,-.18,z,'plaster');
 for(let x=-23;x<0;x+=1)box(.8,.02,1.6,x,-.18,12.4,'plaster');
 for(let x=-23;x<=23;x+=1)box(.8,.02,1.6,x,-.18,6.2,'plaster');
 for(const p of courtyardPlaces)for(let z=7;z<p.z-1;z+=1)box(2,.02,.85,p.x,-.18,z,'plaster');
 // Low-cost paving accents connect the three destinations without blocking the entrance.
 for(let x=-6;x<=6;x+=.75)box(.32,.012,.12,x,-.165,6.8,'gold');
 // Instanced planting adds a soft green boundary with one draw call.
 const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.075,.4,3),new THREE.MeshStandardMaterial({color:'#71884e',roughness:1}),160),dummy=new THREE.Object3D();
 for(let i=0;i<160;i++){const side=i<80?-1:1,j=i%80;dummy.position.set(side*(11.1+(j%8)*.14),-.01,6.5+Math.floor(j/8)*.48);dummy.rotation.y=j*2.4;dummy.scale.set(1,.65+(j%5)*.17,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);
 let unread=false;
 const notice=()=>{unread=true;wake();},read=()=>{unread=false;wake();};
 addEventListener('accord-review-notice',notice);addEventListener('accord-room-new-comment',notice);
 addEventListener('accord-open-review-table',read);addEventListener('accord-open-project-room',read);addEventListener('accord-wallet',read);
 return {updateRoofs(camera,target,dt){return roofs.map(roof=>roof.update(camera,target,dt,paused())).some(Boolean);},update(t){for(const lamp of lamps)lamp.material.emissiveIntensity=unread&&lamp.id!=='archive'?(paused()?.45:.45+Math.sin(t*.002)*.15):.2;},dispose(){for(const roof of roofs)roof.dispose();for(const t of textures)t.dispose();removeEventListener('accord-review-notice',notice);removeEventListener('accord-room-new-comment',notice);removeEventListener('accord-open-review-table',read);removeEventListener('accord-open-project-room',read);removeEventListener('accord-wallet',read);}};
}

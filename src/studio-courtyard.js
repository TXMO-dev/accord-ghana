import {createCommunityBoard} from './lounge-community-board.js';
import {createGardenParticles} from './garden-particles.js';
import {createGardeners} from './studio-gardeners.js';
import {neighbourhoodMaterials} from './neighbourhood-materials.js';
import {buildDestinationPlot} from './destination-plot.js';
import * as THREE from 'three';
import {createPavilionRoof} from './pavilion-roof.js';
import {courtyardPlaces} from './courtyard-layout.js';

export function buildCourtyard({scene,box,register,actions,focus,speak,wake,paused,shortcuts}){
 const communityBoards=[],textures=[],lamps=[],roofs=[],materials=neighbourhoodMaterials();
 const particles=createGardenParticles(scene);
 const gardeners=createGardeners(scene,register,speak);
 const useDestination=e=>actions[e.detail]?.();addEventListener('accord-use-destination',useDestination);
 for(const p of courtyardPlaces){
  const group=new THREE.Group();group.position.set(p.x,0,p.z);scene.add(group);
  buildDestinationPlot({group,box,place:p,materials});
  // Flush paving keeps the walking surface continuous; open pergolas retain sightlines.
  box(3.6,.04,2.7,0,-.13,0,'plaster',group);
  const roofGroup=new THREE.Group();roofGroup.scale.set(...(p.id==='lounge'?[3.3,1,3.5]:[2.2,1.12,2.15]));group.add(roofGroup);roofs.push(createPavilionRoof(roofGroup,box));
  box(2.1,.12,.7,0,.85,0,'wood',group);box(.55,.94,.5,0,.32,0,'green',group);
  box(1.7,.025,.48,0,.925,0,'paper',group);
  if(p.id!=='lounge'){
   if(p.id==='archive'){
    for(let i=0;i<5;i++){box(.38,.035,.3,-.5+i*.025,.97+i*.04,.05,i%2?'paper':'gold',group);box(.12,.27,.22,.2+i*.14,1.08,-.08,i%2?'green':'paper',group);}
   }else{
    box(.68,.44,.055,-.25,1.24,-.13,'green',group);box(.59,.35,.015,-.25,1.24,-.095,'screen',group);box(.08,.18,.08,-.25,1,-.13,'gold',group);box(.4,.025,.22,-.25,.96,-.13,'wood',group);
    box(.5,.025,.18,-.25,.97,.2,'green',group);for(let i=0;i<7;i++)box(.035,.01,.12,-.45+i*.065,.99,.2,'paper',group);
    box(.16,.035,.23,.35,.97,.12,'gold',group);
   }
  }
  if(p.id==='lounge'){
   communityBoards.push(createCommunityBoard({group,box,register,open:actions.lounge,wake}));
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
 return {updateRoofs(camera,target,dt){return roofs.map(roof=>roof.update(camera,target,dt,paused())).some(Boolean);},update(t){particles.update(t,paused());gardeners.update(t,paused());for(const lamp of lamps)lamp.material.emissiveIntensity=unread&&lamp.id!=='archive'?(paused()?.45:.45+Math.sin(t*.002)*.15):.2;},dispose(){for(const board of communityBoards)board.dispose();removeEventListener('accord-use-destination',useDestination);gardeners.dispose();particles.dispose();materials.dispose();for(const roof of roofs)roof.dispose();for(const t of textures)t.dispose();removeEventListener('accord-review-notice',notice);removeEventListener('accord-room-new-comment',notice);removeEventListener('accord-open-review-table',read);removeEventListener('accord-open-project-room',read);removeEventListener('accord-wallet',read);}};
}

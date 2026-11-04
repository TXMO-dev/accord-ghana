import * as THREE from 'three';
import {createAvatar} from './avatar-character.js';
import {walkWithCollisions,blocked} from './studio-navigation.js';
import {movementDelta,nearestInteraction} from './third-person-model.js';
import './third-person.css';
import {cameraCollision} from './third-person-camera.js';

export function createThirdPerson({scene,camera,host,canvas,avatars,mascot,clientGuide,freelancerGuide,citizens,stations,held,obstacles,wake,paused,useStation,openProjectRoom,tour,key}){
 let active=false,actor=null,time=0,nearest=null,yaw=0,pitch=0;
 const guest=createAvatar();guest.group.visible=false;scene.add(guest.group);
 const hud=document.createElement('div');hud.className='third-person-hud';hud.hidden=true;
 const hint=document.createElement('span');hint.textContent='WASD / arrows to walk · drag to orbit';
 const talk=document.createElement('button');talk.type='button';talk.onclick=interact;
 const pad=document.createElement('div');pad.className='third-person-pad';pad.setAttribute('aria-label','Walk controls');
 for(const [direction,label] of [['forward','↑'],['left','←'],['back','↓'],['right','→']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label','Walk '+direction);b.onpointerdown=e=>{e.preventDefault();canvas.focus({preventScroll:true});b.setPointerCapture(e.pointerId);step(direction,yaw);held.add(direction);wake();};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>held.delete(direction));b.onclick=e=>{if(e.detail===0)step(direction,yaw);};pad.append(b);}
 hud.append(hint,talk,pad);host.append(hud);
 const dialog=document.createElement('dialog');dialog.className='room-keyboard-help studio-conversation';
 const title=document.createElement('h2'),copy=document.createElement('p'),choices=document.createElement('div'),end=document.createElement('button');end.textContent='End conversation';end.type='button';end.onclick=()=>dialog.close();dialog.append(title,copy,choices,end);document.body.append(dialog);
 dialog.addEventListener('close',()=>{held.clear();canvas.focus({preventScroll:true});wake();});
 function model(){return avatars.getSelf()||guest;}
 function adopt(){const next=model();if(next===actor)return;const position=actor?.group.position.clone();actor=next;guest.group.visible=active&&actor===guest;if(position)actor.group.position.copy(position);else actor.group.position.set(0,0,4.7);if(blocked(actor.group.position.x,actor.group.position.z,obstacles())){for(const [x,z] of [[0,5.5],[1,6],[-1,6],[0,7]]){if(!blocked(x,z,obstacles())){actor.group.position.set(x,0,z);break;}}}actor.route=[];}
 function start(){active=true;host.classList.add('third-person-active');avatars.setControlled(true);adopt();hud.hidden=false;held.clear();follow(true);wake();}
 function stop(){if(!active)return;active=false;host.classList.remove('third-person-active');hud.hidden=true;guest.group.visible=false;held.clear();dialog.close();avatars.setControlled(false);}
 function candidates(){return [
  {object:mascot,title:'Kobi · studio guide',copy:'Hi, I’m Kobi! I can show you how an agreement moves from clear terms to payment.',choices:[['Show me around',tour],['Open my project room',openProjectRoom]]},
  {object:clientGuide,title:'Client guide',copy:'Agree the scope first, fund the milestone, then review the delivery before releasing payment. I’m a studio guide, not your project partner.',choices:[['Agree on the work',()=>useStation(0)],['Review delivery',()=>useStation(3)]]},
  {object:freelancerGuide,title:'Freelancer guide',copy:'Check that the milestone is funded before starting. When ready, submit your delivery for the client to review. Your wallet approves the submission.',choices:[['Open delivery studio',()=>useStation(2)]]},
  ...citizens.map(({g},i)=>({object:g,title:'Neighbour · studio tips',copy:i%2?'Keep a clear delivery reference and your transaction receipts. The Receipt Gallery helps you find the record of your work.':'A useful acceptance condition says exactly what you will deliver and how the client will check it. Clear terms help both people.',choices:[['Visit my agreements',openProjectRoom]]})),
  ...avatars.getPeers().map(({wallet,model:m})=>({object:m.group,title:'Project partner · '+wallet.slice(0,4)+'…'+wallet.slice(-4),copy:'Open your shared room to send this participant a real message. This character does not answer on their behalf.',choices:[['Open shared conversation',openProjectRoom]]})),
  ...stations.map((s,i)=>({position:{x:s.pos[0],z:s.pos[2]},title:s.title,copy:s.copy,choices:[[s.action,()=>useStation(i)]]}))
 ];}
 function interact(){if(!active)return;nearest=nearestInteraction(actor.group.position,candidates());if(!nearest){hint.textContent='Walk closer to Kobi, a guide, a partner or a workstation.';return;}held.clear();title.textContent=nearest.title;copy.textContent=nearest.copy;choices.replaceChildren();for(const [label,action] of nearest.choices){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{dialog.close();action();};choices.append(b);}if(nearest.object){const p=nearest.object.position;actor.group.rotation.y=Math.atan2(p.x-actor.group.position.x,p.z-actor.group.position.z);}actor.react('wave');dialog.showModal();}
 function step(direction,angle){if(!active||dialog.open)return;const d=movementDelta(direction==='forward'?1:direction==='back'?-1:0,direction==='right'?1:direction==='left'?-1:0,angle,.12);move(d);follow(true);wake();}
 function move(delta){const p=actor.group.position,next=walkWithCollisions(p,delta,[...obstacles(),...avatars.getPeers().map(({model:m})=>({x:m.group.position.x,z:m.group.position.z,w:.45,d:.45}))]);const distance=Math.hypot(next.x-p.x,next.z-p.z);if(distance>.0001){actor.group.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);p.x=next.x;p.z=next.z;}return distance;}
 const collision=cameraCollision(camera),target=new THREE.Vector3(),desired=new THREE.Vector3(),direction=new THREE.Vector3();
 function follow(snap=false,dt=.016){if(!actor)return;target.copy(actor.group.position);target.y+=1.2;const elevation=Math.max(.5,Math.min(2.6,1.2+pitch*2));desired.set(target.x+Math.sin(yaw)*3.4,target.y+elevation,target.z+Math.cos(yaw)*3.4);direction.subVectors(desired,target).normalize();const hit=collision(scene,target,desired,actor.group);if(hit)desired.copy(target).addScaledVector(direction,Math.max(.3,hit.distance-.2));if(snap||hit)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*12));camera.lookAt(target);}
 function update(dt,angle,tilt){if(!active)return;adopt();yaw=angle;pitch=tilt;time+=dt*1000;const f=Number(held.has('forward'))-Number(held.has('back')),r=Number(held.has('right'))-Number(held.has('left'));const distance=move(movementDelta(f,r,yaw,Math.min(dt,.05)*1.8));if(actor===guest)actor.update(time,paused());actor.walk(time,!paused()&&distance>.0001);nearest=nearestInteraction(actor.group.position,candidates());talk.disabled=!nearest;talk.textContent=nearest?'['+key().toUpperCase()+'] '+nearest.title:'Approach someone to talk';hint.textContent=actor===guest?'Visitor · arrows / WASD · combine directions to walk diagonally':'Your character · arrows / WASD · hold two directions for diagonals';follow(false,dt);}
 const walletChanged=()=>{if(active){actor=null;adopt();held.clear();dialog.close();wake();}};addEventListener('accord-wallet',walletChanged);
 return {start,stop,step,interact,update,look(a,p){yaw=a;pitch=p;if(active)follow(true);},position:()=>actor?.group.position.clone()||new THREE.Vector3(),dispose(){stop();removeEventListener('accord-wallet',walletChanged);hud.remove();dialog.remove();scene.remove(guest.group);guest.dispose();}};
}

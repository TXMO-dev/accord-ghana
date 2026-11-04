import * as THREE from 'three';
import {createAvatar} from './avatar-character.js';
import {cleanAvatar} from './avatar-model.js';
export function createLoungeSocialAvatars({group,register,open,wake}){
 // Fixed social spots represent recent participation, not tracked player positions.
 let rows=[],time=0;
 const slots=Array.from({length:6},(_,i)=>{const slot=new THREE.Group();slot.position.set(-1.4+(i%3)*1.4,0,5.5+Math.floor(i/3)*1.4);slot.visible=false;group.add(slot);register(slot,'Lounge participant - view public profile',()=>open({wallet:rows[i]?.wallet,people:true}));return slot;});
 const looks=Array(6).fill('');
 const models=slots.map(slot=>{const model=createAvatar(cleanAvatar());slot.add(model.group);return model;});
 const bubbles=models.map((model,i)=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=180;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,depthWrite:false});
  const sprite=new THREE.Sprite(material);sprite.scale.set(2.2,.62,1);sprite.position.y=2.15;sprite.visible=false;slots[i].add(sprite);
  register(sprite,'Read this participant’s public update',()=>open({conversation:true}));
  return {canvas,texture,material,sprite,until:0};
 });
 const changed=e=>{const next=(e.detail||[]).slice(0,6);slots.forEach((slot,i)=>{const p=next[i];slot.visible=!!p;if(p){const appearance=cleanAvatar(p.avatar),key=JSON.stringify(appearance);if(looks[i]!==key){slot.remove(models[i].group);models[i].dispose();models[i]=createAvatar(appearance);slot.add(models[i].group);looks[i]=key;}}if(rows[i]?.wallet!==p?.wallet){bubbles[i].sprite.visible=false;bubbles[i].until=0;if(p){models[i].update(time);models[i].react('wave');}}});rows=next;wake();};
 const posted=e=>{
  for(const post of e.detail||[]){const i=rows.findIndex(p=>p.wallet===post.wallet);if(i<0)continue;
   const b=bubbles[i],ctx=b.canvas.getContext('2d');ctx.clearRect(0,0,640,180);ctx.fillStyle='#fff8e6';ctx.beginPath();ctx.roundRect(4,4,632,158,24);ctx.fill();ctx.beginPath();ctx.moveTo(300,160);ctx.lineTo(320,180);ctx.lineTo(340,160);ctx.fill();
   ctx.fillStyle='#163d31';ctx.textAlign='center';ctx.font='bold 30px Arial';ctx.fillText(String(post.display_name).slice(0,25),320,57,590);ctx.font='26px Arial';ctx.fillText(post.voice_seconds?'Shared a voice note':'Posted a public message',320,104);ctx.font='20px Arial';ctx.fillText('Tap to read in the Lounge',320,139);
   b.texture.needsUpdate=true;b.sprite.visible=true;b.until=performance.now()+6500;models[i].react(post.voice_seconds?'review':'wave');
  }wake();
 };
 addEventListener('accord-lounge-people',changed);addEventListener('accord-lounge-posts',posted);
 return {update(t,paused){time=t;models.forEach((m,i)=>{if(slots[i].visible)m.update(t,paused);if(performance.now()>bubbles[i].until)bubbles[i].sprite.visible=false;});},dispose(){removeEventListener('accord-lounge-people',changed);removeEventListener('accord-lounge-posts',posted);bubbles.forEach(b=>{b.sprite.removeFromParent();b.texture.dispose();b.material.dispose();});models.forEach(m=>{m.dispose();});slots.forEach(s=>group.remove(s));}};
}

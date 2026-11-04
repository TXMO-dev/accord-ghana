import {createAvatar} from './avatar-character.js';
import {cleanAvatar} from './avatar-model.js';
export function createLoungeSocialAvatars({group,register,open,wake}){
 // Fixed social spots: these represent recent participation, not tracked player positions.
 const models=Array.from({length:6},(_,i)=>{const model=createAvatar(cleanAvatar({shirt:['#174b3d','#367c91','#c59747'][i%3]}));model.group.position.set(-1.4+(i%3)*1.4,0,5.5+Math.floor(i/3)*1.4);model.group.visible=false;group.add(model.group);register(model.group,'Lounge participant — open public conversation',()=>open());return model;});
 let rows=[],time=0;const changed=e=>{const next=e.detail||[];models.forEach((model,i)=>{const p=next[i];model.group.visible=!!p;if(p&&rows[i]?.wallet!==p.wallet){model.update(time);model.react('wave');}});rows=next;wake();};addEventListener('accord-lounge-people',changed);
 return {update(t,paused){time=t;models.forEach(m=>{if(m.group.visible)m.update(t,paused);});},dispose(){removeEventListener('accord-lounge-people',changed);models.forEach(m=>{group.remove(m.group);m.dispose();});}};
}

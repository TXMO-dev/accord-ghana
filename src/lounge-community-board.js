import * as THREE from 'three';

// Public directory cards are not live presence or endorsements.
export function createCommunityBoard({group,box,register,open,wake}){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;
 const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:texture});
 const geometry=new THREE.PlaneGeometry(3.6,2.7),board=new THREE.Mesh(geometry,material);
 board.position.set(-3.5,2,-4.55);group.add(board);
 box(3.8,2.9,.1,-3.5,2,-4.64,'wood',group);
 let rows=[],closed=false,loading=false;
 function draw(note='Published profiles · not online presence'){
  ctx.fillStyle='#123d30';ctx.fillRect(0,0,1024,768);ctx.fillStyle='#e1ecad';ctx.font='bold 48px Arial';ctx.fillText('MEET THE COMMUNITY',48,74);
  ctx.font='26px Arial';ctx.fillStyle='#fff8e6';ctx.fillText(note,48,122);
  for(let i=0;i<3;i++){
   const y=160+i*174,p=rows[i];ctx.fillStyle='#244e40';ctx.fillRect(36,y,952,154);
   ctx.fillStyle='#e1ecad';ctx.font='bold 34px Arial';ctx.fillText(p?p.display_name.slice(0,38):i===0?'Your next collaborator could be here':'Introduce yourself in the Lounge',60,y+48);
   ctx.fillStyle='#fff8e6';ctx.font='27px Arial';ctx.fillText(p?p.skills.slice(0,55):'Tap to browse or publish a profile',60,y+92);
   if(p){ctx.font='24px Arial';ctx.fillText(p.availability+' · '+p.wallet.slice(0,6)+'…'+p.wallet.slice(-4),60,y+130);}
  }
  ctx.font='25px Arial';ctx.fillStyle='#e1ecad';ctx.fillText('Tap a card · Browse all people in the Lounge',48,734);texture.needsUpdate=true;wake();
 }
 // Individual hit planes keep each card selectable by mouse or touch.
 const hitGeometry=new THREE.PlaneGeometry(3.35,.55),hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
 for(let i=0;i<3;i++){
  const hit=new THREE.Mesh(hitGeometry,hitMaterial);hit.position.set(-3.5,2+1.35-((160+i*174+77)/768)*2.7,-4.53);group.add(hit);
  register(hit,'Community profile '+(i+1)+' — browse people',()=>open({wallet:rows[i]?.wallet,people:true}));
 }
 async function read(){if(closed||loading||document.hidden)return;loading=true;try{const r=await fetch('/api/lounge-profiles',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const data=await r.json();if(closed)return;rows=data.profiles.slice(0,3);draw();}catch{if(!closed){rows=[];draw('Directory unavailable · tap to try in the Lounge');}}finally{loading=false;}}
 const changed=()=>read();addEventListener('accord-profiles-updated',changed);const timer=setInterval(read,60000);draw('Loading community profiles…');read();
 return {dispose(){closed=true;clearInterval(timer);removeEventListener('accord-profiles-updated',changed);texture.dispose();material.dispose();geometry.dispose();hitGeometry.dispose();hitMaterial.dispose();}};
}

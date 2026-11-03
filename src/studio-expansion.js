import * as THREE from 'three';
// Physical controls mirror verified state; they never authorize transactions.
export function expandStudio({scene,box,register,openRoom,openArchive,useStation,speak,wake,paused}){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const frame=box(3.6,1.8,.12,-3.6,2.8,-4.5,'gold');
 const board=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.6),new THREE.MeshBasicMaterial({map:texture}));board.position.set(-3.6,2.8,-4.42);scene.add(board);
 let state={},lastId='',lastState='',unread=0,reliefUntil=0;
 const beaconMaterial=new THREE.MeshStandardMaterial({color:'#badd80',emissive:'#badd80',emissiveIntensity:.2});
 const beacon=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),beaconMaterial);beacon.position.set(-4.4,1.22,3.7);scene.add(beacon);
 function draw(){ctx.fillStyle='#102e25';ctx.fillRect(0,0,768,384);ctx.fillStyle='#d5e8a4';ctx.font='24px Arial';ctx.fillText('YOUR LIVE PROJECT BOARD',36,52);ctx.fillStyle='#fff8e6';ctx.font='38px Arial';ctx.fillText((state.title||'Welcome to your studio').slice(0,31),36,120);ctx.font='28px Arial';ctx.fillStyle=state.state==='Disputed'?'#f0bd74':'#d5e8a4';ctx.fillText(state.pending?'Awaiting confirmation':state.verified?state.state:'Choose and verify an agreement',36,182);ctx.font='23px Arial';ctx.fillStyle='#fff8e6';ctx.fillText(state.state==='Disputed'?'Funds frozen · both parties must agree':'Tap this board to visit the next step',36,252);ctx.fillText(unread?`${unread} new project update${unread===1?'':'s'} · visit the table`:'Project table · messages and settlement',36,324);texture.needsUpdate=true;wake();}
 function visit(){if(state.state==='Disputed'){openRoom();return;}useStation(({Draft:1,Funded:2,Submitted:3,Released:3,Settled:3}[state.state])??0);}
 register(frame,'Live project board — next step',visit);register(board,'Live project board — next step',visit);
 const mail=box(.35,.18,.26,-4.8,1,3.7,'gold');
 function readUpdates(){unread=0;draw();dispatchEvent(new Event('accord-open-inbox'));}
 register(mail,'Project inbox — read updates',readUpdates);register(beacon,'Project alert — open shared room',readUpdates);
 const archive=new THREE.Group();archive.position.set(4,0,2.4);scene.add(archive);for(let i=0;i<4;i++)box(.28,.34,.3,0,.65+i*.055,0,i%2?'paper':'green',archive);
 register(archive,'Receipt archive — review confirmed history',openArchive);
 const shortcuts=document.createElement('div');shortcuts.className='room-world-shortcuts';
 for(const [label,action] of [['Project board',visit],['Project inbox',readUpdates],['Receipt archive',openArchive]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;shortcuts.append(b);}document.querySelector('.room-panel').append(shortcuts);
 function changed(e){state=e.detail;const same=lastId===state.id;if(!same)unread=0;if(state.verified&&!state.pending){if(state.state==='Disputed'&&(!same||lastState!=='Disputed'))speak('The milestone is disputed. Funds are frozen, not lost. Agree on a split in your project room. The freelancer authorizes first; the client reviews and signs.');if(same&&lastState==='Disputed'&&['Settled','Cancelled'].includes(state.state)){reliefUntil=performance.now()+4500;speak('Whew — both parties agreed. Stellar confirmed the settlement and this agreement is now closed. Keep your receipt.');}lastId=state.id;lastState=state.state;}draw();}
 function comment(){unread++;draw();}
 function read(){unread=0;draw();}
 addEventListener('accord-inbox-read',read);
 addEventListener('accord-agreement-state',changed);addEventListener('accord-room-new-comment',comment);addEventListener('accord-participant-notice',comment);draw();
 return {update(t){const disputed=state.verified&&state.state==='Disputed',relief=t<reliefUntil;const color=disputed?'#e7a34a':relief?'#badd80':unread?'#93d9e0':'#52685b';beaconMaterial.color.set(color);beaconMaterial.emissive.set(color);beaconMaterial.emissiveIntensity=paused()?.25:(disputed||unread||relief)?.45+Math.sin(t*.002)*.2:.15;beacon.position.y=1.22+(!paused()&&relief?Math.abs(Math.sin(t*.004))*.16:0);},dispose(){removeEventListener('accord-agreement-state',changed);removeEventListener('accord-room-new-comment',comment);removeEventListener('accord-participant-notice',comment);removeEventListener('accord-inbox-read',read);texture.dispose();shortcuts.remove();}};
}

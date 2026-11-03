import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// The room navigates the workspace; transaction authorization stays in the wallet.
export function mountStudioRoom(){
 const host=document.getElementById('room-view'),root=document.getElementById('studio-room');
 const stations=[
  {title:'The agreement desk',copy:'Agree on what done means. The client creates a milestone with a freelancer, clear delivery conditions and an amount.',action:'Create an agreement',target:'studio-new',pos:[-3,0,1]},
  {title:'The milestone vault',copy:'The client funds the selected agreement before work starts. Funding is confirmed in your agreement record, never by this illustration.',action:'View funding & agreements',target:'studio-detail',pos:[-3,0,-2.5]},
  {title:'The delivery studio',copy:'The freelancer shares a delivery reference. Switch to the freelancer’s wallet to submit work on their agreement.',action:'Open your agreements',target:'studio-detail',pos:[2.5,0,-2.4]},
  {title:'The review gallery',copy:'The client reviews the delivered work and approves release. If there is a dispute, both parties must agree on a settlement.',action:'Review your agreements',target:'studio-detail',pos:[3,0,1.6]}
 ];
 let selected=0,sound=false,audio,renderer,frame=0,visible=true,dead=false,rendering=false,sceneFocus=null;
 function select(i){say(i);chime();sceneFocus?.(i);}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),paused=()=>reduced.matches||document.documentElement.classList.contains('still');
 const say=(i)=>{selected=i;const s=stations[i];document.getElementById('room-title').textContent=s.title;document.getElementById('room-copy').textContent=s.copy;document.getElementById('room-action').textContent=s.action+' ↗';root.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.room===i)));};
 function chime(){if(!sound)return;try{audio??=new AudioContext();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(440+selected*110,audio.currentTime);gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.025,audio.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.23);}catch{}}
 document.getElementById('room-sound').onclick=e=>{sound=!sound;e.currentTarget.textContent=sound?'Sound on':'Sound off';e.currentTarget.setAttribute('aria-pressed',String(sound));if(sound)chime();};
 document.getElementById('room-action').onclick=async e=>{e.preventDefault();window.dispatchEvent(new Event('accord-open-workspace'));const s=stations[selected];if(s.target==='studio-new'){try{await import('./workspace.js');const b=document.getElementById('studio-new');if(b.disabled){document.getElementById('studio-connect').scrollIntoView({block:'center',behavior:paused()?'instant':'smooth'});document.getElementById('studio-status').textContent='Connect your Testnet wallet, then choose Create an agreement.';document.getElementById('studio-connect').focus({preventScroll:true});}else b.click();}catch{document.getElementById('room-copy').textContent='The workspace could not load. Reload the page to try again.';}}else{const target=document.getElementById(s.target);target.scrollIntoView({block:'start',behavior:paused()?'instant':'smooth'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}};
 root.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>select(+b.dataset.room));
 say(0);
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});}catch{document.getElementById('room-loading').textContent='Your studio is ready in the four labelled workstations. 3D is unavailable on this device.';return;}
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Accord studio. Drag to look around, scroll to zoom. Use the workstation buttons for accessible navigation. Arrow keys move the view when focused; Home resets it.');host.append(canvas);document.getElementById('room-loading').remove();
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#dcd5c2');scene.fog=new THREE.Fog('#dcd5c2',25,48);
 const camera=new THREE.PerspectiveCamera(43,1,.1,80);camera.position.set(10,10,14);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,.7,0);controls.enableDamping=!paused();controls.dampingFactor=.08;controls.minDistance=4;controls.maxDistance=22;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=true;controls.zoomToCursor=false;
 const materials={plaster:new THREE.MeshStandardMaterial({color:'#c6b69b',roughness:.95}),floor:new THREE.MeshStandardMaterial({color:'#b28c65',roughness:.8}),wood:new THREE.MeshStandardMaterial({color:'#653f26',roughness:.72}),green:new THREE.MeshStandardMaterial({color:'#163f32',roughness:.6}),gold:new THREE.MeshStandardMaterial({color:'#b89151',metalness:.65,roughness:.3}),paper:new THREE.MeshStandardMaterial({color:'#f3eedc',roughness:.85}),screen:new THREE.MeshStandardMaterial({color:'#102e2d',emissive:'#4ca487',emissiveIntensity:.35,roughness:.4}),leaf:new THREE.MeshStandardMaterial({color:'#315b35',roughness:.85}),skin:new THREE.MeshStandardMaterial({color:'#71452e',roughness:.9})};
 function box(w,h,d,x,y,z,mat,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[mat]||mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cylinder(r,h,x,y,z,mat,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),materials[mat]);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function sphere(r,x,y,z,mat,parent=scene){const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),materials[mat]);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 scene.add(new THREE.HemisphereLight('#fff3d6','#61745f',2));const sun=new THREE.DirectionalLight('#ffe0aa',3.2);sun.position.set(-7,13,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.bias=-.001;scene.add(sun);
 box(13,.25,10,0,-.15,0,'floor');box(13,3.8,.25,0,1.8,-5,'plaster');box(.25,3.8,10,-6.5,1.8,0,'plaster');
 // Courtyard slats and deep window reveals keep the studio open to daylight.
 for(let x=-5.5;x<6;x+=.55)box(.08,3.6,.14,x,1.8,-4.76,'wood');
 box(5,2,.18,2,2,-4.62,'green');
 for(let x=-.4;x<4.6;x+=.52)box(.025,2,.04,x,2,-4.5,'gold');
 for(let z=-4;z<5;z+=.7)box(.035,.012,9.5,0,.001,z,'wood').rotation.y=Math.PI/2;
 function plant(x,z){cylinder(.34,.6,x,.3,z,'plaster');for(let i=0;i<7;i++){const a=i*2.4,m=sphere(.32,x+Math.cos(a)*.25,1+Math.sin(i)*.2,z+Math.sin(a)*.25,'leaf');m.scale.set(.6,2,.65);m.rotation.z=Math.cos(a)*.6;}}
 plant(-5.6,-3.8);plant(5.4,-3.8);plant(5.3,3.7);
 // Each real workflow has a physical workstation.
 const groups=stations.map(s=>{const g=new THREE.Group();g.position.set(...s.pos);scene.add(g);return g;});
 const desk=groups[0];box(2.4,.14,1.2,0,1,0,'wood',desk);for(const x of [-1,1])for(const z of [-.45,.45])box(.09,1,.09,x,.5,z,'gold',desk);box(.8,.02,.55,-.35,1.09,.1,'paper',desk);box(.65,.45,.06,.5,1.32,-.3,'screen',desk);
 const vault=groups[1];box(1.5,1.65,1.2,0,.83,0,'green',vault);box(1.25,1.35,.08,0,.83,.65,'gold',vault);const dial=cylinder(.18,.07,0,.9,.73,'wood',vault);dial.rotation.x=Math.PI/2;for(let i=0;i<3;i++)box(.45,.04,.03,.23,.5+i*.15,.72,'green',vault);
 const delivery=groups[2];box(2.2,.13,1.1,0,1,0,'wood',delivery);for(const x of [-.9,.9])box(.13,1,.8,x,.5,0,'green',delivery);box(1.5,.9,.08,0,1.55,-.25,'screen',delivery);box(1.1,.025,.35,0,1.1,.3,'paper',delivery);
 const gallery=groups[3];for(let i=0;i<3;i++){box(.65,1,.1,(i-1)*.8,1.65,0,'gold',gallery);box(.54,.87,.03,(i-1)*.8,1.65,.07,i===1?'green':'paper',gallery);box(.06,1.5,.06,(i-1)*.8,.7,-.05,'wood',gallery);}box(2.7,.18,.65,0,.5,.8,'wood',gallery);
 function person(x,z,color){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const fabric=new THREE.MeshStandardMaterial({color,roughness:.9});box(.42,.65,.25,0,1.05,0,fabric,g);sphere(.19,0,1.58,0,'skin',g);for(const side of [-1,1]){box(.14,.68,.16,side*.12,.4,0,'green',g);box(.11,.6,.12,side*.29,1.03,0,'skin',g);}return g;}
 person(-4.2,1.8,'#c4974c');person(1,-2.1,'#597c72');
 // Kobi is a sculptural guide, not a transaction authority.
 const mascot=new THREE.Group();mascot.position.set(.1,0,2.9);scene.add(mascot);
 const body=sphere(.33,0,.8,0,'gold',mascot);body.scale.set(1,1.15,.85);
 const head=sphere(.29,0,1.27,0,'green',mascot);head.scale.set(1.15,.95,.9);
 sphere(.058,-.11,1.3,.25,'paper',mascot);sphere(.058,.11,1.3,.25,'paper',mascot);
 sphere(.025,-.1,1.3,.298,'green',mascot);sphere(.025,.12,1.3,.298,'green',mascot);
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.09,.012,8,24,Math.PI),materials.paper);smile.rotation.z=Math.PI;smile.position.set(0,1.23,.255);mascot.add(smile);
 cylinder(.022,.12,0,1.59,0,'gold',mascot);sphere(.055,0,1.67,0,'paper',mascot);
 const wave=new THREE.Group();wave.position.set(.3,1,0);mascot.add(wave);const arm=cylinder(.06,.32,.12,.06,0,'green',wave);arm.rotation.z=-.7;sphere(.085,.22,.19,0,'gold',wave);
 const leftArm=cylinder(.06,.33,-.36,.83,0,'green',mascot);leftArm.rotation.z=-.4;sphere(.075,-.42,.68,0,'gold',mascot);
 for(const x of [-.15,.15]){const foot=sphere(.13,x,.4,.05,'green',mascot);foot.scale.set(1,.6,1.4);}
 const badge=cylinder(.1,.025,0,.84,.29,'green',mascot);badge.rotation.x=Math.PI/2;
 let happyUntil=performance.now()+2200;

 const ringMat=new THREE.MeshBasicMaterial({color:'#c7e79b',transparent:true,opacity:.8,side:THREE.DoubleSide});const ring=new THREE.Mesh(new THREE.RingGeometry(1.1,1.16,64),ringMat);ring.rotation.x=-Math.PI/2;ring.position.set(-3,.02,1);scene.add(ring);
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
 const pick=e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(groups,true)[0];if(hit){let o=hit.object;while(o.parent&&!groups.includes(o))o=o.parent;const index=groups.indexOf(o);if(index>=0)select(index);}};
 canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',pick);
 let destination=null,walking=false;
 function overview(){walking=false;document.getElementById('room-walk').setAttribute('aria-pressed','false');controls.minDistance=4;controls.maxDistance=22;controls.maxPolarAngle=Math.PI*.47;camera.position.set(10,10,14);controls.target.set(0,.7,0);destination=null;wake();}
 document.getElementById('room-reset').onclick=overview;
 document.getElementById('room-walk').onclick=()=>{walking=true;document.getElementById('room-walk').setAttribute('aria-pressed','true');controls.minDistance=.6;controls.maxDistance=4;controls.maxPolarAngle=Math.PI*.65;camera.position.set(0,1.65,4.3);controls.target.set(0,1.4,1.5);destination=null;wake();};
 function move(direction){destination=null;const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));const delta=(direction==='left'||direction==='right'?right:forward).multiplyScalar(direction==='back'||direction==='left'?-.35:.35);const next=camera.position.clone().add(delta);if(walking&&(Math.abs(next.x)>5.8||Math.abs(next.z)>4.4))return;camera.position.add(delta);controls.target.add(delta);wake();}
 root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>move(b.dataset.move));
 sceneFocus=i=>{happyUntil=performance.now()+1600;if(walking)overview();const p=stations[i].pos;ring.position.set(p[0],.02,p[2]);destination={target:new THREE.Vector3(p[0],.8,p[2]),position:new THREE.Vector3(p[0]+5,5.5,p[2]+7)};if(paused()){camera.position.copy(destination.position);controls.target.copy(destination.target);destination=null;}wake();}
 controls.addEventListener('start',()=>destination=null);
 canvas.addEventListener('keydown',e=>{const moves={ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right'};if(e.key==='Home'){e.preventDefault();overview();}else if(moves[e.key]){e.preventDefault();move(moves[e.key]);}});
 function render(t){frame=0;if(dead||!visible||document.hidden||document.querySelector("dialog[open]"))return;rendering=true;if(destination){camera.position.lerp(destination.position,.07);controls.target.lerp(destination.target,.07);if(camera.position.distanceTo(destination.position)<.015)destination=null;}controls.enableDamping=!paused();controls.update();const happy=!paused()&&t<happyUntil;mascot.position.y=paused()?0:happy?Math.abs(Math.sin(t*.008))*.16:Math.sin(t*.0015)*.025;mascot.rotation.z=happy?Math.sin(t*.008)*.07:0;wave.rotation.z=paused()?0:happy?Math.sin(t*.012)*.35:.08*Math.sin(t*.002);head.rotation.z=paused()?0:Math.sin(t*.002)*.04;renderer.render(scene,camera);rendering=false;if(!paused()||destination)frame=requestAnimationFrame(render);}
 function wake(){if(!frame&&!dead&&!rendering)frame=requestAnimationFrame(render);}
 controls.addEventListener('change',wake);
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();wake();});resize.observe(host);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(frame);frame=0;}});observer.observe(host);
 const mutation=new MutationObserver(wake);mutation.observe(document.documentElement,{attributes:true,attributeFilter:['class']});reduced.addEventListener('change',wake);document.addEventListener('visibilitychange',wake);document.addEventListener('close',wake,true);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dead=true;cancelAnimationFrame(frame);canvas.hidden=true;const p=document.createElement('p');p.textContent='3D paused. All workstation controls remain available.';host.append(p);});
 addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();mutation.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();audio?.close();},{once:true});
 wake();
}

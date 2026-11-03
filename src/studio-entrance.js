import * as THREE from 'three';
// Reuse the actual studio characters; this preview never loads wallet code.
export function mountEntranceScene({mascot,desk}){
 const entrance=document.querySelector('.studio-entrance');if(!entrance)return;
 const launch=document.createElement('button');launch.type='button';launch.className='entrance-diorama';launch.setAttribute('aria-label','Enter Accord’s studio with Kobi');entrance.prepend(launch);
 let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{launch.remove();return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;launch.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,30);camera.position.set(5,4.2,6);camera.lookAt(0,.5,0);
 scene.add(new THREE.HemisphereLight('#fff4dc','#173f33',3));const sun=new THREE.DirectionalLight('#ffe2af',3);sun.position.set(3,5,2);scene.add(sun);
 const world=new THREE.Group();scene.add(world);const own=[];
 function part(geometry,color,x,y,z){const material=new THREE.MeshStandardMaterial({color,roughness:.65}),mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);world.add(mesh);own.push(mesh);return mesh;}
 part(new THREE.CylinderGeometry(2.15,2.25,.18,64),'#b9976e',0,-.14,0);
 const rim=part(new THREE.TorusGeometry(2.18,.025,8,80),'#d7ed9d',0,-.05,0);rim.rotation.x=Math.PI/2;
 for(let i=0;i<8;i++)part(new THREE.BoxGeometry(.055,.012,3),'#826947',-.95+i*.27,-.035,0);
 const guide=mascot.clone(true);guide.position.set(-.6,-.2,.65);world.add(guide);
 const table=desk.clone(true);table.position.set(.5,0,-.55);table.scale.setScalar(.7);world.add(table);
 part(new THREE.CylinderGeometry(.18,.25,.4,12),'#c7ab7c',-1.3,.15,-.7);
 for(let i=0;i<5;i++){const leaf=part(new THREE.SphereGeometry(.24,10,8),'#406a42',-1.3+Math.sin(i)*.16,.6+(i%2)*.2,-.7+Math.cos(i)*.14);leaf.scale.set(.65,1.7,.65);}
 const hint=document.createElement('span');hint.textContent='Meet Kobi · Enter the studio ↗';launch.append(hint);
 launch.onclick=()=>{const start=document.getElementById('enter-studio');if(start&&!start.disabled)start.click();};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,dead=false,pointer=0;
 launch.onpointermove=e=>{const r=launch.getBoundingClientRect();pointer=((e.clientX-r.left)/Math.max(1,r.width)-.5)*.2;};launch.onpointerleave=()=>pointer=0;
 function draw(t=0){frame=0;if(dead||document.hidden)return;world.rotation.y=reduced.matches?0:Math.sin(t*.0003)*.07+pointer;guide.rotation.z=reduced.matches?0:Math.sin(t*.0018)*.025;renderer.render(scene,camera);if(!reduced.matches)frame=requestAnimationFrame(draw);}
 const resize=new ResizeObserver(()=>{const r=launch.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(!frame)draw();});resize.observe(launch);
 const resume=()=>{cancelAnimationFrame(frame);frame=0;if(!dead)draw();};document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
 function dispose(){if(dead)return;dead=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',resume);reduced.removeEventListener('change',resume);for(const mesh of own){mesh.geometry.dispose();mesh.material.dispose();}renderer.dispose();launch.remove();}
 const observer=new MutationObserver(()=>{if(!entrance.isConnected||entrance.classList.contains('entrance-leaving'))dispose();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});addEventListener('pagehide',dispose,{once:true});draw();
}

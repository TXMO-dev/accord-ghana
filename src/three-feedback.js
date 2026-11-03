import * as THREE from 'three';
function sculpture(host,{visible,busy=()=>false,compact=false}){
 let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.tabIndex=-1;host.append(canvas);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,30);camera.position.z=compact?5:6;
 const group=new THREE.Group();scene.add(group);
 const gold=new THREE.MeshStandardMaterial({color:'#c9a370',metalness:.7,roughness:.28}),green=new THREE.MeshStandardMaterial({color:'#1d7258',metalness:.45,roughness:.32});
 const shape=new THREE.Mesh(new THREE.TorusKnotGeometry(compact?.65:1,.14,96,12,2,3),gold);group.add(shape);
 const orbit=new THREE.Mesh(new THREE.TorusGeometry(compact?1:1.6,.045,10,80),green);orbit.rotation.x=1.2;group.add(orbit);
 const particles=[];for(let i=0;i<8;i++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(.045),i%2?gold:green);group.add(p);particles.push(p);}
 scene.add(new THREE.HemisphereLight('#fff6dc','#173d30',3));const light=new THREE.DirectionalLight('#ffe4b3',5);light.position.set(3,4,5);scene.add(light);
 let frame=0,dead=false,angle=0,last=0,px=0,py=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),still=()=>reduced.matches||document.documentElement.classList.contains('still');
 function draw(time){frame=0;if(dead||document.hidden||!visible()||!host.clientWidth||!host.clientHeight){last=0;return;}const dt=last?Math.min((time-last)/1000,.05):0;last=time;if(!still())angle+=dt*(busy()?1.2:.16);
 group.rotation.set(still()?.2:py*.2+.2,angle+px*.3,.2);orbit.rotation.y=-angle*.5;
 particles.forEach((p,i)=>{const a=i*Math.PI/4+angle;p.position.set(Math.cos(a)*1.8,Math.sin(a)*1.8,Math.sin(a*2)*.3);});
 renderer.render(scene,camera);if(!still())frame=requestAnimationFrame(draw);}
 function wake(){if(!frame&&!dead)frame=requestAnimationFrame(draw);}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();wake();}
 const ro=new ResizeObserver(resize);ro.observe(host);const mo=new MutationObserver(wake);mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 const onMove=e=>{const r=host.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;wake();};host.addEventListener('pointermove',onMove,{passive:true});
 document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dead=true;cancelAnimationFrame(frame);canvas.remove();});
 addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(frame);ro.disconnect();mo.disconnect();document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);scene.traverse(o=>o.geometry?.dispose());gold.dispose();green.dispose();renderer.dispose();},{once:true});resize();return {wake,resize};
}
export function mountAccountVisuals(){
 const dialog=document.getElementById('account-dialog');if(dialog.dataset.threeReady)return;dialog.dataset.threeReady='true';
 const art=dialog.querySelector('.account-art'),backdrop=document.createElement('div');backdrop.className='account-three-art';art.prepend(backdrop);
 const artScene=sculpture(backdrop,{visible:()=>dialog.open,busy:()=>dialog.getAttribute('aria-busy')==='true'});
 if(artScene)art.classList.add('has-three-art');
 const loader=document.createElement('div');loader.className='three-loading';loader.hidden=true;document.getElementById('account-status').before(loader);
 const loadingScene=sculpture(loader,{compact:true,visible:()=>dialog.open&&!loader.hidden,busy:()=>true});
 const update=()=>{loader.hidden=dialog.getAttribute('aria-busy')!=='true';artScene?.resize();loadingScene?.resize();};
 const observer=new MutationObserver(update);observer.observe(dialog,{attributes:true,attributeFilter:['open','aria-busy']});update();addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
export function mountWorkspaceLoader(){
 const status=document.getElementById('studio-status'),detail=document.getElementById('studio-detail');
 if(!status||!detail)return;const host=document.createElement('div');host.className='three-loading';host.hidden=true;(document.querySelector('.workspace-panel-bar')||status.parentElement).prepend(host);
 const visual=sculpture(host,{compact:true,visible:()=>!host.hidden,busy:()=>true});
 const update=()=>{host.hidden=detail.getAttribute('aria-busy')!=='true';visual?.resize();};
 const observer=new MutationObserver(update);observer.observe(detail,{attributes:true,attributeFilter:['aria-busy']});update();addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}

import {explorerNextStep} from './explorer-next-step.js';
import {mountMapCompass} from './map-compass.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {courtyardPlaces} from './courtyard-layout.js';

// Reuse the world and renderer. Exploration never opens or signs a transaction.
export function createExplorerMap({host,root,scene,camera,controls,wake,paused,focus,position,guide,nextStation}){
 const places=[{id:'studio',title:'THE STUDIO',caption:'Agree, fund, deliver and release',x:0,z:0},...courtyardPlaces];
 const view=camera.clone(),target=new THREE.Vector3(0,0,6),end=new THREE.Vector3(0,32,30);
 const overlay=document.createElement('section');overlay.className='explorer-map';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Explore Accord');
 overlay.innerHTML='<header><div><small>ACCORD / EXPLORER</small><h2>Your neighbourhood</h2></div><button type="button" data-close>Close map ×</button></header><div class="explorer-pins"></div><span class="explorer-location">Your viewpoint</span><footer><p>Drag to explore · pinch or scroll to zoom. Select a landmark to travel.</p><div class="explorer-next"><button type="button" data-next></button><span></span></div><nav aria-label="Map destinations"></nav><div class="explorer-selection" aria-live="polite"></div><div class="explorer-actions"><button type="button" data-go>Go here</button><button type="button" data-guide>Let Kobi guide me</button></div></footer>';
 host.append(overlay);
 const mapControls=new OrbitControls(view,overlay);mapControls.enabled=false;mapControls.enableDamping=false;mapControls.minDistance=20;mapControls.maxDistance=90;mapControls.minPolarAngle=.15;mapControls.maxPolarAngle=.85;mapControls.target.copy(target);mapControls.addEventListener('change',wake);
 overlay.addEventListener('pointerdown',e=>{if(e.target.closest('button,footer,header'))e.stopImmediatePropagation();},true);
 const fab=document.createElement('button');fab.type='button';fab.className='explorer-map-fab';fab.setAttribute('aria-haspopup','dialog');fab.setAttribute('aria-expanded','false');fab.setAttribute('aria-label','Open world map');fab.title='Open world map';fab.innerHTML='<span class="map-icon-slot" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z M9 3v16 M15 5v16"/></svg></span><span class="map-button-label">Map</span>';host.append(fab);const disposeCompass=mountMapCompass(fab,paused);
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const lineMaterial=new THREE.LineBasicMaterial({color:0xc6df8d,depthTest:false,transparent:true,opacity:.8});
 const route=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9,.05,8),new THREE.Vector3(0,.05,8),new THREE.Vector3(9,.05,8),new THREE.Vector3(0,.05,8),new THREE.Vector3(0,.05,14),new THREE.Vector3(0,.05,0)]);
 const lines=new THREE.Line(route,lineMaterial);lines.renderOrder=100;group.add(lines);
 const ringGeometry=new THREE.RingGeometry(.55,.72,32),ringMaterial=new THREE.MeshBasicMaterial({color:0xe8c581,side:THREE.DoubleSide,depthTest:false});
 for(const p of places){const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.08,p.z);ring.renderOrder=101;group.add(ring);}
 let active=false,selected=places[0],progress=0,returnFocus=null,oldEnabled=true,inertNodes=[],location=new THREE.Vector3();
 const pins=[],links=[];
 function select(p){selected=p;overlay.querySelector('.explorer-selection').textContent=p.title+' — '+p.caption;[...pins,...links].forEach(({button,place})=>button.setAttribute('aria-pressed',String(place===p)));}
 for(const place of places){for(const [container,collection] of [[overlay.querySelector('.explorer-pins'),pins],[overlay.querySelector('nav'),links]]){const button=document.createElement('button');button.type='button';button.textContent=place.title;button.onclick=()=>select(place);container.append(button);collection.push({button,place});}}
 let next=explorerNextStep();
 const nextButton=overlay.querySelector('[data-next]'),nextDetail=overlay.querySelector('.explorer-next span');
 function updateNext(event){next=explorerNextStep(event?.detail);nextButton.textContent='Next step · '+next.label;nextDetail.textContent=next.detail;wake();}
 updateNext();addEventListener('accord-agreement-state',updateNext);
 nextButton.onclick=()=>{close();if(next.workspace)dispatchEvent(new Event('accord-open-workspace'));else if(next.place)focus(places.find(p=>p.id===next.place));else nextStation(next.station);};
 const closeButton=overlay.querySelector('[data-close]');
 function close(){if(!active)return;active=false;mapControls.enabled=false;overlay.hidden=true;group.visible=false;root.classList.remove('explorer-open');controls.enabled=oldEnabled;inertNodes.forEach(([node,value])=>node.inert=value);inertNodes=[];fab.setAttribute('aria-expanded','false');(returnFocus?.isConnected?returnFocus:fab).focus({preventScroll:true});wake();}
 function open(){if(active)return;active=true;mapControls.enabled=false;mapControls.target.copy(target);progress=0;returnFocus=document.activeElement;oldEnabled=controls.enabled;controls.enabled=false;view.copy(camera);view.clearViewOffset();location.copy(position());group.visible=true;overlay.hidden=false;root.classList.add('explorer-open');fab.setAttribute('aria-expanded','true');
 // Disable background controls without hiding the existing canvas.
 for(const node of [...host.children,...root.querySelectorAll('.room-heading,header,#studio-workspace-panel,.room-panel')]){if(node===overlay||node.contains(overlay)||overlay.contains(node))continue;inertNodes.push([node,node.inert]);node.inert=true;}
 select(places[0]);closeButton.focus({preventScroll:true});wake();}
 fab.onclick=open;closeButton.onclick=close;
 overlay.querySelector('[data-go]').onclick=()=>{const p=selected;close();focus(p);};
 overlay.querySelector('[data-guide]').onclick=()=>{const p=selected;close();guide(p);};
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')].filter(b=>b.offsetParent!==null);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 addEventListener('accord-open-world-map',open);
 function project(point,element){const p=point.clone().project(view);const y=(-p.y*.5+.5)*host.clientHeight;const top=overlay.querySelector('header').getBoundingClientRect().bottom-host.getBoundingClientRect().top;const bottom=overlay.querySelector('footer').offsetTop;element.hidden=p.z<-1||p.z>1||Math.abs(p.x)>1||y<top+36||y>bottom-14;element.style.left=((p.x*.5+.5)*host.clientWidth)+'px';element.style.top=((-p.y*.5+.5)*host.clientHeight)+'px';}
 return {get active(){return active;},render(renderer,dt){const transitioning=progress<1;progress=paused()?1:Math.min(1,progress+dt*1.5);const eased=1-Math.pow(1-progress,3);view.aspect=host.clientWidth/host.clientHeight;view.fov=43;view.far=120;view.setViewOffset(host.clientWidth,host.clientHeight,0,Math.min(overlay.querySelector('footer').offsetHeight*.4,host.clientHeight*.18),host.clientWidth,host.clientHeight);view.updateProjectionMatrix();const distance=host.clientWidth<650?1.65:1;if(transitioning){view.position.lerpVectors(camera.position,end.clone().multiplyScalar(distance),eased);const orientation=new THREE.Quaternion();const helper=new THREE.PerspectiveCamera();helper.position.copy(view.position);helper.lookAt(target);orientation.copy(helper.quaternion);view.quaternion.slerpQuaternions(camera.quaternion,orientation,eased);if(progress===1)mapControls.enabled=true;}view.updateMatrixWorld();for(const {button,place} of pins)project(new THREE.Vector3(place.x,1,place.z),button);project(location,overlay.querySelector('.explorer-location'));renderer.render(scene,view);return progress<1;},dispose(){close();removeEventListener('accord-agreement-state',updateNext);removeEventListener('accord-open-world-map',open);disposeCompass();mapControls.dispose();overlay.remove();fab.remove();scene.remove(group);route.dispose();lineMaterial.dispose();ringGeometry.dispose();ringMaterial.dispose();}};
}


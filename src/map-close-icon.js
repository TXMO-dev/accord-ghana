import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Render the icon once with Three.js; reuse a bitmap to avoid another active mobile WebGL context.
export function decorateMapClose(button){
 button.innerHTML='<span>Close map</span><span class="map-close-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></span>';
 button.setAttribute('aria-label','Close world map');
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(64,64);renderer.setPixelRatio(1);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,10);camera.position.set(0,0,3.5);scene.add(new THREE.HemisphereLight('#fff8d8','#355f4a',3));const light=new THREE.DirectionalLight('#ffffff',4);light.position.set(-2,3,4);scene.add(light);
  const group=new THREE.Group();group.rotation.y=-.3;group.rotation.x=.15;scene.add(group);
  const geometry=new RoundedBoxGeometry(1.35,.22,.25,2,.07),material=new THREE.MeshStandardMaterial({color:'#d8e99b',metalness:.45,roughness:.3});
  for(const angle of [-Math.PI/4,Math.PI/4]){const bar=new THREE.Mesh(geometry,material);bar.rotation.z=angle;group.add(bar);}
  renderer.render(scene,camera);const image=document.createElement('img');image.alt='';image.width=image.height=32;image.src=renderer.domElement.toDataURL('image/png');button.querySelector('.map-close-icon').replaceChildren(image);geometry.dispose();material.dispose();
 }catch{/* The inline SVG remains a readable fallback. */}finally{renderer?.dispose();renderer?.forceContextLoss();}
}

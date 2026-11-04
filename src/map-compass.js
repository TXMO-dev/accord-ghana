import * as THREE from 'three';

// Tiny decorative compass; the enclosing HTML button owns focus and activation.
export function mountMapCompass(button,paused){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return ()=>{};}
 const canvas=renderer.domElement;canvas.className='map-compass-canvas';canvas.setAttribute('aria-hidden','true');button.querySelector('.map-icon-slot').append(canvas);canvas.addEventListener('webglcontextlost',()=>{button.classList.remove('has-3d-compass');dead=true;cancelAnimationFrame(frame);});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(58,58,false);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,20);camera.position.set(0,2.8,4.5);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xfff7dc,0x174536,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,4,3);scene.add(light);
 const dial=new THREE.Group();scene.add(dial);
 const gold=new THREE.MeshStandardMaterial({color:0xd7b677,metalness:.65,roughness:.3}),green=new THREE.MeshStandardMaterial({color:0x153f31,metalness:.3,roughness:.5}),cream=new THREE.MeshStandardMaterial({color:0xe1efaa,metalness:.3,roughness:.35});
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.9,.82,.18,32),green);dial.add(base);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.86,.065,8,40),gold);rim.rotation.x=Math.PI/2;rim.position.y=.13;dial.add(rim);
 const needle=new THREE.Group();needle.position.y=.2;dial.add(needle);
 for(const [sign,material] of [[1,cream],[-1,gold]]){const tip=new THREE.Mesh(new THREE.ConeGeometry(.19,.65,3),material);tip.rotation.x=sign*Math.PI/2;tip.position.z=sign*.32;needle.add(tip);}
 let frame=0,visible=false,hover=false,dead=false;
 function render(t){frame=0;if(dead||!visible||document.hidden)return;needle.rotation.y=paused()?-.3:Math.sin(t*.0008)*.3+(hover?.5:0);dial.rotation.z=paused()?0:Math.sin(t*.001)*.035;renderer.render(scene,camera);button.classList.add('has-3d-compass');if(!paused())frame=requestAnimationFrame(render);}
 function wake(){if(!frame&&!dead)frame=requestAnimationFrame(render);}
 const enter=()=>{hover=true;wake();},leave=()=>{hover=false;wake();};button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);button.addEventListener('focus',enter);button.addEventListener('blur',leave);document.addEventListener('visibilitychange',wake);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();});observer.observe(button);
 return ()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',wake);button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);button.removeEventListener('focus',enter);button.removeEventListener('blur',leave);scene.traverse(o=>o.geometry?.dispose());gold.dispose();green.dispose();cream.dispose();renderer.dispose();canvas.remove();};
}

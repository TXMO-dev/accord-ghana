import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Decorative scene. No wallet dependencies; the image remains underneath until rendered.
export function mountMaterialScene(hero) {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches)return;
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
 const canvas=renderer.domElement;canvas.className='material-scene';canvas.setAttribute('aria-hidden','true');
 hero.prepend(canvas);
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1:1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=.9;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,50);
 camera.position.set(0,0,10);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xeaf0d9,0x082d20,1.2));
 const warm=new THREE.DirectionalLight(0xffdfae,3);warm.position.set(-3,4,5);scene.add(warm);
 const edge=new THREE.DirectionalLight(0xa1e6bb,1.5);edge.position.set(4,-2,2);scene.add(edge);
 const weave=document.createElement('canvas');weave.width=weave.height=256;
 const c=weave.getContext('2d');c.fillStyle='#808080';c.fillRect(0,0,256,256);
 for(let y=0;y<256;y+=4)for(let x=0;x<256;x+=4){const warp=(Math.floor(x/16)+Math.floor(y/16))%2===0;const shade=130+((x*13+y*7)%51);c.fillStyle=`rgb(${shade},${shade},${shade})`;c.fillRect(x,y,warp?2:4,warp?4:2);}
 for(let i=0;i<256;i+=64){c.fillStyle='#565656';c.fillRect(0,i,256,2);c.fillStyle='#c5c5c5';c.fillRect(0,i+3,256,1);}
 const bump=new THREE.CanvasTexture(weave);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(10,2);bump.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const group=new THREE.Group();scene.add(group);
 const materials=[0xb88a53,0x075c35,0xc58b48].map(color=>new THREE.MeshPhysicalMaterial({color,metalness:.65,roughness:.43,clearcoat:.24,clearcoatRoughness:.38,side:THREE.DoubleSide,map:bump,bumpMap:bump,bumpScale:.12}));
 const geometries=[];
 function ribbon(radius,width,phase){
  const positions=[],uv=[],indices=[],segments=240,across=12;
  for(let i=0;i<=segments;i++)for(let j=0;j<=across;j++){
   const t=i/segments*Math.PI*2,v=j/across-.5,twist=Math.sin(t*2+phase)*.72;
   const r=radius+v*width*Math.cos(twist);
   positions.push(Math.cos(t)*r,Math.sin(t)*r,.46*Math.sin(t*2+phase)+v*width*Math.sin(twist));uv.push(i/segments,j/across);
   if(i<segments&&j<across){const a=i*(across+1)+j,b=a+across+1;indices.push(a,b,a+1,b,b+1,a+1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();geometries.push(g);return g;
 }
 const rotations=[[.72,.35,-.63],[-.72,.63,.3],[1.18,-.6,-.2]];
 materials.forEach((m,i)=>{const mesh=new THREE.Mesh(ribbon(2.5+i*.12,.85,i*1.9),m);mesh.rotation.set(...rotations[i]);group.add(mesh);});
 let frame=0,last=0,elapsed=0,visible=true,dead=false,px=0,py=0,rx=0,ry=0,scroll=0;
 const paused=()=>reduced.matches||document.documentElement.classList.contains('still');
 function size(){const w=hero.clientWidth,h=hero.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();group.position.x=w<700?1.5:camera.aspect*1.8;group.position.y=.1;}
 function render(){renderer.render(scene,camera);}
 function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
 function draw(t){
  frame=0;if(dead||paused()||!visible||document.hidden)return;
  if(!last||t-last>=33){elapsed+=last?Math.min((t-last)/1000,.08):0;last=t;rx+=(px-rx)*.055;ry+=(py-ry)*.055;
   group.rotation.set(ry*.15+Math.sin(elapsed*.12)*.045,rx*.22+scroll*.16,Math.sin(elapsed*.09)*.04+scroll*.08);render();}
  frame=requestAnimationFrame(draw);
 }
 function sync(){stop();canvas.hidden=reduced.matches;hero.classList.toggle('three-ready',!reduced.matches&&!dead);if(!dead&&!paused()&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
 const pointer=e=>{const r=hero.getBoundingClientRect();px=(e.clientX-r.left)/r.width*2-1;py=(e.clientY-r.top)/r.height*2-1;};
 const leave=()=>{px=py=0;};
 const onScroll=()=>{scroll=Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/hero.clientHeight));};
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(hero);
 const mutation=new MutationObserver(sync);mutation.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 const resize=new ResizeObserver(()=>{size();if(!dead)render();});resize.observe(hero);
 hero.addEventListener('pointermove',pointer,{passive:true});hero.addEventListener('pointerleave',leave);
 addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 function dispose(){if(dead)return;dead=true;stop();observer.disconnect();mutation.disconnect();resize.disconnect();hero.classList.remove('three-ready');canvas.remove();hero.removeEventListener('pointermove',pointer);hero.removeEventListener('pointerleave',leave);removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());bump.dispose();environment.dispose();renderer.dispose();}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();},{once:true});
 addEventListener('pagehide',dispose,{once:true});
 size();render();sync();
 return dispose;
}

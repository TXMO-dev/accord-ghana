import './world-form-scenes.css';
// One shared renderer decorates the active panel; controls remain semantic HTML.
const selector='dialog[open], #studio-workspace-panel:not([hidden])';
let renderer,scene,camera,group,active,frame=0,pending=false,failed=false,resize,last=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
async function attach(){
 pending=false;
 const panels=[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length);
 panels.forEach(el=>el.classList.add('world-form-panel'));
 const target=panels.filter(el=>el.matches('dialog')).at(-1)||panels[0];
 if(target===active)return;
 active=target;cancelAnimationFrame(frame);resize?.disconnect();
 if(!target){renderer?.domElement.remove();return;}
 // Existing account art and character previews already have their own 3D scenes.
 renderer?.domElement.remove();
 if(target.matches('#account-dialog,.avatar-editor'))return;
 let host=target.querySelector(':scope > .world-form-scene, :scope > .review-art > .world-form-scene');
 if(!host){host=document.createElement('div');host.className='world-form-scene';host.setAttribute('aria-hidden','true');(target.querySelector(':scope > .review-art')||target).prepend(host);}
 if(failed)return;
 try{
  if(!renderer){
   const T=await import('three');
   if(renderer){active=null;return schedule();}
   renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
   scene=new T.Scene();camera=new T.PerspectiveCamera(32,1,.1,30);camera.position.set(0,2.4,6);camera.lookAt(0,0,0);
   scene.add(new T.HemisphereLight(0xffffff,0x174c3b,2.5));const light=new T.DirectionalLight(0xffdf9a,4);light.position.set(3,5,4);scene.add(light);
   group=new T.Group();scene.add(group);
   const gold=new T.MeshStandardMaterial({color:0xc7a060,metalness:.7,roughness:.28}),green=new T.MeshStandardMaterial({color:0x21624b,metalness:.25,roughness:.4}),cream=new T.MeshStandardMaterial({color:0xf3efdb,roughness:.65});
   const base=new T.Mesh(new T.CylinderGeometry(1.7,1.8,.12,48),green);base.position.y=-.55;group.add(base);
   const sheet=new T.Mesh(new T.BoxGeometry(1.1,.08,1.45),cream);sheet.rotation.y=-.25;group.add(sheet);
   for(let i=0;i<3;i++){const line=new T.Mesh(new T.BoxGeometry(.65,.025,.035),green);line.position.set(0,.06,-.35+i*.25);line.rotation.y=-.25;group.add(line);}
   const ring=new T.Mesh(new T.TorusGeometry(.55,.065,12,48),gold);ring.position.set(.9,.35,.15);ring.rotation.y=.4;group.add(ring);
   const orb=new T.Mesh(new T.IcosahedronGeometry(.17,1),gold);orb.position.set(-1,.35,.2);group.add(orb);
  }
  if(active!==target)return schedule();
  host.append(renderer.domElement);
  const draw=()=>{const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  resize=new ResizeObserver(draw);resize.observe(host);draw();
  function tick(t){if(active!==target||!host.isConnected)return;if(!document.hidden&&t-last>40){group.rotation.y=reduced.matches?0:Math.sin(t*.00035)*.12;renderer.render(scene,camera);last=t;}if(!reduced.matches)frame=requestAnimationFrame(tick);}
  frame=requestAnimationFrame(tick);
 }catch{failed=true;host.remove();}
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(attach);}
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});
reduced.addEventListener('change',()=>{active=null;schedule();});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);resize?.disconnect();renderer?.dispose();});
schedule();


import './world-form-scenes.css';
// A single renderer follows the active panel. Inputs and signatures remain native controls.
const selector='dialog[open], #studio-workspace-panel:not([hidden])';
let renderer,scene,camera,models,active,frame=0,pending=false,loading,last=0,clock=0,resize,failed=false,epoch=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const presentations={agreement:['The agreement desk','Define the work together.'],room:['Your shared workspace','A place for every step of the project.'],lounge:['Accord Lounge','Meet people. Share what you do.'],review:['Review your next step','Read the details before approving.'],moderator:['The moderator desk','Keep the conversation welcoming.']};
function kindFor(panel){return panel.matches('.accord-moderator')?'moderator':panel.matches('.accord-lounge')?'lounge':panel.matches('.accord-review')?'review':panel.id==='studio-workspace-panel'?'room':'agreement'}
function queue(){if(!pending){pending=true;requestAnimationFrame(attach)}}
function stop(){cancelAnimationFrame(frame);frame=0;last=0;resize?.disconnect()}
async function initialise(){
 const T=await import('three');
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.1,30);camera.position.set(0,3.2,6.4);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight(0xfff6dc,0x174c3b,2.7));const light=new T.DirectionalLight(0xffdc93,4);light.position.set(3,5,4);scene.add(light);
 const gold=new T.MeshStandardMaterial({color:0xc7a060,metalness:.7,roughness:.3}),green=new T.MeshStandardMaterial({color:0x21624b,metalness:.2,roughness:.5}),cream=new T.MeshStandardMaterial({color:0xf3efdb,roughness:.7}),wood=new T.MeshStandardMaterial({color:0x9a6039,roughness:.8});
 const box=(g,w,h,d,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m};
 function base(){const g=new T.Group();const platform=new T.Mesh(new T.CylinderGeometry(1.65,1.75,.12,48),green);platform.position.y=-.6;g.add(platform);scene.add(g);return g}
 function paper(g,x=0,z=0){box(g,.85,.05,1.1,x,.1,z,cream);for(let i=0;i<3;i++)box(g,.55,.012,.025,x,.135,z-.28+i*.15,green)}
 function chair(g,x,z){box(g,.43,.08,.4,x,-.24,z,wood);box(g,.43,.45,.07,x,0,z+.18,green);for(const dx of [-.16,.16])box(g,.055,.35,.055,x+dx,-.42,z,wood)}
 const agreement=base();box(agreement,2.1,.12,1.3,0,-.03,0,wood);for(const x of [-.85,.85])box(agreement,.08,.5,.08,x,-.32,0,wood);paper(agreement);chair(agreement,-1,.65);chair(agreement,1,.65);
 const room=base();for(const x of [-.7,.7]){box(room,.95,.1,.7,x,-.08,0,wood);box(room,.58,.4,.06,x,.23,-.22,cream);box(room,.46,.28,.02,x,.23,-.18,green);chair(room,x,.65)}const bridge=new T.Mesh(new T.TorusGeometry(.42,.045,10,48),gold);bridge.position.set(0,.8,0);room.add(bridge);
 const lounge=base();const table=new T.Mesh(new T.CylinderGeometry(.7,.7,.1,40),wood);lounge.add(table);box(lounge,.1,.55,.1,0,-.3,0,wood);for(const x of [-1,1])chair(lounge,x,.1);for(const x of [-.3,.3]){const cup=new T.Mesh(new T.CylinderGeometry(.12,.09,.2,20),cream);cup.position.set(x,.15,0);lounge.add(cup)}
 const leaf=new T.Mesh(new T.IcosahedronGeometry(.3,1),green);leaf.position.set(0,.5,-.9);lounge.add(leaf);box(lounge,.06,.6,.06,0,.05,-.9,wood);
 const review=base();paper(review);const seal=new T.Mesh(new T.TorusGeometry(.48,.075,12,60),gold);seal.position.set(.7,.5,.2);review.add(seal);
 const moderator=base();box(moderator,1.5,.1,.8,0,-.08,0,wood);const shield=new T.Mesh(new T.IcosahedronGeometry(.6,0),gold);shield.scale.set(1,1.2,.25);shield.position.y=.5;moderator.add(shield);
 models={agreement,room,lounge,review,moderator};
 renderer.domElement.setAttribute('aria-hidden','true');
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;stop();renderer.domElement.remove();active?.querySelector('.world-form-stage')?.setAttribute('hidden','')});
}
function mount(panel,kind){
 let host=panel.querySelector(':scope > .world-form-scene, :scope > .review-art > .world-form-scene');
 if(!host){host=document.createElement('section');host.className='world-form-scene';host.setAttribute('aria-label','Workspace illustration');
 const stage=document.createElement('div');stage.className='world-form-stage';stage.setAttribute('aria-hidden','true');
 const bar=document.createElement('div');bar.className='world-form-caption';const copy=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');copy.append(title,detail);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='world-form-collapse';toggle.textContent='Hide scene';toggle.setAttribute('aria-expanded','true');
 toggle.onclick=()=>{stage.hidden=!stage.hidden;toggle.textContent=stage.hidden?'Show scene':'Hide scene';toggle.setAttribute('aria-expanded',String(!stage.hidden));active=null;queue()};bar.append(copy,toggle);host.append(stage,bar);(panel.querySelector(':scope > .review-art')||panel).prepend(host);
 }
 const [title,detail]=presentations[kind];host.querySelector('strong').textContent=title;host.querySelector('.world-form-caption span').textContent=detail;return host;
}
async function attach(){
 pending=false;const panels=[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length);const target=panels.filter(el=>el.matches('dialog')).at(-1)||panels[0];
 if(target===active)return;active=target;const ticket=++epoch;stop();renderer?.domElement.remove();
 if(!target||target.matches('#account-dialog,.avatar-editor,#accord-atlas,.room-keyboard-help'))return;
 target.classList.add('world-form-panel');const kind=kindFor(target),host=mount(target,kind),stage=host.querySelector('.world-form-stage');
 if(stage.hidden||failed)return;
 try{loading??=initialise();await loading;if(active!==target||ticket!==epoch)return;
 stage.append(renderer.domElement);Object.entries(models).forEach(([key,g])=>{g.visible=key===kind});const group=models[kind];
 let px=0;host.onpointermove=e=>{if(e.pointerType!=='mouse')return;const r=host.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5};host.onpointerleave=()=>{px=0};
 const draw=()=>{const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(scene,camera)};
 resize=new ResizeObserver(draw);resize.observe(stage);draw();
 function tick(t){frame=0;if(active!==target||!stage.isConnected||stage.hidden||document.hidden)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;if(!reduced.matches)clock+=dt;group.rotation.y=reduced.matches?-.2:Math.sin(clock*.45)*.12+px*.3-.2;renderer.render(scene,camera);if(!reduced.matches)frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick);
 }catch{failed=true;stage.hidden=true;host.querySelector('button').hidden=true;}
}
new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});
reduced.addEventListener('change',()=>{active=null;queue()});document.addEventListener('visibilitychange',()=>{active=null;queue()});
addEventListener('pagehide',()=>{stop();renderer?.domElement.remove();scene?.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose()});renderer?.dispose();renderer=null;loading=null;active=null;});
addEventListener('pageshow',queue);queue();

// Image-sampled chapter fields, inspired by the portfolio's halftone morphing.
// Each scene occupies a dedicated art window: particles never cross text or controls.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const slots=[...document.querySelectorAll('[data-chapter-art]')];
const count=innerWidth<700?1800:3600;
const fields=[];
let frame=0,last=0,dead=false;
const stopped=()=>reduced.matches||document.documentElement.classList.contains('still');
function sample(image){
 const c=document.createElement('canvas');c.width=c.height=180;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,180,180);
 const pixels=ctx.getImageData(0,0,180,180).data,candidates=[];
 for(let y=0;y<180;y+=2)for(let x=0;x<180;x+=2){const k=(y*180+x)*4;if(pixels[k+3]>100)candidates.push([x/180,y/180,pixels[k],pixels[k+1],pixels[k+2]]);}
 if(!candidates.length)throw new Error('Empty chapter image');
 // Stable ordering means every point has a destination when images change.
 return Array.from({length:count},(_,i)=>candidates[(i*7919)%candidates.length]);
}
function drawField(f,time){
 if(!f.visible)return;
 const rect=f.el.getBoundingClientRect();
 const progress=Math.max(0,Math.min(1,(innerHeight*.92-rect.top)/(innerHeight*.45)));
 const goal=stopped()?1:progress;
 f.mix=stopped()?1:f.mix+(goal-f.mix)*.12;
 const t=f.mix*f.mix*(3-2*f.mix),burst=Math.sin(t*Math.PI);
 const size=f.el.clientWidth,dpr=Math.min(devicePixelRatio,1.5);
 if(f.canvas.width!==Math.round(size*dpr)){f.canvas.width=f.canvas.height=Math.round(size*dpr);}
 const ctx=f.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
 f.strength=stopped()?0:f.strength+((f.pointer.active?1:0)-f.strength)*.12;
 f.pulse=stopped()?0:f.pulse*.90;
 const dark=document.documentElement.dataset.theme==='dark'||f.el.closest('.journey');
 for(let i=0;i<count;i++){
  const a=f.from[i],b=f.points[i],angle=i*2.39996;
  const drift=stopped()?0:Math.sin(time*.0005+i)*.0015;
  let x=(a[0]+(b[0]-a[0])*t+Math.cos(angle)*burst*.075+drift)*size;
  let y=(a[1]+(b[1]-a[1])*t+Math.sin(angle)*burst*.075)*size;
  if(f.strength>.001||f.pulse>.001){
   const dx=x-f.pointer.x*size,dy=y-f.pointer.y*size,d=Math.hypot(dx,dy),radius=size*.28;
   const force=Math.max(0,1-d/radius)**2*(f.strength*.075+f.pulse*.12)*size;
   x+=dx/Math.max(d,1)*force;y+=dy/Math.max(d,1)*force;
   x+=(f.pointer.x-.5)*size*.018*f.strength;y+=(f.pointer.y-.5)*size*.018*f.strength;
  }
  let r=a[2]+(b[2]-a[2])*t,g=a[3]+(b[3]-a[3])*t,blue=a[4]+(b[4]-a[4])*t;
  if(dark){r=r*.62+85;g=g*.62+85;blue=blue*.62+75;}
  ctx.fillStyle=`rgb(${r|0} ${g|0} ${blue|0})`;
  ctx.beginPath();ctx.arc(x,y,size<250?1.05:1.4,0,Math.PI*2);ctx.fill();
 }
 f.el.dataset.morph=f.mix.toFixed(2);
}
function tick(time){frame=0;if(dead||document.hidden)return;if(time-last>32){fields.forEach(f=>drawField(f,time));last=time;}if(!stopped()&&fields.some(f=>f.visible))frame=requestAnimationFrame(tick);}
function wake(){if(dead)return;if(stopped()){cancelAnimationFrame(frame);frame=0;fields.forEach(f=>drawField(f,0));}else if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const f=fields.find(f=>f.el===e.target);if(f)f.visible=e.isIntersecting;}wake();},{rootMargin:'80px'});
async function mount(){
 const points=await Promise.all(slots.map(async el=>{const img=el.querySelector('img');try{await img.decode();return sample(img);}catch{return null;}}));
 slots.forEach((el,i)=>{if(!points[i])return;const canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;const f={el,canvas,ctx,points:points[i],from:points[(i+points.length-1)%points.length]||points[i],mix:stopped()?1:0,visible:false,pointer:{x:.5,y:.5,active:false},strength:0,pulse:0};fields.push(f);
 const point=e=>{if(stopped())return;const r=el.getBoundingClientRect();f.pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,active:true};wake();};
 el.addEventListener('pointermove',point,{passive:true});el.addEventListener('pointerdown',e=>{point(e);if(!stopped())f.pulse=1;},{passive:true});
 for(const event of ['pointerleave','pointercancel','pointerup'])el.addEventListener(event,()=>{f.pointer.active=false;wake();},{passive:true});el.classList.add('art-ready');observer.observe(el);});wake();
}
const mutation=new MutationObserver(wake);mutation.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme']});
addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake,{passive:true});document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);
addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();mutation.disconnect();},{once:true});
mount().catch(()=>{}); // Static SVG illustrations remain available on failure.

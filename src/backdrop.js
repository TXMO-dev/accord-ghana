// A continuous particle field: agreement -> held value -> completion.
// Decorative only; all information remains available as HTML.
const canvas=document.createElement('canvas');canvas.className='particle-backdrop';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
const ctx=canvas.getContext('2d');const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let w=0,h=0,dpr=1,frame=0,current=0,target=0,last=0,visible=true;
const count=matchMedia('(max-width:650px)').matches?350:1100;
const particles=Array.from({length:count},(_,i)=>({u:i/count,v:((i*137.508)%360)/360,x:0,y:0}));
function shape(t,u,v){
 const a=u*Math.PI*2;
 if(t===0)return [Math.cos(a)*(0.36+v*.1),Math.sin(a)*(0.27+v*.07)];
 if(t===1){const side=Math.floor(u*4),k=(u*4)%1;return side===0?[-.3+k*.6,-.4+v*.02]:side===1?[.3+v*.02,-.4+k*.8]:side===2?[.3-k*.6,.4+v*.02]:[-.3-v*.02,.4-k*.8]}
 if(t===2){const r=.3+v*.08;return [Math.cos(a)*r,Math.sin(a)*r]}
 const p=u<.38?u/.38:(u-.38)/.62;
 return u<.38?[-.32+p*.23,-.02+p*.23+v*.025]:[-.09+p*.46,.21-p*.52+v*.025];
}
function size(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio,1.5);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}size();addEventListener('resize',size,{passive:true});
const scenes=[document.querySelector('.hero'),document.querySelector('#story'),document.querySelector('.journey'),document.querySelector('#workspace')];
function scroll(){let s=0;for(let i=1;i<scenes.length;i++){const r=scenes[i].getBoundingClientRect();if(r.top<h*.7)s=i}target=s;const y=scrollY;canvas.style.opacity=y< h*.7?'.45':target===3?'.035':'.16';}
addEventListener('scroll',scroll,{passive:true});scroll();
function draw(time){
 frame=requestAnimationFrame(draw);if(!visible||time-last<33)return;last=time;
 const paused=reduced.matches||document.documentElement.classList.contains('still');
 current=paused?target:current+(target-current)*.045;
 ctx.clearRect(0,0,w,h);
 const lo=Math.floor(current),hi=Math.min(3,lo+1),mix=current-lo;
 const scale=Math.min(w*.55,650),cx=w<650?w*.75:w*.77,cy=h*.52;
 particles.forEach((p,i)=>{
  const a=shape(lo,p.u,p.v),b=shape(hi,p.u,p.v),drift=paused?0:Math.sin(time*.0004+i)*.003;
  const x=cx+(a[0]+(b[0]-a[0])*mix+drift)*scale,y=cy+(a[1]+(b[1]-a[1])*mix)*scale;
  ctx.fillStyle=i%5===0?'#b78f67':target===0?'#d5d9bb':'#345b45';
  ctx.beginPath();ctx.arc(x,y,i%9===0?1.8:1,0,Math.PI*2);ctx.fill();
 });
}
document.addEventListener('visibilitychange',()=>{visible=!document.hidden});
requestAnimationFrame(draw);

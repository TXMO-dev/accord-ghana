const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
const progress=document.querySelector('.scroll-progress');
let ticking=false;
function update(){
  ticking=false;
  const y=scrollY, height=document.documentElement.scrollHeight-innerHeight;
  progress.style.transform='scaleX('+(height>0?y/height:0)+')';
  if(!reduce.matches) {
    hero.style.setProperty('--drift',Math.min(y*.18,130)+'px');
    hero.style.setProperty('--fade',Math.max(0,1-y/1000));
  }
}
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(update);ticking=true}},{passive:true});
const observer = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target)}}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));
document.documentElement.classList.remove('still');
update();

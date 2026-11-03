const atlas=document.getElementById('accord-atlas');
const trigger=document.getElementById('atlas-trigger');
if(atlas&&trigger){
 const close=()=>atlas.close();
 trigger.addEventListener('click',()=>{atlas.showModal();document.documentElement.classList.add('atlas-open');trigger.setAttribute('aria-expanded','true')});
 document.getElementById('atlas-close').addEventListener('click',close);
 atlas.addEventListener('close',()=>{document.documentElement.classList.remove('atlas-open');trigger.setAttribute('aria-expanded','false');trigger.focus()});
 atlas.addEventListener('click',event=>{if(event.target===atlas){const rect=atlas.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close()}});
 const description=document.getElementById('atlas-description');
 atlas.querySelectorAll('.atlas-links a').forEach(link=>{const preview=()=>description.textContent=link.dataset.preview;link.addEventListener('pointerenter',preview);link.addEventListener('focus',preview);link.addEventListener('click',close)});
}

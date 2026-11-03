const system=matchMedia('(prefers-color-scheme: dark)');
let saved=null;
try{saved=localStorage.getItem('accord-theme')}catch{}
function apply(theme){
 document.documentElement.dataset.theme=theme;
 const button=document.querySelector('#theme-toggle');
 if(button){button.textContent=theme==='dark'?'Light mode':'Dark mode';button.setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`);button.setAttribute('aria-pressed',String(theme==='dark'));}
}
apply(saved==='dark'||saved==='light'?saved:system.matches?'dark':'light');
document.querySelector('#theme-toggle')?.addEventListener('click',()=>{saved=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(saved);try{localStorage.setItem('accord-theme',saved)}catch{}});
system.addEventListener('change',()=>{if(!saved)apply(system.matches?'dark':'light')});

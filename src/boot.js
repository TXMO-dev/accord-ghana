import {LOCAL_TESTING} from './local-mode.js';
import {openAccount} from './accounts.js';
import './material-scene.css';
// Load 3D independently; a failed download leaves the original image intact.
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const startScene=()=>import('./material-scene.js').then(m=>m.mountMaterialScene(document.querySelector('.hero'))).catch(()=>{});
 if('requestIdleCallback' in window)requestIdleCallback(startScene,{timeout:1800});else setTimeout(startScene,300);
}
// The account shell is bundled with the page; only signing needs the wallet SDK.
function showReload(){
 const box=document.querySelector('#toast');box.replaceChildren();
 const message=document.createElement('p');message.textContent='An app update or interrupted download prevented this feature from loading. Reload the latest page and try again.';
 const reload=document.createElement('button');reload.textContent='Reload latest version';reload.onclick=()=>location.reload();
 const dismiss=document.createElement('button');dismiss.textContent='Dismiss';dismiss.onclick=()=>box.style.display='none';
 box.append(message,reload,dismiss);box.style.display='block';
}
window.addEventListener('vite:preloadError',showReload);
document.querySelectorAll('[data-account]').forEach(button=>button.addEventListener('click',()=>openAccount(button.dataset.account)));
const observer=new IntersectionObserver(async entries=>{
 if(entries.some(e=>e.isIntersecting)){observer.disconnect();try{await import('./chain-ui.js')}catch{document.querySelector('#chain-status').textContent='The testnet module could not load. Reload the latest version.';showReload()}}
},{rootMargin:'200px'});
observer.observe(document.querySelector('#testnet'));
const workspaceObserver=new IntersectionObserver(async entries=>{
 if(entries.some(e=>e.isIntersecting)){workspaceObserver.disconnect();try{await import('./workspace.js')}catch{document.querySelector('#studio-status').textContent='Workspace could not load. Reload the latest version.';showReload()}}
},{rootMargin:'300px'});
workspaceObserver.observe(document.querySelector('#workspace'));

if(import.meta.env.DEV&&LOCAL_TESTING)import('./local-test-ui.js').catch(error=>{console.error(error);document.querySelector('#studio-status').textContent='Local test setup failed. Reload to retry.'});

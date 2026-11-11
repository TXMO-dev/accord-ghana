import './backdrop.js';
import './atlas.js';
import './studio-shell.js';
import './activity-inbox.js';
import {LOCAL_TESTING} from './local-mode.js';
import {openAccount} from './accounts.js';
import './material-scene.css';
// Load 3D independently; a failed download leaves the original image intact.
if(!document.documentElement.classList.contains('studio-experience')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
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

function revealDestination(){
 const destination=document.getElementById(location.hash.slice(1));
 if(!destination)return;
 for(let node=destination;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
}
addEventListener('hashchange',revealDestination);
revealDestination();

const roomObserver=new IntersectionObserver(async entries=>{
 if(!entries.some(e=>e.isIntersecting))return;roomObserver.disconnect();
 try{const room=await import('./studio-room.js');room.mountStudioRoom();import('./three-feedback.js').then(m=>m.mountWorkspaceLoader()).catch(()=>{});window.dispatchEvent(new Event('accord-studio-ready'));}
 catch(error){console.error('Studio initialization failed',error);const loading=document.getElementById('room-loading');if(loading)loading.textContent='Continue using the labelled workspace controls below.';window.dispatchEvent(new Event('accord-studio-ready'));}
},{rootMargin:'300px'});
roomObserver.observe(document.getElementById('studio-room'));

import './world-form-scenes.js';

const liteLink=document.createElement('a');liteLink.href='/lite.html';liteLink.textContent='Lightweight workspace';liteLink.className='secondary';document.querySelector('.entrance-actions')?.append(liteLink);const liteMenu=liteLink.cloneNode(true);document.querySelector('header nav')?.append(liteMenu);

import './lite.css';
import {openAccount} from './accounts.js';
document.querySelectorAll('[data-account]').forEach(button=>button.addEventListener('click',()=>openAccount(button.dataset.account)));
const loading=document.getElementById('lite-loading');
function failure(){loading.replaceChildren(document.createTextNode('The workspace could not load. Check your connection, then '));const retry=document.createElement('button');retry.textContent='Reload workspace';retry.onclick=()=>location.reload();loading.append(retry);}
addEventListener('vite:preloadError',failure);
addEventListener('accord-open-workspace',()=>document.getElementById('workspace').scrollIntoView({block:'start'}));
addEventListener('accord-open-project-room',()=>document.querySelector('.shared-room')?.scrollIntoView({block:'start'}));
try{await import('./workspace.js');loading.hidden=true;}catch(error){console.error('Workspace initialization failed',error);failure();}

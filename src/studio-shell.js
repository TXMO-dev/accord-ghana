// Keep the existing wallet and agreement DOM intact while making the room the app shell.
const room=document.getElementById('studio-room');
const workspace=document.getElementById('workspace');
const panel=document.createElement('dialog');panel.id='studio-workspace-panel';panel.setAttribute('aria-label','Your agreements and wallet');
const bar=document.createElement('div');bar.className='workspace-panel-bar';
const heading=document.createElement('h2');heading.textContent='Your work, in accord.';
const close=document.createElement('button');close.type='button';close.textContent='Back to studio ×';close.onclick=()=>panel.close();bar.append(heading,document.getElementById("studio-connect"),close);
document.body.append(room);panel.append(bar,workspace);document.body.append(panel);
document.documentElement.classList.add('studio-experience');
let locked=false;
addEventListener('accord-workspace-lock',event=>{locked=!!event.detail;close.disabled=locked;});
panel.addEventListener('cancel',event=>{if(locked)event.preventDefault();});
export function openWorkspace(){if(!panel.open)panel.showModal();}
addEventListener('accord-open-workspace',openWorkspace);
const nav=document.querySelector('header nav');
if(nav){nav.querySelectorAll('a').forEach(link=>{if(link.getAttribute('href')==='#workspace'){link.textContent='My agreements';link.onclick=e=>{e.preventDefault();openWorkspace();};}if(link.getAttribute('href')==='#story'){link.textContent='Kobi’s guide';link.href='#studio-room';link.onclick=e=>{e.preventDefault();document.querySelector('.room-tutorial').open=true;document.querySelector('.room-tutorial summary').focus();};}});}
document.querySelectorAll('a[href="#workspace"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();openWorkspace();}));
// A direct workspace link still opens the real agreement tools.
if(location.hash==='#workspace')openWorkspace();
addEventListener('hashchange',()=>{if(location.hash==='#workspace')openWorkspace();});
const agreements=document.createElement('button');agreements.type='button';agreements.textContent='My agreements ↗';agreements.className='room-agreements';agreements.onclick=openWorkspace;document.querySelector('.room-heading').prepend(agreements);
// Hide the old marketing navigation; reviewer and portfolio links stay available.
const explore=document.getElementById('atlas-trigger');if(explore){explore.textContent='About Accord';}

const header=document.querySelector('header');
if(header)new ResizeObserver(()=>document.documentElement.style.setProperty('--studio-header-height',header.getBoundingClientRect().height+'px')).observe(header);

const approach=document.querySelector('.atlas-links a[href="#story"]');
if(approach){approach.href='#studio-room';approach.querySelector('strong').textContent='The studio';}

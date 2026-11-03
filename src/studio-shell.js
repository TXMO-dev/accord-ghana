// Keep the existing wallet and agreement DOM intact while making the room the app shell.
const room=document.getElementById('studio-room');
const workspace=document.getElementById('workspace');
const panel=document.createElement('section');panel.hidden=true;panel.tabIndex=-1;panel.id='studio-workspace-panel';panel.setAttribute('aria-label','Your agreements and wallet');
const bar=document.createElement('div');bar.className='workspace-panel-bar';
const heading=document.createElement('h2');heading.textContent='Your work, in accord.';
const close=document.createElement('button');close.type='button';close.textContent='Back to studio ×';close.onclick=()=>{if(locked)return;document.getElementById('studio-dialog').close();panel.hidden=true;room.classList.remove('workspace-active');document.querySelector('.room-agreements').focus();};bar.append(heading,document.getElementById("studio-connect"),close);
document.body.append(room);panel.append(bar,workspace,document.getElementById("studio-dialog"));room.querySelector(".room-layout").append(panel);
document.documentElement.classList.add('studio-experience');
let locked=false;
addEventListener('accord-workspace-lock',event=>{locked=!!event.detail;close.disabled=locked;});
panel.addEventListener('cancel',event=>{if(locked)event.preventDefault();});
export function openWorkspace(event){room.querySelector('.studio-entrance')?.remove();panel.hidden=false;room.classList.add('workspace-active');heading.textContent=typeof event?.detail?.title==='string'?event.detail.title:'Your work, in accord.';panel.focus({preventScroll:true});}
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

const entrance=document.createElement('section');entrance.className='studio-entrance';entrance.setAttribute('aria-label','Welcome to Accord');
entrance.innerHTML='<div class="entrance-copy"><span class="eyebrow">DESIGNED IN GHANA · BUILT FOR SHARED WORK</span><h1>Great work.<br>A clear beginning.</h1><p>A shared studio for clients and freelancers. Agree on the work, fund a milestone, deliver and review.</p><p class="entrance-status" role="status">Preparing your studio…</p><div class="entrance-actions"><button type="button" id="enter-studio" disabled>Enter the studio ↗</button><button type="button" class="secondary" id="entrance-work">Go to my agreements</button></div><span class="entrance-footnote">Stellar Testnet · Test assets only · Sound on, mute anytime</span></div>';
room.append(entrance);
function dismissEntrance(){entrance.classList.add('entrance-leaving');setTimeout(()=>entrance.remove(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);try{sessionStorage.setItem('accord-entered','1');}catch{}}
let returning=false;try{returning=sessionStorage.getItem('accord-entered')==='1';}catch{}
if(returning||location.hash==='#workspace')entrance.remove();
addEventListener('accord-studio-ready',()=>{const button=document.getElementById('enter-studio');if(button){button.disabled=false;entrance.querySelector('.entrance-status').textContent='Your studio is ready.';}});
entrance.querySelector('#enter-studio').onclick=()=>{dismissEntrance();dispatchEvent(new Event('accord-enter-studio'));};
entrance.querySelector('#entrance-work').onclick=()=>{dismissEntrance();openWorkspace();};
const motionOff=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('still');
const status=document.getElementById('studio-status');
if(status)new MutationObserver(()=>{if(!motionOff()&&status.textContent.trim())status.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});}).observe(status,{childList:true,characterData:true,subtree:true});

const roomHeading=room.querySelector('.room-heading');
if(roomHeading)new ResizeObserver(()=>document.documentElement.style.setProperty('--studio-toolbar-height',roomHeading.getBoundingClientRect().height+'px')).observe(roomHeading);
// Scene interactions lead; the equivalent keyboard controls remain one click away.
const studioControls=room.querySelector('.room-panel');
const drawerToggle=document.createElement('button');drawerToggle.type='button';drawerToggle.textContent='Studio controls';drawerToggle.setAttribute('aria-expanded','false');drawerToggle.setAttribute('aria-controls','studio-controls');studioControls.id='studio-controls';
room.querySelector('.room-view-controls').append(drawerToggle);
function toggleControls(open){room.classList.toggle('controls-open',open);drawerToggle.setAttribute('aria-expanded',String(open));studioControls.hidden=!open;}
drawerToggle.onclick=()=>toggleControls(studioControls.hidden);toggleControls(false);
room.querySelector('.room-tutorial').open=false;
const stationCard=document.createElement('div');stationCard.className='room-station-card';stationCard.append(document.getElementById('room-title'),document.getElementById('room-action'));room.querySelector('.room-layout').append(stationCard);
// Navigation help always reveals the drawer before focusing its contents.
document.querySelectorAll('a[href="#studio-room"]').forEach(link=>link.addEventListener('click',()=>toggleControls(true)));// Keep scene commands compact while preserving their original handlers and IDs.
const commandList=room.querySelector('.room-view-controls');
const commandMenu=document.createElement('details');commandMenu.className='studio-command-menu';
const commandSummary=document.createElement('summary');commandSummary.textContent='Studio menu';
commandList.before(commandMenu);commandMenu.append(commandSummary,commandList);
commandList.setAttribute('aria-label','Studio actions');
commandList.addEventListener('click',event=>{if(!event.target.closest('button'))return;commandMenu.open=false;if(commandList.contains(document.activeElement))commandSummary.focus({preventScroll:true});});
document.addEventListener('pointerdown',event=>{if(commandMenu.open&&!commandMenu.contains(event.target))commandMenu.open=false;});
commandMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();commandMenu.open=false;commandSummary.focus();}});

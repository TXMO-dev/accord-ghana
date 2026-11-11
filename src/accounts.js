import {LOCAL_TESTING} from './local-mode.js';
import {requireWalletReviewClear, WALLET_REVIEW_HOLD, REVIEW_MESSAGE} from './wallet-policy.js';
const dialog=document.querySelector('#account-dialog'),note=document.querySelector('#account-status');
let account='',workspaceLocked=false;
const disconnectButton=document.createElement('button');disconnectButton.type='button';disconnectButton.id='account-disconnect';disconnectButton.className='secondary';disconnectButton.textContent='Disconnect wallet';disconnectButton.hidden=true;document.querySelector('#account-connect').after(disconnectButton);
function syncDisconnect(){disconnectButton.hidden=!account;disconnectButton.disabled=workspaceLocked||dialog.getAttribute('aria-busy')==='true';}
addEventListener('accord-workspace-lock',e=>{workspaceLocked=!!e.detail;syncDisconnect();});
new MutationObserver(syncDisconnect).observe(dialog,{attributes:true,attributeFilter:['aria-busy']});
disconnectButton.onclick=async()=>{if(disconnectButton.disabled)return;disconnectButton.disabled=true;try{const {disconnect}=await import('./stellar.js');disconnect();document.querySelector('#wallet-address').textContent='';note.textContent='Wallet disconnected. Your saved agreements remain on this device.';}catch{note.textContent='Could not disconnect. Please try again.';}finally{syncDisconnect();}};

window.addEventListener('accord-wallet',async event=>{
 const wallet=event.detail?.wallet||'';account=wallet;syncDisconnect();document.querySelector('#wallet-address').textContent=wallet;document.querySelector('#account-connect').textContent=wallet?'Switch wallet ↗':'Connect wallet ↗';
 const session=document.querySelector('#account-session');
 session.textContent=wallet?wallet.slice(0,6)+'…'+wallet.slice(-4)+' · Testnet':'';
 session.title=wallet;
 document.querySelector('.nav-login').textContent=wallet?'Wallet & profile':'Sign in';
 document.querySelector('.nav-register').hidden=!!wallet;
 document.querySelector('#account-register').disabled=true;
 const workspaceConnect=document.querySelector('#studio-connect');
 if(workspaceConnect)workspaceConnect.textContent=wallet?'Switch wallet ↗':'Connect wallet ↗';
 if(!wallet)return;
 try{
  const {readMethod,address}=await import('./stellar.js');
  const config=await fetch('/network.json').then(r=>r.json());
  const profile=await readMethod(config.contractId,'profile',[address(wallet)]);
  if(account!==wallet)return;
  if(profile)session.textContent=profile.name+' · Testnet';
  document.querySelector('#account-register').disabled=!!profile;
 }catch{/* The wallet remains connected even if its profile cannot be read. */}
});
export function openAccount(mode){if(document.documentElement.dataset.workspaceMode!=='lite')import('./three-feedback.js').then(m=>m.mountAccountVisuals()).catch(()=>{});if(!dialog.open)dialog.showModal();note.textContent=LOCAL_TESTING?'Local disposable Testnet wallet selected. Keys stay in this tab.':WALLET_REVIEW_HOLD?REVIEW_MESSAGE:account?'Wallet connected. You can switch or disconnect below.':'Connect your wallet to continue.';syncDisconnect();document.querySelector('#account-title').textContent=account?'Your wallet. Your profile.':mode==='register'?'Make room for your next chapter.':'Welcome back to your work.'}
document.querySelector('#close-account').onclick=()=>dialog.close();
document.querySelector('#account-connect').onclick=async()=>{
 const connectButton=document.querySelector('#account-connect');
 if(connectButton.disabled)return;
 dialog.setAttribute('aria-busy','true');connectButton.disabled=true;connectButton.textContent='Connecting…';account='';
 document.querySelector('#account-register').disabled=true;
 note.textContent='Choose a wallet to continue.';
 try{
  requireWalletReviewClear();
  const {connect,readMethod,address}=await import('./stellar.js');
  account=await connect();document.querySelector('#wallet-address').textContent=account;
  const config=await fetch('/network.json').then(r=>r.json());
  if(!config.contractId)throw Error('Contract deployment is not configured yet.');
  const connectedWallet=account;const p=await readMethod(config.contractId,'profile',[address(connectedWallet)]);if(account!==connectedWallet)return;
  if(p){document.querySelector('#account-session').textContent=p.name+' · Testnet';note.textContent='Profile found. Your wallet must approve every agreement action.';document.querySelector('#account-register').disabled=true}
  else{note.textContent='Wallet connected. Register a public display name below.';document.querySelector('#account-register').disabled=false}
 }catch(e){note.textContent=e.message||'Wallet connection failed. Unlock your wallet and try again.'}
 finally{dialog.setAttribute('aria-busy','false');connectButton.disabled=false;connectButton.textContent='Connect wallet ↗'}
};
document.querySelector('#account-form').onsubmit=async e=>{
 e.preventDefault();dialog.setAttribute('aria-busy','true');const button=document.querySelector('#account-register');button.disabled=true;
 try{
  requireWalletReviewClear();
  if(!account)throw Error('Connect your wallet first.');
  const {invoke,address}=await import('./stellar.js');
  const {nativeToScVal}=await import('@stellar/stellar-sdk');
  const name=new FormData(e.target).get('name').trim();
  if(!name || new TextEncoder().encode(name).length>64)throw Error('Use a display name of 1–64 UTF-8 bytes.');
  const config=await fetch('/network.json').then(r=>r.json());
  await invoke(config.contractId,'register',[address(account),nativeToScVal(name,{type:'string'})],s=>note.textContent=s);
  document.querySelector('#account-session').textContent=name+' · Testnet';
  note.textContent='Registration confirmed on Stellar Testnet. Your signing keys remain in your wallet.';
 }catch(e){note.textContent=e.message;button.disabled=false}finally{dialog.setAttribute('aria-busy','false')}
};

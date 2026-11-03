import {LOCAL_TESTING} from './local-mode.js';
import {requireWalletReviewClear, WALLET_REVIEW_HOLD, REVIEW_MESSAGE} from './wallet-policy.js';
const dialog=document.querySelector('#account-dialog'),note=document.querySelector('#account-status');
let account='';
window.addEventListener('accord-wallet',async event=>{
 const wallet=event.detail?.wallet||'';account=wallet;
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
export function openAccount(mode){import('./three-feedback.js').then(m=>m.mountAccountVisuals()).catch(()=>{});if(!dialog.open)dialog.showModal();note.textContent=LOCAL_TESTING?'Local disposable Testnet wallet selected. Keys stay in this tab.':WALLET_REVIEW_HOLD?REVIEW_MESSAGE:'Connect your wallet to continue.';document.querySelector('#account-title').textContent=account?'Your wallet. Your profile.':mode==='register'?'Make room for your next chapter.':'Welcome back to your work.'}
document.querySelector('#close-account').onclick=()=>dialog.close();
document.querySelector('#account-connect').onclick=async()=>{
 const connectButton=document.querySelector('#account-connect');
 if(connectButton.disabled)return;
 dialog.setAttribute('aria-busy','true');connectButton.disabled=true;connectButton.textContent='Connecting…';account='';
 document.querySelector('#account-register').disabled=true;
 note.textContent='Opening Varial… If access was already approved, the wallet may reconnect without a popup.';
 try{
  requireWalletReviewClear();
  const {connect,readMethod,address}=await import('./stellar.js');
  account=await connect();document.querySelector('#wallet-address').textContent=account;
  const config=await fetch('/network.json').then(r=>r.json());
  if(!config.contractId)throw Error('Contract deployment is not configured yet.');
  const connectedWallet=account;const p=await readMethod(config.contractId,'profile',[address(connectedWallet)]);if(account!==connectedWallet)return;
  if(p){document.querySelector('#account-session').textContent=p.name+' · Testnet';note.textContent='Profile found. Your wallet must approve every agreement action.';document.querySelector('#account-register').disabled=true}
  else{note.textContent='Wallet connected. Register a public display name below.';document.querySelector('#account-register').disabled=false}
 }catch(e){note.textContent=e.message||'Wallet connection failed. Open Varial, unlock it and try again.'}
 finally{dialog.setAttribute('aria-busy','false');connectButton.disabled=false;connectButton.textContent='Connect Varial ↗'}
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
  note.textContent='Registration confirmed on Stellar Testnet. Your signing keys remain in Varial.';
 }catch(e){note.textContent=e.message;button.disabled=false}finally{dialog.setAttribute('aria-busy','false')}
};

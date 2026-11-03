import {LOCAL_TESTING} from './local-mode.js';
import {requireWalletReviewClear, WALLET_REVIEW_HOLD, REVIEW_MESSAGE, DOMAIN_REVIEW_NOTICE} from './wallet-policy.js';
const dialog=document.querySelector('#account-dialog'),note=document.querySelector('#account-status');
let account='';
export function openAccount(mode){if(!dialog.open)dialog.showModal();note.textContent=LOCAL_TESTING?'Local disposable Testnet wallet selected. Keys stay in this tab.':WALLET_REVIEW_HOLD?REVIEW_MESSAGE:DOMAIN_REVIEW_NOTICE;document.querySelector('#account-title').textContent=mode==='register'?'Make room for your next chapter.':'Welcome back to your work.'}
document.querySelector('#close-account').onclick=()=>dialog.close();
document.querySelector('#account-connect').onclick=async()=>{
 try{
  requireWalletReviewClear();
  const {connect,readMethod,address}=await import('./stellar.js');
  note.textContent='Unlock Varial and choose Stellar Testnet.';
  account=await connect();document.querySelector('#wallet-address').textContent=account;
  const config=await fetch('/network.json').then(r=>r.json());
  if(!config.contractId)throw Error('Contract deployment is not configured yet.');
  const p=await readMethod(config.contractId,'profile',[address(account)]);
  if(p){document.querySelector('#account-session').textContent=p.name+' · Testnet';note.textContent='Profile found. Your wallet must approve every agreement action.';document.querySelector('#account-register').disabled=true}
  else{note.textContent='Wallet connected. Register a public display name below.';document.querySelector('#account-register').disabled=false}
 }catch(e){note.textContent=e.message}
};
document.querySelector('#account-form').onsubmit=async e=>{
 e.preventDefault();const button=document.querySelector('#account-register');button.disabled=true;
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
 }catch(e){note.textContent=e.message;button.disabled=false}
};

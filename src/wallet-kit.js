import {checkedWalletSign} from './wallet-signing.js';
import * as varial from '@stellar/freighter-api';
const NETWORK='Test SDF Network ; September 2015',providerKey='accord-wallet-provider';
let loading,kit,selected='varial';
try{const saved=localStorage.getItem(providerKey);if(['varial','scopuly'].includes(saved))selected=saved;}catch{}
async function ready(){
 if(!loading)loading=Promise.all([import('@creit.tech/stellar-wallets-kit/sdk'),import('@creit.tech/stellar-wallets-kit/modules/varial'),import('@creit.tech/stellar-wallets-kit/modules/scopuly')]).then(([sdk,v,s])=>{kit=sdk.StellarWalletsKit;kit.init({modules:[new v.VarialModule(),new s.ScopulyModule()],network:NETWORK,selectedWalletId:selected});return kit;}).catch(e=>{loading=null;throw e;});
 return loading;
}
function selectWallet(wallets){return new Promise((resolve,reject)=>{
 const dialog=document.createElement('dialog');dialog.className='room-keyboard-help wallet-picker';dialog.setAttribute('aria-labelledby','wallet-picker-title');
 dialog.innerHTML='<h2 id="wallet-picker-title">Your wallet. Your choice.</h2><p>Connect on Stellar Testnet. Both participants can use different wallets.</p><div class="wallet-options"></div><p class="muted">Scopuly integration is in early access. LOBSTR and xBull are not selectable yet because their kit modules lack settlement authorization signing.</p><button type="button" class="secondary wallet-picker-cancel">Cancel</button>';
 const previous=document.activeElement;let chosen=false;
 for(const wallet of wallets){const row=document.createElement('div'),button=document.createElement('button'),note=document.createElement('small');button.type='button';button.textContent=wallet.name;button.disabled=!wallet.isAvailable;note.textContent=wallet.isAvailable?'Available in this browser':'Not detected in this browser';button.onclick=()=>{chosen=true;dialog.close();resolve(wallet.id);};row.append(button,note);if(!wallet.isAvailable){const link=document.createElement('a');link.href=wallet.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Get '+wallet.name+' ↗';row.append(link);}dialog.querySelector('.wallet-options').append(row);}
 dialog.querySelector('.wallet-picker-cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();previous?.focus?.({preventScroll:true});if(!chosen)reject(new Error('Wallet selection cancelled.'));},{once:true});document.body.append(dialog);dialog.showModal();
});}
export async function requestAccess(){const k=await ready(),wallets=await k.refreshSupportedWallets();selected=await selectWallet(wallets);k.setWallet(selected);const result=await k.selectedModule.getAddress();const network=await k.getNetwork();if(network.networkPassphrase!==NETWORK)throw Error('Select Stellar Testnet in your wallet, then reconnect.');try{localStorage.setItem(providerKey,selected);}catch{}return result;}
export async function getAddress(){const k=await ready();return k.selectedModule.getAddress({skipRequestAccess:true});}
export async function getNetworkDetails(){return (await ready()).getNetwork();}
export const isConnected=async()=>({isConnected:true}); // The picker checks each provider's actual availability.
export async function isAllowed(){if(selected==='varial')return varial.isAllowed();if(typeof window.scopuly?.isAllowed!=='function')return {isAllowed:false};return window.scopuly.isAllowed();}
async function sign(method,value,options){const k=await ready();return checkedWalletSign({getAddress,getNetworkDetails,[method]:(payload,opts)=>k[method](payload,opts)},method,value,options,NETWORK);}
export const signTransaction=(value,options)=>sign('signTransaction',value,options);
export const signAuthEntry=(value,options)=>sign('signAuthEntry',value,options);
export const signMessage=(value,options)=>sign('signMessage',value,options);

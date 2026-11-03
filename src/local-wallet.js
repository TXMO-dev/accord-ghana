import {reviewAction} from './review.js';
import {LOCAL_TESTING} from './local-mode.js';
import {createDisposableWallets} from './disposable-wallets.js';
import {Networks} from '@stellar/stellar-sdk';
if(!LOCAL_TESTING)throw Error('Disposable wallet adapter is restricted to local development.');
const wallets=createDisposableWallets();
export const addresses=wallets.addresses();
export const selectRole=role=>wallets.select(role);
export const getAddress=async()=>({address:wallets.address()});
export const getNetworkDetails=async()=>({networkPassphrase:Networks.TESTNET});
export const isConnected=async()=>({isConnected:true});
export const requestAccess=getAddress;
export async function signTransaction(xdr,options){
 if(!await reviewAction({eyebrow:'LOCAL WALLET / DISPOSABLE KEYS',title:'Your signature. Your call.',description:'Sign this transaction with the disposable wallet in this tab. This is a real Stellar Testnet transaction.',fields:[['Signing account',options.address],['Network','Stellar Testnet']],warning:'Test assets only. This wallet disappears when the tab reloads.',confirmLabel:'Sign on Testnet'}))throw Error('Test signature declined.');
 return wallets.sign(xdr,options);
}
export async function signAuthEntry(xdr,options){
 if(!await reviewAction({eyebrow:'LOCAL WALLET / SETTLEMENT AUTHORIZATION',title:'Agree on the split.',description:'Authorize the settlement reviewed above. The client still needs to sign and submit.',fields:[['Signing account',options.address],['Network','Stellar Testnet']],warning:'An exported authorization remains usable until its ledger expiry. Deleting the file does not revoke it.',confirmLabel:'Authorize on Testnet'}))throw Error('Test authorization declined.');
 return wallets.signAuthEntry(xdr,options);
}
export async function fundWallets(onStatus){
 for(const [role,address] of Object.entries(addresses)){
  onStatus('Funding '+role+' with valueless test XLM…');
  const r=await fetch('https://friendbot.stellar.org/?addr='+encodeURIComponent(address),{signal:AbortSignal.timeout(45000)});
  const text=await r.text();
  if(!r.ok&&!text.includes('already funded'))throw Error('Friendbot could not fund '+role+' ('+r.status+'). Retry funding.');
 }
}

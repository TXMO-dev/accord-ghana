import {checkWalletSelection} from './wallet-check.js';
import {submitTrackedTransaction} from './transaction-submit.js';
import {connectTestnet,requireWalletReviewClear} from './wallet-policy.js';
import * as extensionWallet from '@stellar/freighter-api';
import {LOCAL_TESTING} from './local-mode.js';
const {requestAccess,getNetworkDetails,getAddress,isConnected,signTransaction,signAuthEntry}=import.meta.env.DEV&&LOCAL_TESTING?await import('./local-wallet.js'):extensionWallet;
import {rpc, Networks, TransactionBuilder, Contract, Address, nativeToScVal, scValToNative, BASE_FEE, StrKey,authorizeEntry} from '@stellar/stellar-sdk';
export const NETWORK = Networks.TESTNET;
export const server = new rpc.Server('https://soroban-testnet.stellar.org');
export let account = '';
export async function connect() {
  account = '';
  window.dispatchEvent(new CustomEvent('accord-wallet',{detail:{wallet:account}}));
  account = await connectTestnet({isConnected,getNetworkDetails,requestAccess},NETWORK,LOCAL_TESTING?false:undefined);
  window.dispatchEvent(new CustomEvent('accord-wallet',{detail:{wallet:account}}));
  return account;
}
export {validateContract,digest,bytes,address,amount} from './values.js';
import {validateContract,digest,bytes,address,amount,transactionHashHex} from './values.js';
export async function invoke(contractId, method, args, onStatus=()=>{}, onSubmitted=()=>{}) {
  requireWalletReviewClear();
  if(!account) throw Error('Connect Varial first.');
  const current=await getAddress();
  if(current.error || current.address!==account) throw Error('Your wallet account changed. Reconnect before continuing.');
  const config=await fetch('/network.json').then(r=>r.json());
  if(contractId!==config.contractId) throw Error('Only the verified Accord testnet deployment is supported.');
  const network=await getNetworkDetails();
  if(network.networkPassphrase!==NETWORK) throw Error('Stellar Testnet required.');
  const source=await server.getAccount(account);
  const tx=new TransactionBuilder(source,{fee:BASE_FEE,networkPassphrase:NETWORK})
    .addOperation(new Contract(validateContract(contractId)).call(method,...args)).setTimeout(180).build();
  onStatus('Simulating transaction…');
  const prepared=await server.prepareTransaction(tx);
  return signAndSubmit(prepared,account,onStatus,onSubmitted);
}
export async function assertWallet(expected){
  requireWalletReviewClear();
  const current=await getAddress(),network=await getNetworkDetails();
  checkWalletSelection(expected,account,current,network,NETWORK);
}
export async function signAuthorization(entry,expiry,expected){
  await assertWallet(expected);
  const signed=await authorizeEntry(entry,async preimage=>{
    const result=await signAuthEntry(preimage.toXdr('base64'),{networkPassphrase:NETWORK,address:expected});
    if(result.error||!result.signedAuthEntry)throw Error(result.error?.message||'Authorization declined.');
    if(result.signerAddress&&result.signerAddress!==expected)throw Error('Use a standard single-key Testnet wallet.');
    return Uint8Array.from(atob(result.signedAuthEntry),c=>c.charCodeAt(0));
  },expiry,NETWORK);
  await assertWallet(expected);
  return signed;
}
export async function signAndSubmit(prepared,expected,onStatus=()=>{},onSubmitted=()=>{}){
  await assertWallet(expected);
  if(prepared.source!==expected||prepared.networkPassphrase!==NETWORK)throw Error('Unexpected transaction source or network.');
  onStatus(LOCAL_TESTING?'Review the disposable Testnet signature prompt.':'Review and approve in Varial.');
  const signed=await signTransaction(prepared.toXDR(),{networkPassphrase:NETWORK,address:expected});
  if(signed.error || !signed.signedTxXdr) throw Error(signed.error?.message || 'Signature declined.');
  const signedTx=TransactionBuilder.fromXDR(signed.signedTxXdr,NETWORK);
  await assertWallet(expected);
  if(transactionHashHex(signedTx.hash())!==transactionHashHex(prepared.hash()))throw Error('Wallet returned a different transaction. Nothing was submitted.');
  const {hash,result}=await submitTrackedTransaction({server,transaction:signedTx,hash:transactionHashHex(signedTx.hash()),onStatus,onSubmitted});
  return {hash,value:result.returnValue?scValToNative(result.returnValue):null};
}
export async function readAgreement(contractId,id) {
  return readMethod(contractId,'get',[bytes(await digest(id))]);
}
export async function readMethod(contractId,method,args) {
  if(!account) throw Error('Connect your testnet wallet first.');
  const source=await server.getAccount(account);
  const tx=new TransactionBuilder(source,{fee:BASE_FEE,networkPassphrase:NETWORK}).addOperation(new Contract(validateContract(contractId)).call(method,...args)).setTimeout(30).build();
  const result=await server.simulateTransaction(tx);
  if(rpc.Api.isSimulationError(result)) throw Error(result.error);
  if(!result.result) throw Error('No agreement returned.');
  return scValToNative(result.result.retval);
}

export async function transactionStatus(hash){return server.getTransaction(hash);}

import {Keypair,Networks,TransactionBuilder,contract,xdr,hash} from '@stellar/stellar-sdk';
// Keys live only in this module's memory. Never export, serialize, or persist them.
export function createDisposableWallets(){
 const keys={client:Keypair.random(),freelancer:Keypair.random()};let role='client';
 return {
  addresses:()=>Object.fromEntries(Object.entries(keys).map(([r,k])=>[r,k.publicKey()])),
  select:r=>{if(!keys[r])throw Error('Unknown test role');role=r},
  address:()=>keys[role].publicKey(),
  signAuthEntry:async(encoded,{networkPassphrase,address})=>{
   if(networkPassphrase!==Networks.TESTNET)throw Error('Disposable wallets only sign Stellar Testnet transactions.');
   if(address!==keys[role].publicKey())throw Error('Test wallet changed. Reconnect before signing.');
   const preimage=xdr.HashIdPreimage.fromXdr(encoded,'base64');
   if(!['envelopeTypeSorobanAuthorization','envelopeTypeSorobanAuthorizationWithAddress'].includes(preimage.type)||preimage.value.networkId.toXdr('hex')!==Array.from(hash(Networks.TESTNET),v=>v.toString(16).padStart(2,'0')).join(''))throw Error('Authorization must target Stellar Testnet.');
   return contract.basicNodeSigner(keys[role],Networks.TESTNET).signAuthEntry(encoded,{address});
  },
  sign:(xdr,{networkPassphrase,address})=>{
   if(networkPassphrase!==Networks.TESTNET)throw Error('Disposable wallets only sign Stellar Testnet transactions.');
   if(address!==keys[role].publicKey())throw Error('Test wallet changed. Reconnect before signing.');
   const tx=TransactionBuilder.fromXDR(xdr,Networks.TESTNET);
   if(tx.source!==address)throw Error('Unexpected transaction source.');
   tx.sign(keys[role]);return {signedTxXdr:tx.toXDR()};
  }
 };
}

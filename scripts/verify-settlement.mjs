import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rpc,Networks,TransactionBuilder,Keypair,Contract,scValToNative,authorizeEntry,Operation,nativeToScVal} from '@stellar/stellar-sdk';
import {digest,bytes,address,amount} from '../src/values.js';
import {prepareSellerOffer,prepareBuyerSettlement,settlementTransaction} from '../src/settlement-service.js';
import {settlementArgs} from '../src/settlement-model.js';
import {stateName} from '../src/workspace-model.js';
const config=JSON.parse(await fs.readFile('public/network.json','utf8')),server=new rpc.Server('https://soroban-testnet.stellar.org'),network=Networks.TESTNET;
const buyer=Keypair.random(),seller=Keypair.random(),receipts=[],checks=[];
for(const k of [buyer,seller]){const r=await fetch('https://friendbot.stellar.org/?addr='+k.publicKey());if(!r.ok)throw Error('Friendbot '+r.status)}
const c=new Contract(config.contractId);
async function submit(tx,k,action,id){tx.sign(k);const sent=await server.sendTransaction(tx);if(sent.status==='ERROR')throw Error('Send rejected: '+action);for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,1500));const result=await server.getTransaction(sent.hash);if(result.status==='SUCCESS'){receipts.push({action,agreementId:id,hash:sent.hash});console.log('Confirmed '+action+' '+id);return result}if(result.status==='FAILED')throw Error('Onchain failure: '+action)}throw Error('Confirmation timeout')}
async function send(method,args,id){let tx=new TransactionBuilder(await server.getAccount(buyer.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(c.call(method,...args)).setTimeout(180).build();return submit(await server.prepareTransaction(tx),buyer,method,id)}
async function read(contract,method,args){const tx=new TransactionBuilder(await server.getAccount(buyer.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(new Contract(contract).call(method,...args)).setTimeout(30).build();const r=await server.simulateTransaction(tx);if(r.error)throw Error(r.error);return scValToNative(r.result.retval)}
const balance=a=>read(config.assetId,'balance',[address(a)]);
for(const units of [4000000n,0n,10000001n]){
 const id='AC-'+randomUUID(),key=bytes(await digest(id));
 await send('create',[key,address(buyer.publicKey()),address(seller.publicKey()),address(config.assetId),amount('1.0000001'),bytes(await digest('Settlement acceptance test'))],id);
 await send('fund',[key],id);await send('dispute',[key,address(buyer.publicKey())],id);
 const agreement=await read(config.contractId,'get',[key]);
 const proposal=await prepareSellerOffer({server,config,id,agreement,sellerUnits:units,sign:(entry,expiry)=>authorizeEntry(entry,seller,expiry,network)});
 const tx=await prepareBuyerSettlement({server,config,id,agreement,proposal});
 if(units===4000000n){
   const missing=TransactionBuilder.cloneFrom(tx).clearOperations().addOperation(Operation.invokeHostFunction({func:tx.operations[0].func,auth:tx.operations[0].auth.filter(e=>e.credentials.type==='sorobanCredentialsSourceAccount')})).build();
   assert.ok(rpc.Api.isSimulationError(await server.simulateTransaction(missing,undefined,'enforce')));checks.push('Missing freelancer approval rejected by enforcement simulation');
   const wrong=settlementTransaction(await server.getAccount(buyer.publicKey()),config.contractId,await settlementArgs(id,'4000001'));
   const tampered=TransactionBuilder.cloneFrom(wrong).clearOperations().addOperation(Operation.invokeHostFunction({func:wrong.operations[0].func,auth:tx.operations[0].auth})).build();
   assert.ok(rpc.Api.isSimulationError(await server.simulateTransaction(tampered,undefined,'enforce')));checks.push('Changed amount rejected by enforcement simulation');
 }
 const before={buyer:await balance(buyer.publicKey()),seller:await balance(seller.publicKey()),escrow:await balance(config.contractId)};
 const result=await submit(tx,buyer,'settle',id);
 const after={buyer:await balance(buyer.publicKey()),seller:await balance(seller.publicKey()),escrow:await balance(config.contractId)};
 assert.equal(after.seller-before.seller,units);
 assert.equal(before.escrow-after.escrow,10000001n);
 const fee=result.resultXdr.feeCharged;
 assert.equal(after.buyer-before.buyer,10000001n-units-fee);
 const closed=await read(config.contractId,'get',[key]);assert.equal(stateName(closed),'Cancelled');
 await assert.rejects(prepareBuyerSettlement({server,config,id,agreement:closed,proposal}),/disputed/);
 const replay=settlementTransaction(await server.getAccount(buyer.publicKey()),config.contractId,await settlementArgs(id,units));
 const replayTx=TransactionBuilder.cloneFrom(replay).clearOperations().addOperation(Operation.invokeHostFunction({func:replay.operations[0].func,auth:tx.operations[0].auth})).build();
 assert.ok(rpc.Api.isSimulationError(await server.simulateTransaction(replayTx,undefined,'enforce')));
 checks.push('PASS seller '+units+' / refund '+(10000001n-units)+': exact balances, fee-adjusted refund, closed state, replay rejection');
}
await fs.writeFile('public/settlement-evidence.json',JSON.stringify({runAt:new Date().toISOString(),network:'TESTNET',contractId:config.contractId,result:'PASS',checks,receipts,limitations:['Disposable SDK signers; Varial extension signing remains a separate manual check','No real funds; contract unchanged and unaudited']},null,2));console.log('PASS: settlement evidence saved.');

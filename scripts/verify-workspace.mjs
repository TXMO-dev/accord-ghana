import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rpc,Networks,TransactionBuilder,Keypair,Contract,scValToNative} from '@stellar/stellar-sdk';
import {digest,bytes,address,amount} from '../src/values.js';
import {availableActions,stateName,validatePackage} from '../src/workspace-model.js';
const config=JSON.parse(await fs.readFile('public/network.json','utf8')),server=new rpc.Server('https://soroban-testnet.stellar.org'),network=Networks.TESTNET;
const buyer=Keypair.random(),seller=Keypair.random(),receipts=[];
await Promise.all([buyer,seller].map(async k=>{const r=await fetch('https://friendbot.stellar.org/?addr='+k.publicKey());if(!r.ok)throw Error('Friendbot '+r.status)}));
const c=new Contract(config.contractId),id='AC-'+randomUUID(),terms='Deliver one logo concept for testnet verification',key=bytes(await digest(id));
async function send(k,method,args){let tx=new TransactionBuilder(await server.getAccount(k.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(c.call(method,...args)).setTimeout(180).build();tx=await server.prepareTransaction(tx);tx.sign(k);const sent=await server.sendTransaction(tx);if(sent.status==='ERROR')throw Error('Send rejected');for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,1500));const r=await server.getTransaction(sent.hash);if(r.status==='SUCCESS'){receipts.push({action:method,hash:sent.hash});return}if(r.status==='FAILED')throw Error('Transaction failed')}throw Error('Timed out')}
async function read(){const tx=new TransactionBuilder(await server.getAccount(buyer.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(c.call('get',key)).setTimeout(30).build();const r=await server.simulateTransaction(tx);if(r.error)throw Error(r.error);return scValToNative(r.result.retval)}
await send(buyer,'create',[key,address(buyer.publicKey()),address(seller.publicKey()),address(config.assetId),amount('1.0000001'),bytes(await digest(terms))]);
let a=await read();assert.equal(stateName(a),'Draft');assert.deepEqual(availableActions(a,buyer.publicKey()),['fund']);
const imported=validatePackage(JSON.parse(JSON.stringify({version:1,network:'testnet',contract:config.contractId,id,title:'Two-party acceptance check',terms})),config.contractId);assert.deepEqual(Array.from(await digest(imported.terms)),Array.from(a.terms));
await send(buyer,'fund',[key]);a=await read();assert.deepEqual(availableActions(a,seller.publicKey()),['submit','dispute']);
await send(seller,'submit',[key,bytes(await digest('Delivered logo concept'))]);a=await read();assert.deepEqual(availableActions(a,buyer.publicKey()),['release','dispute']);assert.deepEqual(Array.from(a.evidence),Array.from(await digest('Delivered logo concept')));
await send(buyer,'release',[key]);a=await read();assert.equal(stateName(a),'Released');assert.deepEqual(availableActions(a,buyer.publicKey()),[]);assert.equal(a.amount,10000001n);
await fs.writeFile('public/workspace-evidence.json',JSON.stringify({runAt:new Date().toISOString(),contractId:config.contractId,network:'TESTNET',agreementId:id,result:'PASS',checks:['create','export/import terms verification','fund','seller submission','delivery hash verification','client release','role-based workspace actions','exact amount'],receipts,limitations:['SDK-signed disposable accounts; Freighter browser signing not exercised','No real funds']},null,2));console.log('PASS: two-party lifecycle on the existing contract; workspace model verified.');

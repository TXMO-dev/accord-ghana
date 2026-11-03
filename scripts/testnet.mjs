import fs from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {rpc,Networks,TransactionBuilder,Keypair,Operation,Address,Contract,Asset,nativeToScVal,scValToNative} from '@stellar/stellar-sdk';
// Disposable testnet accounts only. Secrets stay in process memory.
const network=Networks.TESTNET,server=new rpc.Server('https://soroban-testnet.stellar.org');
const buyer=Keypair.random(),seller=Keypair.random(),outsider=Keypair.random();
const evidence=[];
async function fund(k){const r=await fetch('https://friendbot.stellar.org/?addr='+k.publicKey());if(!r.ok)throw Error('Friendbot '+r.status)}
await Promise.all([fund(buyer),fund(seller),fund(outsider)]);
async function send(k,op){
 let t=new TransactionBuilder(await server.getAccount(k.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(op).setTimeout(120).build();
 t=await server.prepareTransaction(t);t.sign(k);
 const sent=await server.sendTransaction(t);
 if(sent.status==='ERROR')throw Error('Rejected: '+JSON.stringify(sent));
 for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,1500));const r=await server.getTransaction(sent.hash);if(r.status==='SUCCESS')return {hash:sent.hash,value:r.returnValue?scValToNative(r.returnValue):null};if(r.status==='FAILED')throw Error('Transaction failed '+sent.hash)}
 throw Error('Timed out '+sent.hash);
}
const wasm=await fs.readFile('contracts/target/wasm32v1-none/release/accord_escrow.wasm');
console.log('Uploading contract WASM ('+wasm.length+' bytes)…');
await send(buyer,Operation.uploadContractWasm({wasm}));
const wasmHash=createHash('sha256').update(wasm).digest();
const deployed=await send(buyer,Operation.createCustomContract({address:new Address(buyer.publicKey()),wasmHash,salt:randomBytes(32),constructorArgs:[new Address(Asset.native().contractId(network)).toScVal()]}));
const contractId=deployed.value;
if(typeof contractId!=='string'||!contractId.startsWith('C'))throw Error('Invalid deployment result');
const assetId=Asset.native().contractId(network);
await fs.mkdir('public',{recursive:true});
await fs.writeFile('public/network.json',JSON.stringify({network:'TESTNET',contractId,assetId,deploymentHash:deployed.hash,wasmSha256:wasmHash.toString('hex'),deployedAt:new Date().toISOString()},null,2));
const c=new Contract(contractId),b=nativeToScVal(randomBytes(32),{type:'bytes'}),terms=nativeToScVal(createHash('sha256').update('integration test terms').digest(),{type:'bytes'});
const addr=k=>new Address(k.publicKey()).toScVal();
async function ok(name,k,method,args){const r=await send(k,c.call(method,...args));evidence.push({name,result:'PASS',transaction:r.hash});console.log('PASS '+name);return r}
async function reject(name,k,method,args){let failed=false;let detail='';try{await send(k,c.call(method,...args))}catch(e){if(/simulation|auth|Error\(Contract|HostError|Invocation|not submitted|not funded|not active|Transaction failed/i.test(e.message)){failed=true;detail=e.message}else throw e}if(!failed)throw Error('Unexpected success: '+name);evidence.push({name,result:'PASS (rejected as expected)',detail});console.log('PASS '+name)}
await ok('Wallet registration',buyer,'register',[addr(buyer),nativeToScVal('Integration tester',{type:'string'})]);
await ok('Create milestone',buyer,'create',[b,addr(buyer),addr(seller),new Address(assetId).toScVal(),nativeToScVal(10000000n,{type:'i128'}),terms]);
await reject('Outsider cannot fund',outsider,'fund',[b]);
await ok('Buyer funds milestone',buyer,'fund',[b]);
await reject('Cannot fund twice',buyer,'fund',[b]);
await reject('Cannot release before submission',buyer,'release',[b]);
await ok('Seller submits work',seller,'submit',[b,terms]);
await reject('Seller cannot approve own payment',seller,'release',[b]);
await ok('Buyer releases payment',buyer,'release',[b]);
await reject('Cannot release twice',buyer,'release',[b]);
const d=nativeToScVal(randomBytes(32),{type:'bytes'});
await ok('Create disputed example',buyer,'create',[d,addr(buyer),addr(seller),new Address(assetId).toScVal(),nativeToScVal(10000000n,{type:'i128'}),terms]);
await ok('Fund disputed example',buyer,'fund',[d]);
await ok('Seller raises dispute',seller,'dispute',[d,addr(seller)]);
await reject('Dispute prevents unilateral release',buyer,'release',[d]);
await fs.writeFile('public/test-evidence.json',JSON.stringify({network:'TESTNET',contractId,runAt:new Date().toISOString(),tests:evidence,limitations:['Independent security audit not performed','Mutual settlement requires multi-party authorization tooling','No mainnet funds','Disposable keys intentionally discarded; test balances have no value']},null,2));
console.log('Contract deployed and '+evidence.length+' integration checks completed: '+contractId);

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {rpc,Networks,Keypair,TransactionBuilder,Operation,Contract,Address,Asset,nativeToScVal,scValToNative,SorobanDataBuilder,xdr} from '@stellar/stellar-sdk';

process.on('uncaughtException', error=>{const message=String(error.stack||error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');console.error('::error title=Restoration rehearsal failed::'+message);process.exit(1);});

// Deliberately fixed to the disposable local network. Cannot target public networks.
const server=new rpc.Server('http://127.0.0.1:8000/rpc',{allowHttp:true}),network=Networks.STANDALONE;
let ready=false;
for(let attempt=0;attempt<60;attempt++){try{assert.equal((await server.getNetwork()).passphrase,network);await server.getLatestLedger();ready=true;break;}catch(error){if(attempt===59)throw error;await new Promise(resolve=>setTimeout(resolve,2000));}}
assert.ok(ready,'Local RPC did not become ready');
const buyer=Keypair.random(),seller=Keypair.random(),operator=Keypair.random(),receipts=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const k of [buyer,seller,operator]){
 let funded=false,lastStatus='not ready';
 for(let attempt=0;attempt<60;attempt++){
  try{await server.getAccount(k.publicKey());funded=true;break;}catch{}
  try{const response=await fetch('http://127.0.0.1:8000/friendbot?addr='+k.publicKey(),{signal:AbortSignal.timeout(15000)});lastStatus=String(response.status)+' '+(await response.text()).slice(0,600);}catch(error){lastStatus=error.message;}
  await delay(2000);
 }
 assert.ok(funded,'Local Friendbot failed: '+lastStatus);
}
const addr=a=>new Address(a).toScVal(),val=(v,type)=>nativeToScVal(v,{type});
async function raw(k,op,data){return new TransactionBuilder(await server.getAccount(k.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(op).setTimeout(120).setSorobanData(data||new SorobanDataBuilder().build()).build();}
async function send(k,op,label,data){
 let tx;try{tx=await server.prepareTransaction(await raw(k,op,data));}catch(error){throw new Error(label+': '+error.message,{cause:error});}tx.sign(k);
 const sent=await server.sendTransaction(tx);assert.ok(['PENDING','DUPLICATE'].includes(sent.status),'Submission rejected: '+label+' '+sent.status);
 for(let i=0;i<60;i++){await delay(1000);const result=await server.getTransaction(sent.hash);if(result.status==='SUCCESS'){receipts.push({label,hash:sent.hash,ledger:result.ledger});console.log('PASS '+label);return result;}assert.notEqual(result.status,'FAILED',label+' failed');}
 throw Error('Confirmation timeout: '+label);
}
const wasm=await fs.readFile('work/short-ttl.wasm'),hash=createHash('sha256').update(wasm).digest();
await send(buyer,Operation.uploadContractWasm({wasm}),'upload short-TTL fixture');
const asset=Asset.native().contractId(network);
const deployment=await send(buyer,Operation.createCustomContract({address:new Address(buyer.publicKey()),wasmHash:hash,salt:randomBytes(32),constructorArgs:[addr(asset)]}),'deploy isolated fixture');
const contractId=scValToNative(deployment.returnValue),contract=new Contract(contractId);
const id=randomBytes(32),terms=randomBytes(32),key=val(id,'bytes');
const agreementKey=xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({contract:new Address(contractId).toScAddress(),key:xdr.ScVal.scvVec([val('Agreement','symbol'),key]),durability:xdr.ContractDataDurability.persistent}));
const codeKey=xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({hash}));
await send(operator,Operation.extendFootprintTtl({extendTo:10000}),'extend code and instance',new SorobanDataBuilder().setReadOnly([contract.getFootprint(),codeKey]).build());
await send(buyer,contract.call('create',key,addr(buyer.publicKey()),addr(seller.publicKey()),addr(asset),val(10000000n,'i128'),val(terms,'bytes')),'create');
await send(buyer,contract.call('fund',key),'fund');
async function simulate(method,args=[key]){return server.simulateTransaction(await raw(buyer,contract.call(method,...args)));}
async function readBalance(a){const sim=await server.simulateTransaction(await raw(operator,new Contract(asset).call('balance',addr(a))));assert.ok(rpc.Api.isSimulationSuccess(sim),'Balance simulation failed');return scValToNative(sim.result.retval).toString();}
const balances=async()=>({buyer:await readBalance(buyer.publicKey()),seller:await readBalance(seller.publicKey()),escrow:await readBalance(contractId)});
const initial=await server.getLedgerEntries(agreementKey);assert.equal(initial.entries.length,1);
const beforeXdr=initial.entries[0].val.toXDR('base64'),beforeBalances=await balances();
assert.equal(beforeBalances.escrow,'10000000');
const expires=initial.entries[0].liveUntilLedgerSeq;assert.ok(expires-initial.latestLedger<=100,'Fixture did not use short TTL');
console.log('Waiting for actual expiry at ledger '+expires);
let restoredSimulation,expiredLedger;
for(let i=0;i<240;i++){
 const latest=await server.getLatestLedger();
 if(latest.sequence>expires){
  const sim=await simulate('get');
  if(rpc.Api.isSimulationRestore(sim)){restoredSimulation=sim;expiredLedger=latest.sequence;break;}
 }
 await delay(2000);
}
assert.ok(restoredSimulation,'Did not observe restore preamble after expiry; never treat a live-entry no-op as restoration');
assert.ok(expiredLedger>expires);
await send(operator,Operation.restoreFootprint(),'restore expired agreement',restoredSimulation.restorePreamble.transactionData.build());
const after=await server.getLedgerEntries(agreementKey);assert.equal(after.entries.length,1);
assert.equal(after.entries[0].val.toXDR('base64'),beforeXdr,'Restored agreement changed');
assert.ok(after.entries[0].liveUntilLedgerSeq>after.latestLedger,'Restored TTL is not live');
assert.deepEqual(await balances(),beforeBalances,'Restoration moved escrow/client/freelancer funds');
const ttlBeforeExtension=after.entries[0].liveUntilLedgerSeq;
await send(operator,Operation.extendFootprintTtl({extendTo:10000}),'extend restored agreement',new SorobanDataBuilder().setReadOnly([agreementKey]).build());
const extended=await server.getLedgerEntries(agreementKey);assert.ok(extended.entries[0].liveUntilLedgerSeq>ttlBeforeExtension);
assert.equal(extended.entries[0].val.toXDR('base64'),beforeXdr);
await send(seller,contract.call('submit',key,val(randomBytes(32),'bytes')),'submit after restoration');
const sellerBeforeRelease=await readBalance(seller.publicKey());
await send(buyer,contract.call('release',key),'release after restoration');
const finalBalances=await balances();assert.equal(finalBalances.escrow,'0');assert.equal(BigInt(finalBalances.seller)-BigInt(sellerBeforeRelease),10000000n);
// Seller pays the submit fee, so compare the release delta separately via receipt fee.
const final=await simulate('get');assert.ok(rpc.Api.isSimulationSuccess(final));
assert.equal(scValToNative(final.result.retval).state[0],'Released');
await fs.mkdir('work',{recursive:true});
await fs.writeFile('work/restoration-evidence.json',JSON.stringify({result:'PASS',observedAt:new Date().toISOString(),network:'LOCAL_STANDALONE',contractId,fixtureWasmSha256:hash.toString('hex'),expiryLedger:expires,observedExpiredLedger:expiredLedger,beforeBalances,finalBalances,restoredValueUnchanged:true,restorationBalancesUnchanged:true,ttlAfterRestore:after.entries[0].liveUntilLedgerSeq,ttlAfterExtension:extended.entries[0].liveUntilLedgerSeq,receipts,limitations:['Isolated local network, not public Testnet or Mainnet','Fixture replaces only TTL constants: threshold 32, extension 96','A real restore preamble after observed expiry is required; no-op restoration cannot pass','No wallet extension signing or independent audit']},null,2));
console.log('PASS: expired agreement restored byte-for-byte, balances unchanged, TTL extended and release completed.');

console.log('::notice title=Restoration evidence::'+(await fs.readFile('work/restoration-evidence.json','utf8')).replaceAll('%','%25').replaceAll('\n','%0A'));

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {rpc,Networks,Keypair,TransactionBuilder,Operation,Contract,Address,Asset,nativeToScVal,scValToNative,SorobanDataBuilder,xdr} from '@stellar/stellar-sdk';
const mode=process.argv[2]; assert.ok(['setup','resume','status'].includes(mode),'Use setup, status or resume');
const dir='.testnet-restoration',stateFile=dir+'/state.json';
await fs.mkdir(dir,{recursive:true});
const server=new rpc.Server('https://soroban-testnet.stellar.org'),network=Networks.TESTNET;
assert.equal((await server.getNetwork()).passphrase,network);
const settingsKey=xdr.LedgerKey.configSetting(new xdr.LedgerKeyConfigSetting({configSettingId:xdr.ConfigSettingId.configSettingStateArchival}));
const settings=(await server.getLedgerEntries(settingsKey)).entries[0].val.configSetting.stateArchivalSettings;
const minimumTtl=settings.minPersistentTtl;
let saved;try{saved=JSON.parse(await fs.readFile(stateFile,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
if(mode==='setup')assert.ok(!saved,'A rehearsal already exists. Use status or resume.');
else {assert.ok(saved,'Run setup first.');assert.equal(saved.network,'TESTNET','Checkpoint is not Testnet');}
const buyer=saved?Keypair.fromSecret(saved.buyerSecret):Keypair.random(),seller=saved?Keypair.fromSecret(saved.sellerSecret):Keypair.random(),operator=saved?Keypair.fromSecret(saved.operatorSecret):Keypair.random();
const receipts=saved?.receipts||[],delay=ms=>new Promise(r=>setTimeout(r,ms));
if(mode==='setup')for(const k of [buyer,seller,operator]){const r=await fetch('https://friendbot.stellar.org/?addr='+k.publicKey(),{signal:AbortSignal.timeout(30000)});assert.ok(r.ok,'Friendbot failed');}
const addr=a=>new Address(a).toScVal(),val=(v,type)=>nativeToScVal(v,{type});
async function raw(k,op,data){return new TransactionBuilder(await server.getAccount(k.publicKey()),{fee:'10000',networkPassphrase:network}).addOperation(op).setTimeout(120).setSorobanData(data||new SorobanDataBuilder().build()).build();}
async function send(k,op,label,data){
 let tx;try{tx=await server.prepareTransaction(await raw(k,op,data));}catch(error){throw new Error(label+': '+error.message,{cause:error});}tx.sign(k);
 const sent=await server.sendTransaction(tx);assert.ok(['PENDING','DUPLICATE'].includes(sent.status),'Submission rejected: '+label+' '+sent.status);
 for(let i=0;i<60;i++){await delay(1000);const result=await server.getTransaction(sent.hash);if(result.status==='SUCCESS'){receipts.push({label,hash:sent.hash,ledger:result.ledger});console.log('PASS '+label);return result;}assert.notEqual(result.status,'FAILED',label+' failed');}
 throw Error('Confirmation timeout: '+label);
}

if(mode==='setup'){
const wasm=await fs.readFile('.testnet-restoration/short-ttl.wasm'),hash=createHash('sha256').update(wasm).digest();
await send(buyer,Operation.uploadContractWasm({wasm}),'upload short-TTL fixture');
const asset=Asset.native().contractId(network);
// Native asset contract already exists on public Testnet.
await send(operator,Operation.extendFootprintTtl({extendTo:1_000_000}),'extend native asset instance',new SorobanDataBuilder().setReadOnly([new Contract(asset).getFootprint()]).build());
const deployment=await send(buyer,Operation.createCustomContract({address:new Address(buyer.publicKey()),wasmHash:hash,salt:randomBytes(32),constructorArgs:[addr(asset)]}),'deploy isolated fixture');
const contractId=scValToNative(deployment.returnValue),contract=new Contract(contractId);
const id=randomBytes(32),terms=randomBytes(32),key=val(id,'bytes');
const agreementKey=xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({contract:new Address(contractId).toScAddress(),key:xdr.ScVal.scvVec([val('Agreement','symbol'),key]),durability:xdr.ContractDataDurability.persistent}));
const codeKey=xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({hash}));
await send(operator,Operation.extendFootprintTtl({extendTo:1_000_000}),'extend code and instance',new SorobanDataBuilder().setReadOnly([contract.getFootprint(),codeKey]).build());
await send(buyer,contract.call('create',key,addr(buyer.publicKey()),addr(seller.publicKey()),addr(asset),val(10000000n,'i128'),val(terms,'bytes')),'create');
await send(buyer,contract.call('fund',key),'fund');
async function simulate(method,args=[key]){return server.simulateTransaction(await raw(buyer,contract.call(method,...args)));}
async function readBalance(a){const sim=await server.simulateTransaction(await raw(operator,new Contract(asset).call('balance',addr(a))));assert.ok(rpc.Api.isSimulationSuccess(sim),'Balance simulation failed');return scValToNative(sim.result.retval).toString();}
const balances=async()=>({buyer:await readBalance(buyer.publicKey()),seller:await readBalance(seller.publicKey()),escrow:await readBalance(contractId)});

const initial=await server.getLedgerEntries(agreementKey);assert.equal(initial.entries.length,1);
const beforeXdr=initial.entries[0].val.toXDR('base64'),beforeBalances=await balances();
assert.equal(beforeBalances.escrow,'10000000');
const expires=initial.entries[0].liveUntilLedgerSeq;assert.ok(expires-initial.latestLedger<=minimumTtl+100,'Unexpected fixture TTL');

const state={network:'TESTNET',contractId,fixtureWasmSha256:hash.toString('hex'),agreementId:id.toString('hex'),agreementKey:agreementKey.toXDR('base64'),beforeXdr,beforeBalances,expires,minimumTtl,receipts,buyerSecret:buyer.secret(),sellerSecret:seller.secret(),operatorSecret:operator.secret()};
await fs.writeFile(stateFile,JSON.stringify(state,null,2),{mode:0o600});
await fs.writeFile(dir+'/status.json',JSON.stringify({result:'WAITING_FOR_EXPIRY',network:'TESTNET',contractId,fixtureWasmSha256:state.fixtureWasmSha256,expiryLedger:expires,observedLedger:initial.latestLedger,minimumPersistentTtl:minimumTtl,buyer:buyer.publicKey(),seller:seller.publicKey(),receipts,limitations:['Isolated TTL-only fixture; not the production demo contract','Not a restoration pass until expiry and restoration are verified','Disposable Testnet assets only']},null,2));
console.log('SETUP COMPLETE: expiry ledger '+expires+'; current ledger '+initial.latestLedger+'. Run status later.');
process.exit(0);
}

const contractId=saved.contractId,contract=new Contract(contractId),asset=Asset.native().contractId(network),id=Buffer.from(saved.agreementId,'hex'),key=val(id,'bytes'),agreementKey=xdr.LedgerKey.fromXDR(saved.agreementKey,'base64'),beforeXdr=saved.beforeXdr,beforeBalances=saved.beforeBalances,expires=saved.expires;
const latest=await server.getLatestLedger();
if(mode==='status'||latest.sequence<=expires){console.log(JSON.stringify({result:latest.sequence>expires?'READY_TO_CHECK_ARCHIVAL':'WAITING_FOR_EXPIRY',expiryLedger:expires,currentLedger:latest.sequence,remainingLedgers:Math.max(0,expires-latest.sequence+1)},null,2));process.exit(0);}
async function simulate(method,args=[key]){return server.simulateTransaction(await raw(buyer,contract.call(method,...args)));}
async function readBalance(a){const sim=await server.simulateTransaction(await raw(operator,new Contract(asset).call('balance',addr(a))));assert.ok(rpc.Api.isSimulationSuccess(sim),'Balance simulation failed');return scValToNative(sim.result.retval).toString();}
const balances=async()=>({buyer:await readBalance(buyer.publicKey()),seller:await readBalance(seller.publicKey()),escrow:await readBalance(contractId)});
let restoredSimulation,expiredLedger;
for(let i=0;i<1;i++){
 const latest=await server.getLatestLedger();
 if(latest.sequence>expires){
  const sim=await simulate('get');
  if(rpc.Api.isSimulationRestore(sim)){restoredSimulation=sim;expiredLedger=latest.sequence;break;}
  if(rpc.Api.isSimulationSuccess(sim)){
   const data=sim.transactionData.build();
   const indices=data.ext.type==='resourceExt'?data.ext.resourceExt.archivedSorobanEntries:[];
   const agreementArchived=indices.some(index=>data.resources.footprint.readWrite[index]?.toXDR('base64')===agreementKey.toXDR('base64'));
   if(agreementArchived||rpc.Api.isSimulationRestore(sim)){restoredSimulation=sim;expiredLedger=latest.sequence;break;}
  }
 }
 await delay(2000);
}
assert.ok(restoredSimulation,'Did not observe archived agreement footprint after expiry; never treat a live-entry no-op as restoration');
assert.ok(expiredLedger>expires);
await send(operator,Operation.restoreFootprint(),'restore expired agreement',new SorobanDataBuilder().setReadWrite([agreementKey]).build());
const after=await server.getLedgerEntries(agreementKey);assert.equal(after.entries.length,1);
assert.equal(after.entries[0].val.toXDR('base64'),beforeXdr,'Restored agreement changed');
assert.ok(after.entries[0].liveUntilLedgerSeq>after.latestLedger,'Restored TTL is not live');
assert.deepEqual(await balances(),beforeBalances,'Restoration moved escrow/client/freelancer funds');
const ttlBeforeExtension=after.entries[0].liveUntilLedgerSeq;
await send(operator,Operation.extendFootprintTtl({extendTo:1_000_000}),'extend restored agreement',new SorobanDataBuilder().setReadOnly([agreementKey]).build());
const extended=await server.getLedgerEntries(agreementKey);assert.ok(extended.entries[0].liveUntilLedgerSeq>ttlBeforeExtension);
assert.equal(extended.entries[0].val.toXDR('base64'),beforeXdr);
await send(seller,contract.call('submit',key,val(randomBytes(32),'bytes')),'submit after restoration');
const sellerBeforeRelease=await readBalance(seller.publicKey());
await send(buyer,contract.call('release',key),'release after restoration');
const finalBalances=await balances();assert.equal(finalBalances.escrow,'0');assert.equal(BigInt(finalBalances.seller)-BigInt(sellerBeforeRelease),10000000n);
// Seller pays the submit fee, so compare the release delta separately via receipt fee.
const final=await simulate('get');assert.ok(rpc.Api.isSimulationSuccess(final));
assert.equal(scValToNative(final.result.retval).state[0],'Released');

const report={result:'PASS',network:'TESTNET',contractId,fixtureWasmSha256:saved.fixtureWasmSha256,observedAt:new Date().toISOString(),expiryLedger:expires,observedExpiredLedger:expiredLedger,restoredValueUnchanged:true,restorationBalancesUnchanged:true,beforeBalances,finalBalances,receipts,limitations:['Isolated TTL-only fixture, not demo contract','SDK-signed disposable wallets; not Varial signing','No independent audit']};
await fs.writeFile(dir+'/evidence.json',JSON.stringify(report,null,2));
console.log('PASS: public Testnet restoration and post-restoration release.');

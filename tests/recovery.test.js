import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingMetadata,recoveryOutcome,recoveryEvent} from '../src/recovery-model.js';
import {submitTrackedTransaction} from '../src/transaction-submit.js';
const hash='a'.repeat(64);
const info={hash,firstLedger:100,maxTime:1000,action:'settle'};
const missing={status:'NOT_FOUND',txHash:hash,oldestLedger:80,latestLedger:140,latestLedgerCloseTime:1001};

test('reload preserves the action and recovery bounds without unrelated fields',()=>{
 assert.deepEqual(pendingMetadata(hash,JSON.parse(JSON.stringify({...info,secret:'discard'}))),info);
 assert.equal(recoveryEvent(hash,info,'SUCCESS','2026-11-03T12:00:00Z').action,'settle');
});
test('not found unlocks only after signed expiry and with complete retained history',()=>{
 assert.equal(recoveryOutcome(hash,info,missing),'EXPIRED');
 assert.equal(recoveryOutcome(hash,info,{...missing,latestLedgerCloseTime:1000}),'PENDING');
 assert.equal(recoveryOutcome(hash,info,{...missing,latestLedger:100}),'PENDING');
 assert.equal(recoveryOutcome(hash,info,{...missing,oldestLedger:100}),'EXPIRED');
});
test('missing retained history never allows a retry',()=>{
 assert.equal(recoveryOutcome(hash,info,{...missing,oldestLedger:101}),'HISTORY_UNAVAILABLE');
 assert.equal(recoveryEvent(hash,info,'HISTORY_UNAVAILABLE'),null);
});
test('legacy hash-only records and malformed metadata remain locked',()=>{
 for(const details of [null,{}, {...info,hash:'b'.repeat(64)},{...info,maxTime:0},{...info,firstLedger:-1}])
  assert.equal(recoveryOutcome(hash,details,missing),'PENDING');
 for(const result of [{status:'NOT_FOUND'},{...missing,latestLedgerCloseTime:'bad'},{...missing,oldestLedger:0},{...missing,latestLedger:79}])
  assert.equal(recoveryOutcome(hash,info,result),'PENDING');
});
test('confirmed success and failed receipts remain definitive regardless of expiry',()=>{
 for(const status of ['SUCCESS','FAILED']) assert.equal(recoveryOutcome(hash,null,{...missing,status}),status);
 assert.equal(recoveryEvent(hash,info,'FAILED').action,'FAILED');
 assert.equal(recoveryEvent(hash,info,'EXPIRED').action,'EXPIRED');
 assert.equal(recoveryEvent(hash,null,'SUCCESS').action,'SUCCESS');
});
test('an unrelated RPC response or invalid hash is refused',()=>{
 assert.throws(()=>recoveryOutcome(hash,info,{...missing,txHash:'b'.repeat(64)}),/different/);
 assert.throws(()=>recoveryOutcome('not-a-hash',info,missing),/invalid/);
});

function fixture(overrides={}) {
 const calls=[], transaction={timeBounds:{maxTime:'1000'}};
 const server={getLatestLedger:async()=>({sequence:100}),sendTransaction:async tx=>{calls.push(['send',tx]);return {status:'PENDING',hash}},
  getTransaction:async h=>{calls.push(['poll',h]);return {status:'SUCCESS',txHash:hash}},...overrides};
 const run=extra=>submitTrackedTransaction({server,transaction,hash,wait:async()=>{},polls:2,
  onSubmitted:async(h,meta)=>{calls.push(['track',h,meta])},...extra});
 return {calls,transaction,run};
}
test('durable recovery reference precedes broadcast and polls the original hash',async()=>{
 const f=fixture();const result=await f.run();
 assert.equal(result.hash,hash);assert.deepEqual(f.calls[0],['track',hash,{hash,firstLedger:100,maxTime:1000}]);
 assert.deepEqual(f.calls[1],['send',f.transaction]);assert.deepEqual(f.calls[2],['poll',hash]);
});
test('storage failure prevents broadcast',async()=>{
 const f=fixture();await assert.rejects(f.run({onSubmitted:()=>{throw Error('storage unavailable')}}),/storage/);
 assert.deepEqual(f.calls,[]);
});
test('network failure after tracking retains the reference for refresh',async()=>{
 const f=fixture({sendTransaction:async()=>{throw Error('connection lost')}});
 await assert.rejects(f.run(),/connection lost/);assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'track');
});
test('queue retries reuse the exact signed envelope, never create a second payment',async()=>{
 const sent=[];const f=fixture({sendTransaction:async tx=>{sent.push(tx);return {status:sent.length<3?'TRY_AGAIN_LATER':'DUPLICATE',hash}}});
 await f.run();assert.equal(sent.length,3);assert.ok(sent.every(tx=>tx===f.transaction));
 assert.equal(f.calls.filter(c=>c[0]==='track').length,1);
});
test('persistent queue pressure and rejected submissions preserve pending tracking',async()=>{
 for(const status of ['TRY_AGAIN_LATER','ERROR']){
  const f=fixture({sendTransaction:async()=>({status,hash})});
  await assert.rejects(f.run(),/did not confirm acceptance/);assert.equal(f.calls[0][0],'track');
 }
});
test('poll timeout does not erase the recovery reference',async()=>{
 const f=fixture({getTransaction:async()=>({status:'NOT_FOUND'})});
 await assert.rejects(f.run(),/reference is saved/);assert.equal(f.calls[0][0],'track');
});
test('on-chain failure is not reported as success',async()=>{
 const f=fixture({getTransaction:async()=>({status:'FAILED',txHash:hash})});
 await assert.rejects(f.run(),/failed on chain/);
});
test('unbounded transactions and invalid recovery ledger never broadcast',async()=>{
 const f=fixture();f.transaction.timeBounds.maxTime='0';await assert.rejects(f.run(),/Nothing was submitted/);assert.deepEqual(f.calls,[]);
 const bad=fixture({getLatestLedger:async()=>({sequence:0})});await assert.rejects(bad.run(),/Nothing was submitted/);assert.deepEqual(bad.calls,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {xdr} from '@stellar/stellar-sdk';
import {monitoringKeys,ttlReport} from '../src/ttl-model.js';
const config=JSON.parse(fs.readFileSync(new URL('../public/network.json',import.meta.url),'utf8'));
test('monitor keys distinguish instance, code and hashed persistent agreement keys',async()=>{
 const keys=await monitoringKeys(config,['AC-test','AC-test']);assert.equal(keys.length,3);
 assert.equal(new Set(keys.map(k=>k.key.toXDR('base64'))).size,3);
 assert.equal(keys[2].key.contractData.durability,xdr.ContractDataDurability.persistent);
});
test('monitor refuses mainnet, invalid identities and unbounded agreement lists',async()=>{
 await assert.rejects(monitoringKeys({...config,network:'MAINNET'}));
 await assert.rejects(monitoringKeys({...config,wasmSha256:'bad'}));
 await assert.rejects(monitoringKeys(config,['not-an-agreement']));
 await assert.rejects(monitoringKeys(config,Array(199).fill('AC-test')));
});
test('TTL threshold, expiry boundary and missing metadata are distinct',async()=>{
 const keys=await monitoringKeys(config),key=keys[0].key;
 for(const [ttl,status,remaining] of [[201,'OK',101],[200,'WARNING',100],[100,'WARNING',0],[99,'EXPIRED',0],[0,'EXPIRED',0],[undefined,'UNKNOWN',null]]){
  const result=ttlReport(keys,{latestLedger:100,entries:[{key,liveUntilLedgerSeq:ttl}]},100);
  assert.equal(result[0].status,status);assert.equal(result[0].remainingLedgers,remaining);assert.equal(result[1].status,'MISSING');
 }
});
test('ledger entries are matched by key rather than response order',async()=>{
 const keys=await monitoringKeys(config),result=ttlReport(keys,{latestLedger:100,entries:[{key:keys[1].key,liveUntilLedgerSeq:300},{key:keys[0].key,liveUntilLedgerSeq:150}]},100);
 assert.equal(result[0].status,'WARNING');assert.equal(result[1].status,'OK');
});
test('invalid ledger metadata and duplicate responses fail closed',async()=>{
 const keys=await monitoringKeys(config),entry={key:keys[0].key,liveUntilLedgerSeq:300};
 assert.throws(()=>ttlReport(keys,{latestLedger:0,entries:[]}));
 assert.throws(()=>ttlReport(keys,{latestLedger:100,entries:[entry,entry]}));
 assert.throws(()=>ttlReport(keys,{latestLedger:100,entries:[]},-1));
});

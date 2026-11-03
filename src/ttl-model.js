import {Address, Contract, nativeToScVal, xdr} from '@stellar/stellar-sdk';
import {digest, validateContract} from './values.js';

export async function monitoringKeys(config, agreementIds=[]) {
  validateContract(config.contractId);
  if(config.network!=='TESTNET'||!/^[a-f0-9]{64}$/i.test(config.wasmSha256||'')) throw Error('A verified Testnet deployment and WASM hash are required.');
  if(!Array.isArray(agreementIds)||agreementIds.length>198||agreementIds.some(id=>typeof id!=='string'||!/^AC-[a-z0-9-]{1,100}$/i.test(id)))
    throw Error('Provide at most 198 valid Accord agreement IDs.');
  const keys=[
    {label:'Contract instance',kind:'instance',key:new Contract(config.contractId).getFootprint()},
    {label:'Contract WASM',kind:'code',key:xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({hash:Uint8Array.from(config.wasmSha256.match(/../g),n=>parseInt(n,16))}))},
  ];
  for(const id of [...new Set(agreementIds)]) keys.push({label:id,kind:'agreement',key:xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
    contract:Address.fromString(config.contractId).toScAddress(),
    key:xdr.ScVal.scvVec([nativeToScVal('Agreement',{type:'symbol'}),xdr.ScVal.scvBytes(await digest(id))]),
    durability:xdr.ContractDataDurability.persistent,
  }))});
  return keys;
}

export function ttlReport(requests,response,warningLedgers=100_000) {
  if(!Number.isSafeInteger(warningLedgers)||warningLedgers<1)throw Error('Warning threshold must be a positive ledger count.');
  if(!Number.isSafeInteger(response?.latestLedger)||response.latestLedger<1||!Array.isArray(response.entries))throw Error('Invalid ledger-entry response.');
  const expected=new Set(requests.map(r=>r.key.toXDR('base64'))),entries=new Map();
  for(const entry of response.entries){
    const key=entry.key.toXDR('base64');
    if(!expected.has(key)||entries.has(key))throw Error('RPC returned an unexpected or duplicate ledger entry.');
    entries.set(key,entry);
  }
  return requests.map(r=>{
    const entry=entries.get(r.key.toXDR('base64')),ttl=entry?.liveUntilLedgerSeq;
    let status='MISSING',remainingLedgers=null;
    if(entry){
      if(!Number.isSafeInteger(ttl)||ttl<0)status='UNKNOWN';
      else {remainingLedgers=Math.max(0,ttl-response.latestLedger);status=ttl<response.latestLedger?'EXPIRED':remainingLedgers<=warningLedgers?'WARNING':'OK';}
    }
    return {label:r.label,kind:r.kind,status,liveUntilLedger:ttl??null,remainingLedgers,ledgerKey:r.key.toXDR('base64')};
  });
}

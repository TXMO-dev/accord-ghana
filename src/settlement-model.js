import {Address, Keypair, Networks, StrKey, buildAuthorizationEntryPreimage, hash, nativeToScVal, scValToNative, xdr} from '@stellar/stellar-sdk';
import {digest, bytes, transactionHashHex} from './values.js';
import {stateName} from './workspace-model.js';

export const SETTLEMENT_WINDOW = 120; // ledger-based, not a wall-clock guarantee
const fail = message => {throw Error(message)};
export function splitUnits(value, total) {
  if(typeof value!=='string'||value.length>30||!/^\d+(\.\d{1,7})?$/.test(value))fail('Use a non-negative amount with at most 7 decimal places.');
  const [whole,fraction='']=value.split('.');
  const seller=BigInt(whole)*10000000n+BigInt(fraction.padEnd(7,'0'));
  if(seller>BigInt(total))fail('Freelancer payment cannot exceed the escrow amount.');
  return {seller,buyer:BigInt(total)-seller};
}
export function settlementSnapshot(a) {
  return {buyer:a.buyer,seller:a.seller,asset:a.asset,total:String(a.amount),terms:transactionHashHex(a.terms),state:stateName(a),evidence:a.evidence?transactionHashHex(a.evidence):null};
}
export function assertDisputed(a,asset) {
  if(stateName(a)!=='Disputed')fail('Refresh: settlement requires a disputed milestone.');
  if(a.asset!==asset||BigInt(a.amount)<=0n||a.buyer===a.seller||![a.buyer,a.seller].every(StrKey.isValidEd25519PublicKey))fail('Unsupported agreement or asset.');
}
export async function settlementArgs(id,sellerUnits) {
  return [bytes(await digest(id)),nativeToScVal(BigInt(sellerUnits),{type:'i128'})];
}
export function validateInvocation(entry,contract,args) {
  const root=entry.rootInvocation, fn=root.function;
  if(fn.type!=='sorobanAuthorizedFunctionTypeContractFn'||root.subInvocations.length!==0)fail('Unexpected settlement authorization tree.');
  const call=fn.value;
  if(Address.fromScAddress(call.contractAddress).toString()!==contract||call.functionName.toString()!=='settle'||call.args.length!==2||call.args.some((v,i)=>v.toXdr('base64')!==args[i].toXdr('base64')))fail('Authorization does not match this settlement.');
}
export function sellerCredentials(entry,seller) {
  if(!['sorobanCredentialsAddress','sorobanCredentialsAddressV2'].includes(entry.credentials.type))fail('Unsupported settlement credential.');
  const c=entry.credentials.value;
  if(Address.fromScAddress(c.address).toString()!==seller)fail('Authorization belongs to another freelancer.');
  return c;
}
export function verifySellerSignature(entry,seller) {
  const c=sellerCredentials(entry,seller), signatures=scValToNative(c.signature);
  if(!Array.isArray(signatures)||signatures.length!==1)fail('Exactly one freelancer signature is required.');
  const sig=signatures[0];
  if(!(sig.public_key instanceof Uint8Array)||transactionHashHex(sig.public_key)!==transactionHashHex(StrKey.decodeEd25519PublicKey(seller))||!(sig.signature instanceof Uint8Array))fail('Unsupported signing key. Use a standard single-key test wallet.');
  const payload=hash(buildAuthorizationEntryPreimage(entry,c.signatureExpirationLedger,Networks.TESTNET).toXdr());
  if(!Keypair.fromPublicKey(seller).verify(payload,sig.signature))fail('Freelancer signature is invalid for this Testnet settlement.');
}
export async function validateSettlement(p,{config,id,agreement,ledger}) {
  if(!p||p.version!==1||p.kind!=='accord-settlement'||p.network!=='testnet'||p.contract!==config.contractId||p.id!==id)fail('Wrong agreement, network or contract in settlement file.');
  assertDisputed(agreement,config.assetId);
  const snapshot=settlementSnapshot(agreement);
  if(!p.snapshot||Object.keys(snapshot).some(k=>p.snapshot[k]!==snapshot[k]))fail('Settlement is stale. The agreement changed; request a new proposal.');
  if(typeof p.sellerUnits!=='string'||!/^\d{1,20}$/.test(p.sellerUnits)||BigInt(p.sellerUnits)>BigInt(agreement.amount))fail('Invalid settlement split.');
  if(!Number.isInteger(p.expiresLedger)||p.expiresLedger<=ledger||p.expiresLedger>ledger+SETTLEMENT_WINDOW)fail('Settlement expired or has an unsupported expiry. Request a fresh proposal.');
  if(typeof p.authorization!=='string'||p.authorization.length>16000)fail('Invalid authorization file.');
  let entry;try{entry=xdr.SorobanAuthorizationEntry.fromXdr(p.authorization,'base64')}catch{fail('Invalid authorization encoding.')}
  const args=await settlementArgs(id,p.sellerUnits);
  validateInvocation(entry,config.contractId,args);
  const credentials=sellerCredentials(entry,agreement.seller);
  if(credentials.signatureExpirationLedger!==p.expiresLedger)fail('Expiry does not match the signed authorization.');
  verifySellerSignature(entry,agreement.seller);
  return {entry,args,seller:BigInt(p.sellerUnits),buyer:BigInt(agreement.amount)-BigInt(p.sellerUnits)};
}

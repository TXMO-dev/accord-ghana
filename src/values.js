import {StrKey,nativeToScVal,Address,Networks} from '@stellar/stellar-sdk';
export const NETWORK=Networks.TESTNET;
export function validateContract(id) { if(!StrKey.isValidContract(id)) throw Error('Enter a valid Stellar contract address.'); return id; }
export async function digest(text) { return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))); }
export const bytes = value => nativeToScVal(value,{type:'bytes'});
export const address = value => new Address(value).toScVal();
export const amount = value => {
  if(!/^\d+(\.\d{1,7})?$/.test(value)) throw Error('Use a positive amount with at most 7 decimal places.');
  const [whole, fraction=''] = value.split('.');
  const units = BigInt(whole)*10000000n+BigInt(fraction.padEnd(7,'0'));
  if(units<=0n || units>1000000000000n) throw Error('Amount must be between 0 and 100,000 test XLM.');
  return nativeToScVal(units,{type:'i128'});
};

export const transactionHashHex = hash => Array.from(hash, byte=>byte.toString(16).padStart(2,'0')).join('');

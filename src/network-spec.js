import {Networks} from '@stellar/stellar-sdk';
export function networkSpec(name='TESTNET'){
 if(name==='TESTNET')return {name,slug:'testnet',label:'Testnet',passphrase:Networks.TESTNET};
 if(name==='MAINNET')return {name,slug:'public',label:'Mainnet',passphrase:Networks.PUBLIC};
 throw Error('Unsupported Stellar network.');
}
export function settlementNetwork(config){return networkSpec(config.network??'TESTNET');}

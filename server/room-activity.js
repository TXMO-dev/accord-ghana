import {networkSpec} from '../src/network-spec.js';
import {Address,Networks,TransactionBuilder,scValToNative} from '@stellar/stellar-sdk';
import {sha} from './room-auth.js';
const labels={fund:'funded the milestone',submit:'submitted delivery',release:'released the payment',dispute:'raised a dispute',settle:'completed the settlement'};
export function verifiedActivity(receipt,{hash,wallet,contract,id,network='TESTNET'}){
 if(receipt.status!=='SUCCESS')throw Error('Transaction is not confirmed.');
 const tx=TransactionBuilder.fromXDR(receipt.envelopeXdr,networkSpec(network).passphrase);
 if(tx.hash().toString('hex')!==hash||tx.source!==wallet||tx.operations.length!==1)throw Error('Transaction does not match this participant.');
 const op=tx.operations[0];
 if(op.type!=='invokeHostFunction'||op.func.type!=='hostFunctionTypeInvokeContract')throw Error('Not an agreement action.');
 const call=op.func.value,action=call.functionName.toString();
 if(!labels[action]||Address.fromScAddress(call.contractAddress).toString()!==contract||!call.args.length||Buffer.from(scValToNative(call.args[0])).toString('hex')!==sha(id))throw Error('Transaction belongs to a different agreement.');
 return {hash,wallet,action,label:labels[action]};
}

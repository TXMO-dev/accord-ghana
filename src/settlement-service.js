import {settlementNetwork} from './network-spec.js';
import {Contract,Networks,Operation,TransactionBuilder,rpc} from '@stellar/stellar-sdk';
import {SETTLEMENT_WINDOW,assertDisputed,settlementArgs,settlementSnapshot,validateInvocation,sellerCredentials,validateSettlement} from './settlement-model.js';

function simulationResult(sim) {
  if(!rpc.Api.isSimulationSuccess(sim)||rpc.Api.isSimulationRestore(sim))throw Error('Settlement simulation failed. Refresh the agreement; expired contract data may need restoration.');
  return sim;
}
export function settlementTransaction(source,contract,args,network=Networks.TESTNET) {
  const op=new Contract(contract).call('settle',...args);
  return new TransactionBuilder(source,{fee:'10000',networkPassphrase:network}).addOperation(op).setTimeout(180).build();
}
export async function prepareSellerOffer({server,config,id,agreement,sellerUnits,sign}) {
  assertDisputed(agreement,config.assetId);
  const args=await settlementArgs(id,sellerUnits);
  const tx=settlementTransaction(await server.getAccount(agreement.buyer),config.contractId,args,settlementNetwork(config).passphrase);
  const sim=simulationResult(await server.simulateTransaction(tx));
  const auth=sim.result.auth;
  if(auth.length!==2)throw Error('Unexpected settlement signers.');
  auth.forEach(entry=>validateInvocation(entry,config.contractId,args));
  if(auth.filter(e=>e.credentials.type==='sorobanCredentialsSourceAccount').length!==1)throw Error('Client authorization missing.');
  const entry=auth.find(e=>e.credentials.type!=='sorobanCredentialsSourceAccount');
  sellerCredentials(entry,agreement.seller);
  const expiresLedger=(await server.getLatestLedger()).sequence+SETTLEMENT_WINDOW;
  const signed=await sign(entry,expiresLedger);
  const proposal={version:1,kind:'accord-settlement',network:settlementNetwork(config).name.toLowerCase(),contract:config.contractId,id,snapshot:settlementSnapshot(agreement),sellerUnits:String(sellerUnits),expiresLedger,authorization:signed.toXdr('base64')};
  await validateSettlement(proposal,{config,id,agreement,ledger:(await server.getLatestLedger()).sequence});
  return proposal;
}
export async function prepareBuyerSettlement({server,config,id,agreement,proposal}) {
  const checked=await validateSettlement(proposal,{config,id,agreement,ledger:(await server.getLatestLedger()).sequence});
  const raw=settlementTransaction(await server.getAccount(agreement.buyer),config.contractId,checked.args,settlementNetwork(config).passphrase);
  const sim=simulationResult(await server.simulateTransaction(raw));
  sim.result.auth.forEach(e=>validateInvocation(e,config.contractId,checked.args));
  if(sim.result.auth.length!==2||sim.result.auth.filter(e=>e.credentials.type==='sorobanCredentialsSourceAccount').length!==1)throw Error('Unexpected settlement signers.');
  const auth=sim.result.auth.map(e=>e.credentials.type==='sorobanCredentialsSourceAccount'?e:checked.entry);
  const tx=TransactionBuilder.cloneFrom(raw).clearOperations().addOperation(Operation.invokeHostFunction({func:raw.operations[0].func,auth})).build();
  const enforced=simulationResult(await server.simulateTransaction(tx,undefined,'enforce'));
  return rpc.assembleTransaction(tx,enforced).build();
}

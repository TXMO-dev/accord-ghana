import fs from 'node:fs/promises';
import {rpc, Networks} from '@stellar/stellar-sdk';
import {monitoringKeys,ttlReport} from '../src/ttl-model.js';

const args=process.argv.slice(2),ids=[];let output=null,warningLedgers=100_000;
for(let i=0;i<args.length;i++){
  if(args[i]==='--agreement')ids.push(args[++i]);
  else if(args[i]==='--out'){output=args[++i];if(!output)throw Error('--out requires a filename');}
  else if(args[i]==='--warning-ledgers')warningLedgers=Number(args[++i]);
  else throw Error('Usage: npm run monitor:ttl -- [--agreement AC-…] [--out report.json] [--warning-ledgers 100000]');
}
const config=JSON.parse(await fs.readFile(new URL('../public/network.json',import.meta.url),'utf8'));
const rpcUrl='https://soroban-testnet.stellar.org',server=new rpc.Server(rpcUrl);
try{
  const network=await server.getNetwork();if(network.passphrase!==Networks.TESTNET)throw Error('RPC is not Stellar Testnet.');
  const requests=await monitoringKeys(config,ids),response=await server.getLedgerEntries(...requests.map(r=>r.key));
  const entries=ttlReport(requests,response,warningLedgers);
  const instance=response.entries.find(e=>e.key.toXDR('base64')===requests[0].key.toXDR('base64'));
  let wasmMatches=null;
  if(instance){
    const executable=instance.val.contractData.val.instance.executable;
    wasmMatches=executable.type==='contractExecutableWasm'&&executable.wasmHash.toString()===config.wasmSha256.toLowerCase();
  }
  const status=wasmMatches===false?'IDENTITY_MISMATCH':entries.every(e=>e.status==='OK')?'OK':'ATTENTION';
  const report={observedAt:new Date().toISOString(),network:'TESTNET',rpc:rpcUrl,contractId:config.contractId,wasmSha256:config.wasmSha256,
    wasmMatches,latestLedger:response.latestLedger,warningLedgers,status,entries,
    limitations:['Read-only snapshot; not a scheduled alert service.','Only explicitly supplied agreements are monitored; this does not discover all contract records.','MISSING does not distinguish archived, never-created or reset-network state.','No restoration or TTL extension transaction was submitted.','Remaining ledgers are exact at the observed ledger; wall-clock expiry varies with network cadence.']};
  if(output)await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));process.exitCode=status==='OK'?0:2;
}catch(error){console.error('TTL monitor failed: '+error.message);process.exitCode=1;}

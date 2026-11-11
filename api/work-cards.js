import {rpc,Networks,TransactionBuilder,Contract,BASE_FEE,nativeToScVal,scValToNative,StrKey} from '@stellar/stellar-sdk';
import config from '../public/network.json' with {type:'json'};
import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
import {sha} from '../server/room-auth.js';
import {workFields,verifyWorkRelease} from '../server/work-proof.js';
const origin='https://accord-ghana.vercel.app';
async function chainAgreement(wallet,id){const server=new rpc.Server('https://soroban-testnet.stellar.org');const source=await server.getAccount(wallet);const tx=new TransactionBuilder(source,{fee:BASE_FEE,networkPassphrase:Networks.TESTNET}).addOperation(new Contract(config.contractId).call('get',nativeToScVal(Buffer.from(sha(id),'hex'),{type:'bytes'}))).setTimeout(30).build();const r=await server.simulateTransaction(tx);if(rpc.Api.isSimulationError(r)||!r.result)throw Error('Agreement cannot currently be verified on Stellar.');return scValToNative(r.result.retval);}
export function createWorkCardsHandler({env=process.env,request=fetch,getAgreement=chainAgreement,now=Date.now}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(config.network!=='TESTNET'||!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!(env.ROOM_AUTH_SECRET?.length>=32))return res.status(503).json({error:'Work cards are being prepared.'});
 const db=async(path,options={})=>{const r=await request(env.SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Work cards unavailable or changed. Refresh; database setup may be pending.');return r.json();};
 const verify=async fields=>{const r=await request('https://horizon-testnet.stellar.org/transactions/'+fields.hash,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Release receipt unavailable. Testnet history may have reset.');const receipt=await r.json();if(receipt.hash!==fields.hash||receipt.successful!==true)throw Error('Release transaction is not successful.');verifyWorkRelease({status:'SUCCESS',envelopeXdr:receipt.envelope_xdr},await getAgreement(fields.wallet,fields.id),{...fields,contract:config.contractId});};
 try{
  if(req.method==='GET'){
   if(req.query?.verify){if(!/^[a-f0-9]{64}$/.test(req.query.verify))throw Error('Invalid receipt.');const rows=await db('accord_work_cards?select=wallet,agreement,receipt&network=eq.testnet&contract=eq.'+config.contractId+'&published=eq.true&hidden=eq.false&receipt=eq.'+req.query.verify);if(!rows[0])throw Error('Card no longer published.');const r=rows[0];await verify({wallet:r.wallet,id:r.agreement,hash:r.receipt});return res.status(200).json({verified:true,network:'testnet',checkedAt:new Date(now()).toISOString()});}
   return res.status(200).json({cards:await db('accord_work_cards?select=wallet,contract,agreement,receipt,title,description,verified_at&network=eq.testnet&contract=eq.'+config.contractId+'&published=eq.true&hidden=eq.false&order=updated_at.desc&limit=60')});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(req.headers.origin!==origin)return res.status(403).json({error:'Open work cards from Accord.'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!b||JSON.stringify(b).length>14000)throw Error('Invalid request.');
  if(b.action==='challenge'){
   if(!StrKey.isValidEd25519PublicKey(b.wallet)||!['save','remove'].includes(b.operation))throw Error('Choose a wallet and action.');
   let fields;
   if(b.operation==='save'){if(b.consent!==true)throw Error('Choose to publish this work card.');fields=workFields(b);}
   else{if(!/^AC-[a-f0-9-]{36}$/.test(b.id||''))throw Error('Select a work card.');fields={id:b.id};}
   const rows=await db('accord_work_cards?select=wallet,receipt,revision&network=eq.testnet&contract=eq.'+config.contractId+'&agreement=eq.'+fields.id);
   if(rows[0]&&rows[0].wallet!==b.wallet)throw Error('This card belongs to another wallet.');
   if(b.operation==='remove'){if(!rows[0])throw Error('No card to remove.');fields.hash=rows[0].receipt;}
   fields={...fields,revision:rows[0]?.revision||0,contract:config.contractId};
   return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:fields.title||'Remove work card',body:JSON.stringify(fields),purpose:'work-'+b.operation,origin,secret:env.ROOM_AUTH_SECRET,now:now()}));
  }
  if(!['save','remove'].includes(b.action))throw Error('Unknown work card action.');
  const proof=verifyLoungeProof({token:b.token,signature:b.signature,origin,secret:env.ROOM_AUTH_SECRET,purpose:'work-'+b.action,now:now()}),fields=JSON.parse(proof.body);
  if(fields.contract!==config.contractId)throw Error('Contract configuration changed. Review again.');
  const ar=await request('https://horizon-testnet.stellar.org/accounts/'+proof.wallet,{signal:AbortSignal.timeout(12000)});if(!ar.ok)throw Error('Use an activated Testnet wallet.');const a=await ar.json();if(a.signers?.length!==1||a.signers[0].key!==proof.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Work cards currently support standard single-key wallets.');
  if(b.action==='save'){workFields(fields);await verify({...fields,wallet:proof.wallet});}
  await db('rpc/accord_work_card_write',{method:'POST',body:JSON.stringify({p_wallet:proof.wallet,p_contract:config.contractId,p_id:fields.id,p_receipt:fields.hash,p_revision:fields.revision,p_remove:b.action==='remove',p_title:fields.title||null,p_description:fields.description||null})});
  return res.status(200).json({saved:true,removed:b.action==='remove'});
 }catch(e){return res.status(400).json({error:e.message||'Work card request failed.'});}
};}
export default createWorkCardsHandler();

import {roomSettlement} from '../server/room-settlement.js';
import {randomBytes} from 'node:crypto';
import {rpc,Networks,TransactionBuilder,Contract,BASE_FEE,nativeToScVal,scValToNative} from '@stellar/stellar-sdk';
import config from '../public/network.json' with {type:'json'};
import {makeChallenge,verifyChallenge,sha,realtimeToken} from '../server/room-auth.js';
const origin='https://accord-ghana.vercel.app';
const stellar=new rpc.Server('https://soroban-testnet.stellar.org');
async function db(fn,args){
 const response=await fetch(process.env.SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Room request unavailable or session expired. Rejoin to retry.');
 return response.json();
}
async function membership(wallet,id){
 const account=await fetch('https://horizon-testnet.stellar.org/accounts/'+wallet,{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('Fund your Testnet account first.');return r.json();});
 // Message proofs support standard single-key accounts only, not delegated signers.
 if(account.signers?.length!==1||account.signers[0].key!==wallet||account.signers[0].weight<=0||account.signers[0].weight<Math.max(...Object.values(account.thresholds)))throw Error('Shared rooms currently require a standard single-key Testnet wallet.');
 const source=await stellar.getAccount(wallet);
 const tx=new TransactionBuilder(source,{fee:BASE_FEE,networkPassphrase:Networks.TESTNET}).addOperation(new Contract(config.contractId).call('get',nativeToScVal(Buffer.from(sha(id),'hex'),{type:'bytes'}))).setTimeout(30).build();
 const result=await stellar.simulateTransaction(tx);
 if(rpc.Api.isSimulationError(result)||!result.result)throw Error('Agreement could not be verified on Stellar.');
 const agreement=scValToNative(result.result.retval);
 if(agreement.buyer!==wallet&&agreement.seller!==wallet)throw Error('Only this agreement’s client and freelancer can enter.');
 return agreement;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Vary','Origin');
 const enabled=!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY&&process.env.ROOM_AUTH_SECRET?.length>=32);
 if(req.method==='GET')return res.status(200).json({enabled,transport:process.env.SUPABASE_JWT_SECRET&&process.env.SUPABASE_PUBLISHABLE_KEY?'websocket':'polling',intervalSeconds:12});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 if(req.headers.origin!==origin)return res.status(403).json({error:'Open the room from Accord.'});
 if(!enabled)return res.status(503).json({error:'Shared rooms are being prepared. Your agreement remains available.'});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||JSON.stringify(b).length>28000)return res.status(413).json({error:'Request too large.'});
  if(b.action==='challenge')return res.status(200).json(makeChallenge({wallet:b.wallet,id:b.id,contract:config.contractId,origin,secret:process.env.ROOM_AUTH_SECRET}));
  if(b.action==='join'){
   const proof=verifyChallenge({token:b.token,signature:b.signature,secret:process.env.ROOM_AUTH_SECRET,origin,contract:config.contractId});
   const a=await membership(proof.wallet,proof.id),token=randomBytes(32).toString('hex'),room=sha(config.contractId+':'+proof.id);
   await db('accord_room_join',{p_nonce:proof.nonce,p_room:room,p_wallet:proof.wallet,p_client:a.buyer,p_freelancer:a.seller,p_token:sha(token)});
   const realtime=process.env.SUPABASE_JWT_SECRET&&process.env.SUPABASE_PUBLISHABLE_KEY?{url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY,token:realtimeToken({room,secret:process.env.SUPABASE_JWT_SECRET})}:null;
   return res.status(200).json({token,room,expiresIn:1800,realtime});
  }
  if(!/^[a-f0-9]{64}$/.test(b.session||''))return res.status(401).json({error:'Join the room with your wallet first.'});
  if(['settlement-get','settlement-share'].includes(b.action))return res.status(200).json(await roomSettlement(b,{config,membership,stellar}));
  if(!['poll','comment','leave'].includes(b.action))return res.status(400).json({error:'Unknown room action.'});
  if(b.action==='comment'&&(typeof b.text!=='string'||!b.text.trim()||b.text.length>1500||!/^[a-f0-9-]{36}$/.test(b.messageId||'')))return res.status(400).json({error:'Write a comment of 1–1500 characters.'});
  return res.status(200).json(await db('accord_room_request',{p_token:sha(b.session),p_action:b.action,p_text:b.action==='comment'?b.text.trim():null,p_message:b.action==='comment'?b.messageId:null,p_station:Number.isInteger(b.station)&&b.station>=0&&b.station<4?b.station:0}));
 }catch(error){return res.status(400).json({error:error.message?.startsWith('fetch')?'Room service could not be reached. Try again.':error.message||'Room request failed.'});}
}

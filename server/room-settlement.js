import {verifiedActivity} from './room-activity.js';
import {sha,validateRoom} from './room-auth.js';
import {validateSettlement} from '../src/settlement-model.js';
const bucket='accord-settlement-approvals';
export function authorizeSettlementSession(session,room,parties,action,now=Date.now()) {
 if(!session||session.room!==room||!Number.isFinite(Date.parse(session.expires_at))||Date.parse(session.expires_at)<=now)throw Error('Room session expired. Join this agreement’s room again.');
 if(!parties||![parties.client,parties.freelancer].includes(session.wallet))throw Error('Only this room’s participants can access settlement approvals.');
 if(action==='settlement-share'&&session.wallet!==parties.freelancer)throw Error('Only the freelancer can share a signed settlement approval.');
 return session.wallet;
}
export async function roomSettlement(body,{config,membership,stellar,env=process.env,fetcher=fetch}) {
 if(!/^AC-[a-f0-9-]{36}$/.test(body.id||''))throw Error('Select a valid agreement.');
 const room=sha(config.contractId+':'+body.id);
 const call=async(path,options={})=>fetcher(env.SUPABASE_URL+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,...options.headers},signal:AbortSignal.timeout(10000)});
 const rows=async path=>{const r=await call(path);if(!r.ok)throw Error('Private room access could not be checked.');return r.json();};
 const sessions=await rows('/rest/v1/accord_room_sessions?select=wallet,room,expires_at&token=eq.'+sha(body.session)+'&limit=1');
 const parties=(await rows('/rest/v1/accord_rooms?select=client,freelancer&id=eq.'+room+'&limit=1'))[0];
 const wallet=authorizeSettlementSession(sessions[0],room,parties,body.action);validateRoom(wallet,body.id);
 if(body.action==='activity'){
  if(!/^[a-f0-9]{64}$/.test(body.hash||''))throw Error('Invalid transaction receipt.');
  await membership(wallet,body.id);
  const activity=verifiedActivity(await stellar.getTransaction(body.hash),{hash:body.hash,wallet,contract:config.contractId,id:body.id,network:config.network});
  const sent=await call('/realtime/v1/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{topic:'accord:'+room,event:'participant_action',payload:activity,private:true}]})});
  if(!sent.ok)throw Error('Activity notification could not be sent. The transaction remains confirmed.');
  return {notified:true};
 }
 const path='/storage/v1/object/' +bucket+'/'+room+'.json';
 if(body.action==='settlement-share'){
  const agreement=await membership(wallet,body.id);
  if(agreement.seller!==wallet)throw Error('The connected wallet is not the freelancer.');
  await validateSettlement(body.offer,{config,id:body.id,agreement,ledger:(await stellar.getLatestLedger()).sequence});
  const payload=JSON.stringify(body.offer);if(Buffer.byteLength(payload)>24000)throw Error('Settlement approval is too large.');
  const result=await call(path,{method:'POST',headers:{'Content-Type':'application/json','x-upsert':'true','Cache-Control':'no-store'},body:payload});
  if(!result.ok)throw Error('Approval could not be shared. Retry sharing the signed approval before it expires.');
  // Only an invalidation signal is broadcast. The approval stays behind room authentication.
  await call('/realtime/v1/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{topic:'accord:'+room,event:'room_changed',payload:{changed:true},private:true}]})}).catch(()=>{});
  return {shared:true,expiresLedger:body.offer.expiresLedger};
 }
 const result=await call(path.replace('/object/','/object/authenticated/'));
 if(result.status===404)return {offer:null};
 if(!result.ok){const error=await result.json().catch(()=>({}));if(String(error.statusCode)==='404'||error.error==='not_found')return {offer:null};throw Error('Shared approval could not be loaded.');}
 const offer=await result.json();return {offer};
}

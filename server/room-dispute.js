import {sha} from './room-auth.js';
import {cleanDisputeProposal} from '../src/dispute-model.js';
export async function roomDispute(body,{wallet,room,membership,call,asset}){
 const operation=body.action.slice('dispute-'.length);
 if(!['list','create','accept','reject','withdraw'].includes(operation))throw Error('Unknown negotiation action.');
 let proposal=null;
 if(operation!=='list'){
  if(!/^[a-f0-9-]{36}$/.test(body.proposalId||'')||!Number.isInteger(body.version)||body.version<0)throw Error('Select a proposal and refresh its history.');
  const agreement=await membership(wallet,body.id),state=Array.isArray(agreement.state)?agreement.state[0]:agreement.state;
  if(state!=='Disputed')throw Error('New negotiation decisions require a disputed agreement. History remains available after closure.');
  if(agreement.asset!==asset)throw Error('Unsupported escrow asset.');
  const termsHash=Buffer.from(agreement.terms).toString('hex');
  if(operation==='create')proposal=cleanDisputeProposal(body.proposal,termsHash,String(agreement.amount));
  else{if(body.termsHash!==termsHash)throw Error('Original conditions changed. Refresh the agreement.');proposal={termsHash};}
 }
 const result=await call('/rest/v1/rpc/accord_dispute_request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_token:sha(body.session),p_room:room,p_action:operation,p_id:body.proposalId||null,p_version:body.version??null,p_proposal:proposal})});
 if(!result.ok)throw Error('Negotiation board unavailable or proposal changed. Refresh; if setup is pending, apply DISPUTE-NEGOTIATION.sql.');
 const data=await result.json();
 if(operation!=='list')await call('/realtime/v1/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{topic:'accord:'+room,event:'room_changed',payload:{changed:true},private:true}]})}).catch(()=>{});
 return data;
}

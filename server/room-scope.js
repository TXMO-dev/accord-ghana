import {sha} from './room-auth.js';
import {cleanScopeProposal,scopeEditable} from '../src/scope-change-model.js';
export async function roomScope(body,{wallet,room,membership,call}){
 const operation=body.action.slice('scope-'.length);
 if(!['list','create','accept','reject','withdraw'].includes(operation))throw Error('Unknown scope action.');
 let proposal=null;
 if(operation!=='list'){
  if(!/^[a-f0-9-]{36}$/.test(body.proposalId||'')||!Number.isInteger(body.version)||body.version<0)throw Error('Select a proposal and refresh its history.');
  const agreement=await membership(wallet,body.id),state=Array.isArray(agreement.state)?agreement.state[0]:agreement.state;
  if(!scopeEditable(state))throw Error('Scope proposals require an active agreement. Resolve any dispute first.');
  const termsHash=Buffer.from(agreement.terms).toString('hex');
  if(operation==='create')proposal=cleanScopeProposal(body.proposal,termsHash);
  else{if(body.termsHash!==termsHash)throw Error('Original conditions changed. Refresh the agreement.');proposal={termsHash};}
 }
 const result=await call('/rest/v1/rpc/accord_scope_request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_token:sha(body.session),p_room:room,p_action:operation,p_id:body.proposalId||null,p_version:body.version??null,p_proposal:proposal})});
 if(!result.ok)throw Error('Scope board unavailable or proposal changed. Refresh; if setup is pending, apply SCOPE-PROPOSALS.sql.');
 const data=await result.json();
 if(operation!=='list')await call('/realtime/v1/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{topic:'accord:'+room,event:'room_changed',payload:{changed:true},private:true}]})}).catch(()=>{});
 return data;
}

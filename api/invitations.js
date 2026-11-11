import {StrKey} from '@stellar/stellar-sdk';
import {invitationOrigin,invitationFields,makeInvitationProof,verifyInvitationProof,invitationSession,readInvitationSession,invitationId} from '../server/invitation-auth.js';
const columns='id,client,recipient,title,brief,status,revision,created_at,expires_at';
export function createInvitationsHandler({env=process.env,request=fetch,now=Date.now}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!(env.ROOM_AUTH_SECRET?.length>=32))return res.status(503).json({error:'Private invitations are being prepared.'});
 const db=async(path,options={})=>{const r=await request(env.SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Invitations unavailable or changed. Refresh and review again.');return r.json();};
 try{
  if(req.method==='GET'){await db('accord_invitations?select=id&limit=0');return res.status(200).json({available:true});}
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(req.headers.origin!==invitationOrigin)return res.status(403).json({error:'Open invitations from Accord.'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||JSON.stringify(b).length>14000)throw Error('Invalid invitation request.');
  if(b.action==='list'){
   const session=readInvitationSession(b.session,env.ROOM_AUTH_SECRET,now());
   const invitations=await db('accord_invitations?select='+columns+'&network=eq.testnet&or=(client.eq.'+session.wallet+',recipient.eq.'+session.wallet+')&order=created_at.desc&limit=100');
   return res.status(200).json({invitations});
  }
  if(b.action==='challenge'){
   if(!StrKey.isValidEd25519PublicKey(b.wallet))throw Error('Connect a wallet.');
   let fields={};
   if(b.operation==='create')fields={...invitationFields(b),id:invitationId(b.wallet,now()),client:b.wallet,revision:0};
   else if(b.operation!=='inbox'){
    const session=readInvitationSession(b.session,env.ROOM_AUTH_SECRET,now());
    if(session.wallet!==b.wallet||!['accept','decline','cancel'].includes(b.operation)||!/^[a-f0-9-]{36}$/.test(b.id||''))throw Error('Invalid invitation action.');
    const rows=await db('accord_invitations?select='+columns+'&id=eq.'+b.id+'&network=eq.testnet&or=(client.eq.'+session.wallet+',recipient.eq.'+session.wallet+')');
    const row=rows[0];if(!row||row.status!=='pending'||Date.parse(row.expires_at)<=now()||(b.operation==='cancel'?row.client:row.recipient)!==b.wallet)throw Error('This invitation is unavailable for that action.');
    fields=row;
   }
   return res.status(200).json(makeInvitationProof({wallet:b.wallet,operation:b.operation,fields,secret:env.ROOM_AUTH_SECRET,now:now()}));
  }
  if(b.action!=='commit')throw Error('Unknown invitation action.');
  const proof=verifyInvitationProof({token:b.token,signature:b.signature,secret:env.ROOM_AUTH_SECRET,now:now()});
  const ar=await request('https://horizon-testnet.stellar.org/accounts/'+proof.wallet,{signal:AbortSignal.timeout(12000)});
  if(!ar.ok)throw Error('Use an activated Stellar Testnet wallet.');
  const a=await ar.json();if(a.signers?.length!==1||a.signers[0].key!==proof.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Invitations currently support standard single-key wallets.');
  if(proof.operation==='inbox')return res.status(200).json({session:invitationSession(proof,env.ROOM_AUTH_SECRET)});
  if(proof.operation==='create')invitationFields({...proof,wallet:proof.wallet});
  const result=await db('rpc/accord_invitation_write',{method:'POST',body:JSON.stringify({actor:proof.wallet,operation:proof.operation,target:proof.id,invite_recipient:proof.recipient,invite_title:proof.title,invite_brief:proof.brief,expected_revision:proof.revision})});
  return res.status(200).json({invitation:result});
 }catch(e){return res.status(400).json({error:e.message||'Invitation request failed.'});}
};}
export default createInvitationsHandler();

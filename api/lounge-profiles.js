import {StrKey} from '@stellar/stellar-sdk';
import {makeLoungeProof,verifyLoungeProof,loungeText} from '../server/lounge-auth.js';
const origin='https://accord-ghana.vercel.app';
export function profileFields(input){
 const name=loungeText(input.name,60),intro=loungeText(input.intro,280),skills=loungeText(input.skills,120);
 if(!['Available for work','Hiring','Open to collaboration','Not currently available'].includes(input.availability))throw Error('Choose your availability.');
 if(/S[A-Z2-7]{55}/.test(name+' '+intro+' '+skills))throw Error('Never publish secret keys.');
 return {name,intro,skills,availability:input.availability};
}
export function createProfilesHandler({env=process.env,request=fetch,now=Date.now}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||env.ROOM_AUTH_SECRET?.length<32||!env.ROOM_AUTH_SECRET)return res.status(503).json({error:'Profiles are being prepared.'});
  const db=(path,options={})=>request(env.SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
  try{
   if(req.method==='GET'){
    const wallet=req.query?.wallet;
    if(wallet&&!StrKey.isValidEd25519PublicKey(wallet))throw Error('Invalid wallet.');
    const r=await db('accord_lounge_profiles?select=wallet,display_name,intro,skills,availability,updated_at&network=eq.testnet&published=eq.true&hidden=eq.false&order=updated_at.desc&limit=60'+(wallet?'&wallet=eq.'+wallet:''));
    if(!r.ok)return res.status(503).json({error:'The people directory is being prepared. Public chat remains available.'});
    return res.status(200).json({profiles:await r.json(),realtime:env.SUPABASE_PUBLISHABLE_KEY?{url:env.SUPABASE_URL,key:env.SUPABASE_PUBLISHABLE_KEY,topic:'accord:profiles:testnet'}:null});
   }
   if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
   if(req.headers.origin!==origin)return res.status(403).json({error:'Open profiles from Accord.'});
   const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!b||JSON.stringify(b).length>14000)return res.status(400).json({error:'Invalid profile request.'});
   if(b.action==='challenge'){
    if(!StrKey.isValidEd25519PublicKey(b.wallet)||!['save','remove'].includes(b.operation))throw Error('Choose a wallet and profile action.');
    const fields=b.operation==='save'?profileFields(b):{};
    if(b.operation==='save'&&b.consent!==true)throw Error('Choose to publish your public profile first.');
    const r=await db('accord_lounge_profiles?select=revision&network=eq.testnet&wallet=eq.'+b.wallet);
    if(!r.ok)return res.status(503).json({error:'Profiles are being prepared. Try again shortly.'});
    const rows=await r.json(),revision=rows[0]?.revision||0;
    return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:fields.name||'Remove profile',body:JSON.stringify({...fields,revision}),purpose:'profile-'+b.operation,origin,secret:env.ROOM_AUTH_SECRET,now:now()}));
   }
   if(!['save','remove'].includes(b.action))throw Error('Unknown profile action.');
   const proof=verifyLoungeProof({token:b.token,signature:b.signature,origin,secret:env.ROOM_AUTH_SECRET,purpose:'profile-'+b.action,now:now()});
   const fields=JSON.parse(proof.body);
   if(b.action==='save')profileFields(fields);
   const ar=await request('https://horizon-testnet.stellar.org/accounts/'+proof.wallet,{signal:AbortSignal.timeout(12000)});
   if(!ar.ok)throw Error('Use an activated Stellar Testnet wallet.');
   const a=await ar.json();
   if(a.signers?.length!==1||a.signers[0].key!==proof.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Profiles currently support standard single-key wallets.');
   const r=await db('rpc/accord_lounge_profile_write',{method:'POST',body:JSON.stringify({target_wallet:proof.wallet,expected_revision:fields.revision,remove_profile:b.action==='remove',profile_name:fields.name||null,profile_intro:fields.intro||null,profile_skills:fields.skills||null,profile_availability:fields.availability||null})});
   if(!r.ok)return res.status(409).json({error:'Profile changed, or an update was just saved. Wait 30 seconds, then review and sign again.'});
   return res.status(200).json({saved:true,removed:b.action==='remove'});
  }catch(e){return res.status(400).json({error:e.message||'Profile request failed.'});}
 };
}
export default createProfilesHandler();

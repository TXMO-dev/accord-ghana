import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
const origin='https://accord-ghana.vercel.app';
export function createLoungeHandler({env=process.env,request=fetch,now=Date.now}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const enabled=!!(env.SUPABASE_URL&&env.SUPABASE_SECRET_KEY&&env.ROOM_AUTH_SECRET?.length>=32);
  if(!enabled)return res.status(503).json({error:'The lounge is being prepared. Please try again shortly.'});
  const db=async(path,options={})=>request(env.SUPABASE_URL+'/rest/v1/accord_lounge_messages'+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
  try{
   if(req.method==='GET'){
    const r=await db('?select=id,wallet,display_name,body,created_at,expires_at&network=eq.testnet&hidden=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&order=created_at.desc&limit=60');
    if(!r.ok)throw Error('Lounge messages could not be loaded. Please retry.');
    return res.status(200).json({messages:await r.json(),realtime:env.SUPABASE_PUBLISHABLE_KEY?{url:env.SUPABASE_URL,key:env.SUPABASE_PUBLISHABLE_KEY,topic:'accord:lounge:testnet'}:null});
   }
   if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
   if(req.headers.origin!==origin)return res.status(403).json({error:'Open the lounge from Accord.'});
   const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!b||JSON.stringify(b).length>15000)return res.status(413).json({error:'Request too large.'});
   if(b.action==='challenge')return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:b.name,body:b.text,origin,secret:env.ROOM_AUTH_SECRET,now:now()}));
   if(b.action==='reportChallenge')return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:b.reason,body:b.messageId,origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'report'}));
   if(!['post','report'].includes(b.action))return res.status(400).json({error:'Unknown lounge action.'});
   const p=verifyLoungeProof({token:b.token,signature:b.signature,origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:b.action});
   const ar=await request('https://horizon-testnet.stellar.org/accounts/'+p.wallet,{signal:AbortSignal.timeout(12000)});
   if(!ar.ok)throw Error('Use an activated Stellar Testnet wallet to post.');
   const a=await ar.json();
   if(a.signers?.length!==1||a.signers[0].key!==p.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Lounge posting currently supports standard single-key wallets.');
   if(b.action==='report'){
    const visible=await db('?select=id&id=eq.'+encodeURIComponent(p.body)+'&network=eq.testnet&hidden=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString()));
    if(!visible.ok)throw Error('Message could not be checked. Please retry.');
    if(!(await visible.json()).length)return res.status(410).json({error:'This message is no longer available.'});
    const saved=await request(env.SUPABASE_URL+'/rest/v1/accord_lounge_reports',{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({id:p.id,message_id:p.body,reporter:p.wallet,reason:p.name}),signal:AbortSignal.timeout(12000)});
    if(saved.status===409)return res.status(409).json({error:'Already reported, or your reporting slot was used. Wait 30 seconds before another report.'});
    if(!saved.ok)throw Error('Reporting is unavailable. You can mute this wallet on your device.');
    return res.status(201).json({reported:true});
   }
   const r=await db('',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:p.id,network:'testnet',wallet:p.wallet,display_name:p.name,body:p.body})});
   if(r.status===409)return res.status(409).json({error:'This posting slot was already used. Check the feed; wait 30 seconds before another post.'});
   if(!r.ok)throw Error('Your post could not be saved. Please retry.');
   return res.status(201).json({id:p.id});
  }catch(error){return res.status(400).json({error:error.message||'Lounge request failed.'});}
 };
}
export default createLoungeHandler();

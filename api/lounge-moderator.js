import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
import {createClient} from '@supabase/supabase-js';
const origin='https://accord-ghana.vercel.app';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function createModeratorHandler({env=process.env,request=fetch,now=Date.now,storageFactory=(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('accord-lounge-voice')}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Use a signed moderator request.'});
 if(req.headers.origin!==origin)return res.status(403).json({error:'Open moderation from Accord.'});
 const allowed=(env.LOUNGE_MODERATOR_WALLETS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!allowed.length||!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!(env.ROOM_AUTH_SECRET?.length>=32))return res.status(503).json({error:'Moderator access is not configured.'});
 const db=(path,options={})=>request(env.SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!b||JSON.stringify(b).length>15000)throw Error('Invalid request.');
  if(b.action==='challenge'){
   if(!allowed.includes(b.wallet))return res.status(403).json({error:'This wallet is not an Accord moderator.'});
   const action=b.decision,target=action==='queue'?'recent reports':b.messageId;
   if(!['queue','hide','dismiss','restore','listen'].includes(action)||(action!=='queue'&&!uuid.test(target)))throw Error('Choose a valid moderation action.');
   return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:action,body:target,origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'moderation'}));
  }
  const p=verifyLoungeProof({token:b.token,signature:b.signature,origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'moderation'});
  if(!allowed.includes(p.wallet))return res.status(403).json({error:'Moderator access was removed.'});
  const ar=await request('https://horizon-testnet.stellar.org/accounts/'+p.wallet,{signal:AbortSignal.timeout(12000)});if(!ar.ok)throw Error('Use the activated moderator Testnet wallet.');const a=await ar.json();
  if(a.signers?.length!==1||a.signers[0].key!==p.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Moderator access requires a standard single-key wallet.');
  if(p.name==='queue'){
   const r=await db('accord_lounge_reports?select=id,message_id,reason,decision,created_at,reviewed_at,accord_lounge_messages!inner(id,network,display_name,body,hidden,expires_at,voice_seconds)&accord_lounge_messages.network=eq.testnet&accord_lounge_messages.expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&order=created_at.desc&limit=100');
   if(!r.ok)throw Error('Reports could not be loaded.');return res.status(200).json({reports:await r.json(),limit:100});
  }
  if(!uuid.test(p.body))throw Error('Invalid target.');
  if(p.name==='listen'){
   const r=await db('accord_lounge_messages?select=id,expires_at,voice_seconds&id=eq.'+p.body+'&network=eq.testnet&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString()));if(!r.ok)throw Error('Voice note unavailable.');const row=(await r.json())[0];if(!row?.voice_seconds)throw Error('Voice note expired or unavailable.');
   const seconds=Math.floor((Date.parse(row.expires_at)-now())/1000);if(seconds<1)throw Error('Voice note expired.');const {data,error}=await storageFactory(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).createSignedUrl(p.body+'.wav',Math.min(60,seconds));if(error)throw Error('Audio could not be loaded.');return res.status(200).json({url:data.signedUrl});
  }
  if(!['hide','dismiss','restore'].includes(p.name))throw Error('Invalid decision.');
  const r=await db('rpc/accord_lounge_review',{method:'POST',body:JSON.stringify({target:p.body,decision:p.name,moderator_wallet:p.wallet,approval:p.id})});
  if(r.status===409)return res.status(409).json({error:'Approval already used. Refresh the reports; wait 30 seconds before another decision.'});
  if(!r.ok)throw Error('Decision not applied. Check the dashboard SQL is installed and the message has not expired.');return res.status(200).json({applied:p.name,messageId:p.body});
 }catch(e){return res.status(400).json({error:e.message||'Moderator request failed.'});}
};}
export default createModeratorHandler();

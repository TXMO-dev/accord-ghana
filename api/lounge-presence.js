import {cleanLoungePose} from '../src/lounge-motion-model.js';
import {cleanAvatar} from '../src/avatar-model.js';
import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
import {sealPresence,readPresence} from '../server/lounge-session.js';
const origin='https://accord-ghana.vercel.app';
export function createPresenceHandler({env=process.env,request=fetch,now=Date.now}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!(env.ROOM_AUTH_SECRET?.length>=32))return res.status(503).json({error:'Presence is being prepared.'});
 const db=(query='',opts={})=>request(env.SUPABASE_URL+'/rest/v1/accord_lounge_presence'+query,{...opts,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...opts.headers},signal:AbortSignal.timeout(12000)});
 try{
  if(req.method==='GET'){
   let r=await db('?select=wallet,display_name,seen_at,avatar,pose,motion_at&departed=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&seen_at=gt.'+encodeURIComponent(new Date(now()-75000).toISOString())+'&order=seen_at.desc&limit=100');
   let avatarSharing=true,motionSharing=true;
   if(!r.ok&&r.status===400){motionSharing=false;r=await db('?select=wallet,display_name,seen_at,avatar&departed=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&seen_at=gt.'+encodeURIComponent(new Date(now()-75000).toISOString())+'&order=seen_at.desc&limit=100');}
   if(!r.ok&&r.status===400){avatarSharing=false;r=await db('?select=wallet,display_name,seen_at&departed=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&seen_at=gt.'+encodeURIComponent(new Date(now()-75000).toISOString())+'&order=seen_at.desc&limit=100');}
   if(!r.ok)throw Error('Live presence is not available yet.');
   const unique=new Map();for(const p of await r.json())if(!unique.has(p.wallet))unique.set(p.wallet,p);
   return res.status(200).json({people:[...unique.values()].map(p=>({...p,avatar:p.avatar?cleanAvatar(p.avatar):null})),avatarSharing,motionSharing,realtime:env.SUPABASE_PUBLISHABLE_KEY?{url:env.SUPABASE_URL,key:env.SUPABASE_PUBLISHABLE_KEY,topic:'accord:presence:testnet'}:null});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(req.headers.origin!==origin)return res.status(403).json({error:'Open the Lounge from Accord.'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||JSON.stringify(b).length>15000)throw Error('Invalid presence request.');
  if(b.action==='challenge')return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:b.name,body:b.shareAvatar?JSON.stringify(b.shareMotion?{avatar:cleanAvatar(b.avatar),shareMotion:true}:cleanAvatar(b.avatar)):'Public Lounge presence',origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'presence'}));
  if(b.action==='join'){
   const p=verifyLoungeProof({token:b.token,signature:b.signature,origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'presence'});
   const ar=await request('https://horizon-testnet.stellar.org/accounts/'+p.wallet,{signal:AbortSignal.timeout(12000)});if(!ar.ok)throw Error('Use an activated Testnet wallet.');const a=await ar.json();
   if(a.signers?.length!==1||a.signers[0].key!==p.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Use a standard single-key wallet for Lounge presence.');
   const sharing=p.body!=='Public Lounge presence',details=sharing?JSON.parse(p.body):null;
   const session={shareMotion:details?.shareMotion===true,shareAvatar:sharing,kind:'lounge-presence',id:p.id,wallet:p.wallet,expires:p.issued+1800000};
   const r=await db('',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({...(sharing?{avatar:cleanAvatar(details?.avatar||details)}:{}),id:p.id,wallet:p.wallet,display_name:p.name,expires_at:new Date(session.expires).toISOString()})});
   if(!r.ok)throw Error(r.status===409?'Approval already used. Wait 30 seconds and join again.':'Presence could not be started.');
   return res.status(200).json({session:sealPresence(session,env.ROOM_AUTH_SECRET),expires:session.expires});
  }
  if(!['heartbeat','leave','avatar','motion'].includes(b.action))throw Error('Unknown presence action.');
  const p=readPresence(b.session,env.ROOM_AUTH_SECRET,now());
  if(b.action==='motion'){
   if(!p.shareMotion)throw Error('Rejoin with movement sharing enabled.');
   if(!Number.isSafeInteger(b.sequence)||b.sequence<1)throw Error('Invalid movement sequence.');
   const pose=cleanLoungePose(b.pose);
   const r=await request(env.SUPABASE_URL+'/rest/v1/rpc/accord_lounge_move',{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({session_id:p.id,owner_wallet:p.wallet,next_sequence:b.sequence,next_pose:pose}),signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw Error('Movement sharing is awaiting setup.');return res.status(200).json({accepted:await r.json()});
  }
  if(b.action==='avatar'&&!p.shareAvatar)throw Error('Rejoin presence to share your character.');
  const r=await db('?id=eq.'+encodeURIComponent(p.id)+'&wallet=eq.'+p.wallet+'&departed=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString()),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(b.action==='leave'?{departed:true}:b.action==='avatar'?{avatar:cleanAvatar(b.avatar),seen_at:new Date(now()).toISOString()}:{seen_at:new Date(now()).toISOString()})});
  if(!r.ok)throw Error('Presence update failed.');if(!(await r.json()).length)throw Error('Session ended. Join again to appear.');
  return res.status(200).json({ok:true});
 }catch(e){return res.status(400).json({error:e.message||'Presence unavailable.'});}
};}
export default createPresenceHandler();

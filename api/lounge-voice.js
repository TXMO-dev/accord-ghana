import {createClient} from '@supabase/supabase-js';
import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
import {inspectVoice,voiceManifest} from '../server/lounge-voice.js';
const origin='https://accord-ghana.vercel.app',bucket='accord-lounge-voice';
export function createVoiceHandler({env=process.env,request=fetch,now=Date.now,storageFactory=(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(bucket)}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!(env.ROOM_AUTH_SECRET?.length>=32))return res.status(503).json({error:'Voice notes are being prepared.'});
 const db=(table,query='',options={})=>request(env.SUPABASE_URL+'/rest/v1/'+table+query,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
 try{
  if(req.method==='GET'){
   const id=req.query?.id;
   if(!id){const r=await db('accord_lounge_voice','?select=id&limit=0');return res.status(200).json({available:r.ok&&!!env.CRON_SECRET});}
   if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid voice note.');
   const r=await db('accord_lounge_messages','?select=id,expires_at&id=eq.'+id+'&network=eq.testnet&hidden=eq.false&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString()));
   if(!r.ok)throw Error('Voice note unavailable.');const [message]=await r.json();if(!message)return res.status(410).json({error:'This voice note is no longer available.'});
   const v=await db('accord_lounge_voice','?select=id&id=eq.'+id+'&published=eq.true');if(!v.ok||!(await v.json()).length)return res.status(404).json({error:'Voice note unavailable.'});
   const lifetime=Math.min(60,Math.floor((Date.parse(message.expires_at)-now())/1000));if(lifetime<1)return res.status(410).json({error:'Voice note expired.'});
   const {data,error}=await storageFactory(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).createSignedUrl(id+'.wav',lifetime);
   if(error)throw Error('Playback unavailable. Please retry.');return res.status(200).json({url:data.signedUrl});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(req.headers.origin!==origin)return res.status(403).json({error:'Open the Lounge from Accord.'});
  if(!env.CRON_SECRET)throw Error('Voice cleanup is not configured yet.');
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||JSON.stringify(b).length>1350000)return res.status(413).json({error:'Recording too large.'});
  if(b.action==='challenge')return res.status(200).json(makeLoungeProof({wallet:b.wallet,name:b.name,body:voiceManifest(b),origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'voice'}));
  if(b.action!=='post')throw Error('Unknown voice action.');
  const p=verifyLoungeProof({token:b.token,signature:b.signature,origin,secret:env.ROOM_AUTH_SECRET,now:now(),purpose:'voice'}),manifest=JSON.parse(p.body),audio=inspectVoice(b.audio);
  if(voiceManifest(manifest)!==p.body||manifest.hash!==audio.hash||manifest.seconds!==audio.seconds)throw Error('Recording changed. Preview and sign again.');
  const ar=await request('https://horizon-testnet.stellar.org/accounts/'+p.wallet,{signal:AbortSignal.timeout(12000)});if(!ar.ok)throw Error('Use an activated Testnet wallet.');const a=await ar.json();
  if(a.signers?.length!==1||a.signers[0].key!==p.wallet||a.signers[0].weight<=0||!a.thresholds||a.signers[0].weight<Math.max(...Object.values(a.thresholds)))throw Error('Use a standard single-key wallet.');
  // Reserve an immutable upload ID before Storage writes. Retain failed reservations
  // until cleanup so a replay cannot overwrite or duplicate another signed recording.
  const reserved=await db('accord_lounge_voice','',{method:'POST',body:JSON.stringify({id:p.id,wallet:p.wallet,seconds:audio.seconds})});
  if(reserved.status===409)return res.status(409).json({error:'This voice posting slot was already used. Check the feed or wait 30 seconds and sign again.'});
  if(!reserved.ok)throw Error('Voice notes are not ready yet.');
  const storage=storageFactory(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY);
  const {error}=await storage.upload(p.id+'.wav',audio.bytes,{contentType:'audio/wav',upsert:false,cacheControl:'0'});if(error)throw Error('Upload failed. Please record or sign again after 30 seconds.');
  // Mark published first. Only the message row permits playback, and its insert
  // is the realtime notification. Failed inserts leave a tracked cleanup candidate.
  const marked=await db('accord_lounge_voice','?id=eq.'+p.id,{method:'PATCH',body:JSON.stringify({published:true})});if(!marked.ok)throw Error('Could not prepare voice note.');
  const saved=await db('accord_lounge_messages','',{method:'POST',body:JSON.stringify({id:p.id,network:'testnet',wallet:p.wallet,display_name:p.name,body:manifest.caption,voice_seconds:audio.seconds})});
  if(!saved.ok)throw Error('Voice note could not be published. Please try again after 30 seconds.');
  return res.status(201).json({id:p.id});
 }catch(e){return res.status(400).json({error:e.message||'Voice request failed.'});}
};}
export default createVoiceHandler();

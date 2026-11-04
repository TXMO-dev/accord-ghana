import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';
export function createVoiceCleanup({env=process.env,request=fetch,now=Date.now,storageFactory=(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('accord-lounge-voice')}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const expected=Buffer.from('Bearer '+(env.CRON_SECRET||'')),actual=Buffer.from(req.headers.authorization||'');
 if(!env.CRON_SECRET||actual.length!==expected.length||!timingSafeEqual(actual,expected))return res.status(401).json({error:'Unauthorized'});
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)return res.status(503).json({error:'Cleanup not configured'});
 const db=(q,options={})=>request(env.SUPABASE_URL+'/rest/v1/accord_lounge_voice'+q,{...options,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
 try{
  // Independent of message rows: existing chat cleanup cannot orphan audio.
  // 25 hours allows for an upload that reserved its ID just before publication.
  const cutoff=encodeURIComponent(new Date(now()-25*3600000).toISOString());
  const r=await db('?select=id&created_at=lt.'+cutoff+'&order=created_at.asc&limit=500');if(!r.ok)throw Error('Cleanup query failed');const rows=await r.json();
  if(rows.length){const {error}=await storageFactory(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).remove(rows.map(x=>x.id+'.wav'));if(error)throw Error('Storage cleanup failed; retained retry records');
   const removed=await db('?id=in.('+rows.map(x=>x.id).join(',')+')',{method:'DELETE'});if(!removed.ok)throw Error('Audio removed; retry records retained');}
  return res.status(200).json({removed:rows.length,moreMayRemain:rows.length===500});
 }catch(e){return res.status(500).json({error:e.message});}
};}
export default createVoiceCleanup();

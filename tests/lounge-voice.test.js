import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Keypair} from '@stellar/stellar-sdk';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {encodeVoice} from '../src/voice-format.js';
import {inspectVoice,voiceManifest} from '../server/lounge-voice.js';
import {makeLoungeProof} from '../server/lounge-auth.js';
import {createVoiceHandler} from '../api/lounge-voice.js';
import {createVoiceCleanup} from '../api/lounge-voice-cleanup.js';
const key=Keypair.random(),origin='https://accord-ghana.vercel.app',now=100000,secret='test-only-long-voice-secret-for-unit-tests';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'private-test-key',ROOM_AUTH_SECRET:secret,CRON_SECRET:'test-only-cron'};
const wav=()=>Buffer.from(encodeVoice(new Float32Array(16000))).toString('base64');
function response(){return {code:0,body:null,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
function signed(){const a=inspectVoice(wav()),p=makeLoungeProof({wallet:key.publicKey(),name:'Voice tester',body:voiceManifest({...a,caption:'Hello collaborators'}),purpose:'voice',origin,secret,now});return {action:'post',token:p.token,signature:Buffer.from(key.sign(createHash('sha256').update('Stellar Signed Message:\n'+p.message).digest())).toString('base64'),audio:wav()};}
test('canonical voice duration is derived from PCM, rejects forged headers, oversized and non-audio data',()=>{
 assert.equal(inspectVoice(wav()).seconds,1);
 const max=Buffer.from(encodeVoice(new Float32Array(480000)));assert.equal(inspectVoice(max.toString('base64')).seconds,30);
 assert.throws(()=>encodeVoice(new Float32Array(480001)));
 for(const offset of [0,4,8,16,20,22,24,28,32,34,36,40]){const corrupt=Buffer.from(wav(),'base64');corrupt[offset]^=1;assert.throws(()=>inspectVoice(corrupt.toString('base64')));}
 assert.throws(()=>inspectVoice(Buffer.from('<script>alert(1)</script>').toString('base64')));
});
test('changed recording fails before writes; signed voice reserves before upload and replay cannot overwrite',async()=>{
 let reserved=false,uploads=0,published=0;
 const h=createVoiceHandler({env,now:()=>now,storageFactory:()=>({upload:async()=>{assert.equal(reserved,true);uploads++;return {};}}),request:async(u,o)=>{
  if(u.includes('horizon'))return {ok:true,json:async()=>({signers:[{key:key.publicKey(),weight:1}],thresholds:{low:1,med:1,high:1}})};
  if(u.includes('accord_lounge_voice')&&o.method==='POST'){if(reserved)return {ok:false,status:409};reserved=true;return {ok:true};}
  if(u.includes('accord_lounge_messages')){published++;assert.equal(JSON.parse(o.body).voice_seconds,1);}return {ok:true};
 }});
 const body=signed(),changed=Buffer.from(body.audio,'base64');changed[50]=1;
 let res=response();await h({method:'POST',headers:{origin},body:{...body,audio:changed.toString('base64')}},res);assert.equal(res.code,400);assert.equal(uploads,0);
 res=response();await h({method:'POST',headers:{origin},body},res);assert.equal(res.code,201);assert.equal(uploads,1);assert.equal(published,1);
 res=response();await h({method:'POST',headers:{origin},body},res);assert.equal(res.code,409);assert.equal(uploads,1);
 res=response();await h({method:'POST',headers:{origin:'https://evil.example'},body},res);assert.equal(res.code,403);
});
test('hidden or expired messages cannot get playback URLs; valid URLs last at most 60 seconds',async()=>{
 let visible=false,urls=0;const h=createVoiceHandler({env,now:()=>now,request:async u=>({ok:true,json:async()=>u.includes('messages')?(visible?[{id:'12345678-1234-1234-1234-123456789abc',expires_at:new Date(now+20000).toISOString()}]:[]):[{id:'x'}]}),storageFactory:()=>({createSignedUrl:async(path,seconds)=>{urls++;assert.equal(seconds,20);return {data:{signedUrl:'https://example.supabase.co/signed'}};}})});
 let res=response();await h({method:'GET',query:{id:'12345678-1234-1234-1234-123456789abc'}},res);assert.equal(res.code,410);assert.equal(urls,0);
 visible=true;res=response();await h({method:'GET',query:{id:'12345678-1234-1234-1234-123456789abc'}},res);assert.equal(res.code,200);assert.equal(urls,1);assert.doesNotMatch(JSON.stringify(res.body),/private-test-key/);
});
test('cleanup requires authentication, uses Storage API first and retains records on storage failure',async()=>{
 let fail=true,deletes=0,removed=0;const h=createVoiceCleanup({env,now:()=>now,request:async(u,o)=>{if(o.method==='DELETE'){deletes++;assert.ok(removed);return {ok:true};}assert.match(u,/created_at=lt/);return {ok:true,json:async()=>[{id:'12345678-1234-1234-1234-123456789abc'}]};},storageFactory:()=>({remove:async paths=>{removed++;assert.match(paths[0],/\.wav$/);return {error:fail?Error('retry'):null};}})});
 let res=response();await h({method:'GET',headers:{}},res);assert.equal(res.code,401);assert.equal(removed,0);
 res=response();await h({method:'GET',headers:{authorization:'Bearer '+env.CRON_SECRET}},res);assert.equal(res.code,500);assert.equal(deletes,0);
 fail=false;res=response();await h({method:'GET',headers:{authorization:'Bearer '+env.CRON_SECRET}},res);assert.equal(res.code,200);assert.equal(deletes,1);
});
test('SQL protects audio uploads, private bucket and cleanup metadata survives chat deletion',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema realtime; create function realtime.send(jsonb,text,text,boolean) returns void language sql as 'select'; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid,bucket_id text); alter table storage.objects enable row level security; grant usage on schema public,storage to anon,authenticated,service_role; grant all on storage.objects to anon,authenticated; create policy broad on storage.objects for all to anon,authenticated using(true) with check(true);");
 await db.exec(readFileSync('LOUNGE-PUBLIC-CHAT.sql','utf8'));const sql=readFileSync('LOUNGE-VOICE.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec("insert into storage.objects values(gen_random_uuid(),'accord-lounge-voice'); insert into public.accord_lounge_voice(id,wallet,seconds) values('12345678-1234-1234-1234-123456789abc','G'||repeat('A',55),1);");
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);assert.equal((await db.query('select * from storage.objects')).rows.length,0);await assert.rejects(db.query('select * from public.accord_lounge_voice'));await assert.rejects(db.exec("insert into storage.objects values(gen_random_uuid(),'accord-lounge-voice')"));await db.exec('reset role');}
 await db.exec('delete from public.accord_lounge_messages');assert.equal((await db.query('select * from public.accord_lounge_voice')).rows.length,1);assert.equal((await db.query("select public from storage.buckets where id='accord-lounge-voice'")).rows[0].public,false);
 }finally{await db.close();}
});

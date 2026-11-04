import test from 'node:test';import assert from 'node:assert/strict';
import {sealPresence,readPresence} from '../server/lounge-session.js';
import {createPresenceHandler} from '../api/lounge-presence.js';
import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
const secret='test-only-long-secret-for-presence-123456',now=100000;
test('presence session rejects tampering, expiry and other token kinds',()=>{
 const p={kind:'lounge-presence',wallet:'GTEST',id:'test',expires:now+1000};const token=sealPresence(p,secret);assert.equal(readPresence(token,secret,now).wallet,p.wallet);
 assert.throws(()=>readPresence(token+'x',secret,now));assert.throws(()=>readPresence(token,secret,now+1000));assert.throws(()=>readPresence(sealPresence({...p,kind:'room'},secret),secret,now));
});
test('presence feed filters expired sessions and deduplicates wallets without returning sessions',async()=>{
 let url;const handler=createPresenceHandler({env:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'never-public',ROOM_AUTH_SECRET:secret},now:()=>now,request:async u=>{url=u;return {ok:true,json:async()=>[{wallet:'GONE',display_name:'One',seen_at:'now'},{wallet:'GONE',display_name:'Older',seen_at:'then'}]};}});
 const res={setHeader(){},status(n){this.code=n;return this;},json(d){this.data=d;}};await handler({method:'GET'},res);assert.equal(res.code,200);assert.equal(res.data.people.length,1);assert.match(url,/departed=eq.false/);assert.match(url,/expires_at=gt/);assert.match(url,/seen_at=gt/);assert.doesNotMatch(JSON.stringify(res.data),/never-public/);
});
test('presence table denies browser access and retains departed IDs against replays',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema realtime;create function realtime.send(jsonb,text,text,boolean) returns void language sql as 'select';create schema cron;create table cron.job(jobname text,active boolean);create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';");
 const sql=readFileSync('LOUNGE-PRESENCE.sql','utf8');await db.exec(sql);await db.exec(sql);const avatars=readFileSync('LOUNGE-SHARED-AVATARS.sql','utf8');await db.exec(avatars);await db.exec(avatars);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.accord_lounge_presence'));await db.exec('reset role');}
 await db.exec("set role service_role;insert into public.accord_lounge_presence(id,wallet,display_name,expires_at) values('11111111-1111-1111-1111-111111111111','G'||repeat('A',55),'Test',now()+interval '30 minutes');update public.accord_lounge_presence set departed=true;");
 await assert.rejects(db.exec("insert into public.accord_lounge_presence(id,wallet,display_name,expires_at) values('11111111-1111-1111-1111-111111111111','G'||repeat('A',55),'Replay',now()+interval '30 minutes')"));
 }finally{await db.close();}
});

import {Keypair} from '@stellar/stellar-sdk';
import {createHash} from 'node:crypto';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'never-public',ROOM_AUTH_SECRET:secret};
const origin='https://accord-ghana.vercel.app';
function response(){return {setHeader(){},status(n){this.code=n;return this;},json(d){this.data=d;}};}
test('avatar consent is signed, sanitized and bound to the joining wallet',async()=>{
 const kp=Keypair.random();let inserted;
 const handler=createPresenceHandler({env,now:()=>now,request:async(u,o)=>u.includes('horizon-')?{ok:true,json:async()=>({signers:[{key:kp.publicKey(),weight:1}],thresholds:{low_threshold:1,med_threshold:1,high_threshold:1}})}:{ok:true,json:async()=>[],...(o?.method==='POST'?(inserted=JSON.parse(o.body),{}):{})}});
 const proof=response();await handler({method:'POST',headers:{origin},body:{action:'challenge',wallet:kp.publicKey(),name:'Test',shareAvatar:true,avatar:{hair:'bun',accessory:'glasses',url:'https://untrusted.test/model'}}},proof);
 assert.match(proof.data.message,/Changes I save while visible/);assert.doesNotMatch(proof.data.message,/untrusted/);
 const signature=Buffer.from(kp.sign(createHash('sha256').update('Stellar Signed Message:\n'+proof.data.message).digest())).toString('base64');
 const joined=response();await handler({method:'POST',headers:{origin},body:{action:'join',token:proof.data.token,signature,avatar:{hair:'none'}}},joined);
 assert.equal(joined.code,200,JSON.stringify(joined.data));assert.equal(inserted.avatar.hair,'bun');assert.equal(inserted.wallet,kp.publicKey());assert.equal(readPresence(joined.data.session,secret,now).shareAvatar,true);
});
test('appearance updates require consent and target only the signed session wallet',async()=>{
 let calls=[];const handler=createPresenceHandler({env,now:()=>now,request:async(u,o)=>{calls.push([u,JSON.parse(o.body)]);return {ok:true,json:async()=>[{id:'row'}]};}});
 const p={kind:'lounge-presence',id:'11111111-1111-1111-1111-111111111111',wallet:Keypair.random().publicKey(),expires:now+10000};
 for(const consent of [false,true]){const r=response();await handler({method:'POST',headers:{origin},body:{action:'avatar',wallet:'OTHER',session:sealPresence({...p,shareAvatar:consent},secret),avatar:{hair:'bun',url:'bad'}}},r);assert.equal(r.code,consent?200:400);}
 assert.equal(calls.length,1);assert.ok(calls[0][0].includes('wallet=eq.'+p.wallet));assert.match(calls[0][0],/departed=eq.false/);assert.equal(calls[0][1].avatar.hair,'bun');assert.equal(calls[0][1].avatar.url,undefined);
});
test('presence remains available before the avatar migration',async()=>{
 let count=0;const handler=createPresenceHandler({env,request:async()=>++count<=2?{ok:false,status:400}:{ok:true,json:async()=>[]}});const r=response();await handler({method:'GET'},r);assert.equal(r.code,200);assert.equal(r.data.avatarSharing,false);
});

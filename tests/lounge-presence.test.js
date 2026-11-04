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
 const sql=readFileSync('LOUNGE-PRESENCE.sql','utf8');await db.exec(sql);await db.exec(sql);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.accord_lounge_presence'));await db.exec('reset role');}
 await db.exec("set role service_role;insert into public.accord_lounge_presence(id,wallet,display_name,expires_at) values('11111111-1111-1111-1111-111111111111','G'||repeat('A',55),'Test',now()+interval '30 minutes');update public.accord_lounge_presence set departed=true;");
 await assert.rejects(db.exec("insert into public.accord_lounge_presence(id,wallet,display_name,expires_at) values('11111111-1111-1111-1111-111111111111','G'||repeat('A',55),'Replay',now()+interval '30 minutes')"));
 }finally{await db.close();}
});

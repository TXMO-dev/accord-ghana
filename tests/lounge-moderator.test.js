import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Keypair} from '@stellar/stellar-sdk';
import {createModeratorHandler} from '../api/lounge-moderator.js';
import {makeLoungeProof} from '../server/lounge-auth.js';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const key=Keypair.random(),other=Keypair.random(),origin='https://accord-ghana.vercel.app',now=100000,secret='test-only-moderation-secret-1234567890',id='12345678-1234-1234-1234-123456789abc';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'never-return-this',ROOM_AUTH_SECRET:secret,LOUNGE_MODERATOR_WALLETS:key.publicKey()};
const response=()=>({code:0,setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
const proof=(name='hide',purpose='moderation')=>{const p=makeLoungeProof({wallet:key.publicKey(),name,body:id,origin,secret,now,purpose});return {token:p.token,signature:Buffer.from(key.sign(createHash('sha256').update('Stellar Signed Message:\n'+p.message).digest())).toString('base64')};};
const call=async(h,body,headers={origin})=>{const r=response();await h({method:'POST',headers,body},r);return r;};
const account={ok:true,json:async()=>({signers:[{key:key.publicKey(),weight:1}],thresholds:{low_threshold:1,med_threshold:1,high_threshold:1}})};
test('moderator allowlist, signature, origin, purpose and revocation gate private data',async()=>{
 let calls=0;const h=createModeratorHandler({env,now:()=>now,request:async()=>{calls++;return account;}});
 assert.equal((await call(h,{action:'challenge',wallet:other.publicKey(),decision:'queue'})).code,403);
 assert.equal((await call(h,proof(),{origin:'https://wrong.example'})).code,403);
 assert.equal((await call(h,{...proof(),signature:'bad'})).code,400);
 assert.equal((await call(h,proof('hello','post'))).code,400);assert.equal(calls,0);
 const removed=createModeratorHandler({env:{...env,LOUNGE_MODERATOR_WALLETS:other.publicKey()},now:()=>now,request:async()=>{throw Error('must not query');}});
 assert.equal((await call(removed,proof())).code,403);
});
test('decision uses signed target and action; replay conflict returned without success',async()=>{
 let rpc;const h=createModeratorHandler({env,now:()=>now,request:async(u,o)=>{if(u.includes('horizon-'))return account;rpc=JSON.parse(o.body);return {ok:false,status:409};}});
 const r=await call(h,{...proof(),messageId:'attacker override',decision:'restore'});assert.equal(r.code,409);assert.equal(rpc.target,id);assert.equal(rpc.decision,'hide');assert.equal(rpc.moderator_wallet,key.publicKey());
});
test('queue omits reporters and is bounded; invalid account authority denied',async()=>{
 let url;const h=createModeratorHandler({env,now:()=>now,request:async u=>{if(u.includes('horizon-'))return account;url=u;return {ok:true,json:async()=>[]};}});
 const r=await call(h,proof('queue'));assert.equal(r.code,200);assert.match(url,/limit=100/);assert.doesNotMatch(url,/reporter/);assert.doesNotMatch(JSON.stringify(r.body),/never-return/);
 const locked=createModeratorHandler({env,now:()=>now,request:async()=>({ok:true,json:async()=>({signers:[{key:key.publicKey(),weight:0}],thresholds:{low_threshold:1}})})});assert.equal((await call(locked,proof())).code,400);
});
test('SQL atomically records decisions, prevents replay and denies browser roles',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema realtime; create function realtime.send(jsonb,text,text,boolean) returns void language sql as 'select'; grant usage on schema public,realtime to anon,authenticated,service_role;");
 for(const f of ['LOUNGE-PUBLIC-CHAT.sql','LOUNGE-MODERATION.sql','LOUNGE-MODERATOR-DASHBOARD.sql','LOUNGE-MODERATOR-DASHBOARD.sql'])await db.exec(readFileSync(f,'utf8'));
 const review="select public.accord_lounge_review('"+id+"','hide','"+key.publicKey()+"','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')";
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from accord_lounge_moderation_audit'));await assert.rejects(db.query(review));await db.exec('reset role');}
 await db.exec("set role service_role; insert into public.accord_lounge_messages(id,network,wallet,display_name,body) values('"+id+"','testnet','"+key.publicKey()+"','Test','Hello');");
 await db.exec(review);assert.equal((await db.query('select hidden from accord_lounge_messages')).rows[0].hidden,true);
 await assert.rejects(db.exec(review.replace("'hide'","'restore'")));assert.equal((await db.query('select hidden from accord_lounge_messages')).rows[0].hidden,true);assert.equal((await db.query('select * from accord_lounge_moderation_audit')).rows.length,1);
 await db.exec("update accord_lounge_messages set created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour'");await assert.rejects(db.exec(review.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')));assert.equal((await db.query('select * from accord_lounge_moderation_audit')).rows.length,1);
 }finally{await db.close();}
});


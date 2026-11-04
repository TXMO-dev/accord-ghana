import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {Keypair} from '@stellar/stellar-sdk';
import {createHash} from 'node:crypto';
import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
test('profile signatures cannot authorize chat or removal',()=>{
 const key=Keypair.random(),origin='https://accord-ghana.vercel.app',secret='test-only-secret-long-enough-for-auth';
 const c=makeLoungeProof({wallet:key.publicKey(),name:'Test',body:'{}',purpose:'profile-save',origin,secret,now:100000});
 const signature=Buffer.from(key.sign(createHash('sha256').update('Stellar Signed Message:\n'+c.message).digest())).toString('base64');
 const input={token:c.token,signature,origin,secret,now:100001};
 assert.equal(verifyLoungeProof({...input,purpose:'profile-save'}).name,'Test');
 assert.throws(()=>verifyLoungeProof(input));assert.throws(()=>verifyLoungeProof({...input,purpose:'profile-remove'}));
});
test('profile permissions, rate limit, removal and replay protection',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 const sql=readFileSync('LOUNGE-PROFILES.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec("create schema realtime;create table realtime.notices(payload jsonb,event text,topic text,private boolean);create function realtime.send(jsonb,text,text,boolean) returns void language sql as 'insert into realtime.notices values($1,$2,$3,$4)';");
 const realtimeSql=readFileSync('LOUNGE-PROFILES-REALTIME.sql','utf8');await db.exec(realtimeSql);await db.exec(realtimeSql);
 const write=(rev,remove=false)=>db.query("select public.accord_lounge_profile_write('G'||repeat('A',55),$1,$2,'Creator','Hello','Design','Available for work')",[rev,remove]);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(write(0));await db.exec('reset role');}
 await db.exec('set role service_role');await write(0);await assert.rejects(write(0));await assert.rejects(write(1));
 await db.exec('reset role;set role anon');assert.equal((await db.query('select * from public.accord_lounge_profiles')).rows.length,1);
 await db.exec('reset role;set role service_role');await write(1,true);await assert.rejects(write(0));
 const row=(await db.query('select * from public.accord_lounge_profiles')).rows[0];assert.equal(row.revision,2);assert.equal(row.intro,null);assert.equal(row.display_name,null);
 await db.exec('reset role;set role anon');assert.equal((await db.query('select * from public.accord_lounge_profiles')).rows.length,0);
 await db.exec('reset role');const notices=(await db.query('select * from realtime.notices')).rows;
 assert.ok(notices.length>=3);for(const notice of notices){assert.deepEqual(notice.payload,{changed:true});assert.equal(notice.topic,'accord:profiles:testnet');assert.equal(notice.event,'profiles_changed');assert.equal(notice.private,false);}
 }finally{await db.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
test('moderation privileges, hide/restore, deduplication and expiry cascade',async()=>{
 const db=new PGlite();
 try{
 await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema realtime; create function realtime.send(jsonb,text,text,boolean) returns void language sql as 'select'; grant usage on schema public,realtime to anon,authenticated,service_role;");
 await db.exec(readFileSync('LOUNGE-PUBLIC-CHAT.sql','utf8'));
 const sql=readFileSync('LOUNGE-MODERATION.sql','utf8');await db.exec(sql);await db.exec(sql);
 const id='12345678-1234-1234-1234-123456789abc';
 await db.exec("set role service_role; insert into public.accord_lounge_messages(id,network,wallet,display_name,body) values ('"+id+"','testnet','G'||repeat('A',55),'Test','hello'); insert into public.accord_lounge_reports(id,message_id,reporter,reason) values(gen_random_uuid(),'"+id+"','G'||repeat('B',55),'Spam'); reset role;");
 for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 await assert.rejects(db.query('select * from public.accord_lounge_reports'));
 await assert.rejects(db.query("select public.accord_lounge_moderate('"+id+"','hide')"));
 await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(db.exec("insert into public.accord_lounge_reports(id,message_id,reporter,reason) values(gen_random_uuid(),'"+id+"','G'||repeat('B',55),'Spam')"));
 await db.exec("select public.accord_lounge_moderate('"+id+"','hide'); reset role; set role anon;");
 assert.equal((await db.query('select * from public.accord_lounge_messages')).rows.length,0);
 await db.exec("reset role; set role service_role; select public.accord_lounge_moderate('"+id+"','restore'); reset role; set role anon;");
 assert.equal((await db.query('select * from public.accord_lounge_messages')).rows.length,1);
 await db.exec("reset role; set role service_role; update public.accord_lounge_messages set created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour'; select public.accord_lounge_cleanup();");
 assert.equal((await db.query('select * from public.accord_lounge_reports')).rows.length,0);
 }finally{await db.close();}
});

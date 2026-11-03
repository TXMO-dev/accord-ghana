import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('private room SQL isolates rooms, consumes nonces and enforces session access',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon; create role authenticated; create role service_role;');
 await db.exec(await readFile(new URL('../supabase/migrations/20261103_private_rooms.sql',import.meta.url),'utf8'));
 const join=(nonce,room,wallet,client,freelancer,token)=>db.query('select accord_room_join($1,$2,$3,$4,$5,$6)',[nonce,room,wallet,client,freelancer,token]);
 const request=(token,action='poll',text=null,id=null)=>db.query('select accord_room_request($1,$2,$3,$4,0) as data',[token,action,text,id]);
 await join('nonce1','roomA','clientA','clientA','freelancerA','tokenA');
 await join('nonce2','roomB','clientB','clientB','freelancerB','tokenB');
 await assert.rejects(join('nonce1','roomA','clientA','clientA','freelancerA','replay'));
 await assert.rejects(join('nonce3','roomA','stranger','clientA','freelancerA','strangerToken'));
 const id='12345678-1234-4234-8234-123456789012';
 await request('tokenA','comment','A private comment',id);
 await request('tokenA','comment','A private comment',id);
 assert.equal((await request('tokenA')).rows[0].data.comments.length,1);
 assert.equal((await request('tokenB')).rows[0].data.comments.length,0);
 await assert.rejects(request('unknown'));
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from accord_room_comments'));
 await assert.rejects(request('tokenA'));
 await db.exec('reset role');
 await request('tokenA','leave');await assert.rejects(request('tokenA'));
 await db.exec("update accord_room_sessions set expires_at=now()-interval '1 second'");
 await assert.rejects(request('tokenB'));
 }finally{await db.close();}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {cleanLoungePose,smoothPose} from '../src/lounge-motion-model.js';
import {createPresenceHandler} from '../api/lounge-presence.js';
import {sealPresence} from '../server/lounge-session.js';
import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
test('motion sanitizes coordinates, rejects outside plots, and interpolates shortest turn',()=>{
 assert.deepEqual(cleanLoungePose({active:false,x:999}),{active:false});
 for(const x of [NaN,Infinity,-40,0])assert.throws(()=>cleanLoungePose({active:true,x,z:20,yaw:0}));
 const p=cleanLoungePose({active:true,x:-23.1234,z:22,yaw:7,moving:true,wallet:'fake'});assert.equal(p.x,-23.12);assert.equal(p.wallet,undefined);
 const n=smoothPose({x:0,z:0,yaw:3.1},{x:2,z:1,yaw:-3.1},.016);assert.ok(n.x>0&&n.x<2);assert.ok(n.yaw>3.1&&n.yaw<3.2);
});
test('motion cannot bypass signed consent, expiry, wallet binding or valid sequences',async()=>{
 const secret='test-only-presence-secret-more-than-32',now=1000,env={SUPABASE_URL:'https://test',SUPABASE_SECRET_KEY:'private',ROOM_AUTH_SECRET:secret};let calls=[];
 const handler=createPresenceHandler({env,now:()=>now,request:async(u,o)=>{calls.push(JSON.parse(o.body));return {ok:true,json:async()=>true};}});
 const p={kind:'lounge-presence',wallet:'GOWNER',id:'11111111-1111-1111-1111-111111111111',expires:now+1000};
 for(const [shareMotion,expires,sequence,expected] of [[false,2000,1,400],[true,999,1,400],[true,2000,-1,400],[true,2000,1,200]]){
 const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;}};
 await handler({method:'POST',headers:{origin:'https://accord-ghana.vercel.app'},body:{action:'motion',session:sealPresence({...p,shareMotion,expires},secret),wallet:'GOTHER',sequence,pose:{active:true,x:-23,z:22,yaw:0}}},res);assert.equal(res.code,expected);}
 assert.equal(calls.length,1);assert.equal(calls[0].owner_wallet,p.wallet);
});
test('SQL movement update enforces owner, sequence, leave, expiry, and browser denial',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create table accord_lounge_presence(id uuid primary key,wallet text,departed boolean default false,expires_at timestamptz,seen_at timestamptz);grant select,update on accord_lounge_presence to service_role;");
 const sql=readFileSync('LOUNGE-LIVE-MOTION.sql','utf8');await db.exec(sql);await db.exec(sql);
 const id='11111111-1111-1111-1111-111111111111';await db.query("insert into accord_lounge_presence(id,wallet,expires_at) values($1,'OWNER',now()+interval '30 minutes')",[id]);
 const move=async(wallet,seq)=> (await db.query('select accord_lounge_move($1,$2,$3,$4) as ok',[id,wallet,seq,{active:true,x:-23,z:22,yaw:0}])).rows[0].ok;
 await db.exec('set role service_role');assert.equal(await move('OTHER',1),false);assert.equal(await move('OWNER',1),true);assert.equal(await move('OWNER',1),false);assert.equal(await move('OWNER',2),false);
 await db.exec("update accord_lounge_presence set motion_at=now()-interval '1 second',departed=true");assert.equal(await move('OWNER',2),false);
 await db.exec("update accord_lounge_presence set departed=false,expires_at=now()-interval '1 second'");assert.equal(await move('OWNER',2),false);
 await db.exec('reset role');for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(move('OWNER',3));await db.exec('reset role');}
 }finally{await db.close();}
});

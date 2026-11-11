import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {cleanScopeProposal,scopeEditable} from '../src/scope-change-model.js';
import {roomScope} from '../server/room-scope.js';
const termsHash='a'.repeat(64),proposal={termsHash,scope:'Add a mobile layout',reason:'Small screens need support',priceEffect:'Separate milestone; no change to existing escrow',timeEffect:'Three extra days'};
test('scope input is bounded, secret-free and bound to the original conditions',()=>{
 assert.deepEqual(cleanScopeProposal(proposal,termsHash),proposal);
 for(const bad of [{...proposal,termsHash:'b'.repeat(64)},{...proposal,scope:''},{...proposal,reason:'S'+'A'.repeat(55)},{...proposal,timeEffect:'a'.repeat(201)}])assert.throws(()=>cleanScopeProposal(bad,termsHash));
 for(const state of ['Draft','Funded','Submitted'])assert.equal(scopeEditable(state),true);
 for(const state of ['Disputed','Released','Cancelled','Settled','Not verified'])assert.equal(scopeEditable(state),false);
});
test('scope storage isolates rooms, denies browser roles and serializes versioned two-party responses',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 await db.exec(readFileSync('supabase/migrations/20261103_private_rooms.sql','utf8'));
 const sql=readFileSync('SCOPE-PROPOSALS.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec("insert into accord_rooms(id,client,freelancer) values('room','client','freelancer'),('other','outsider','otherfreelancer');insert into accord_room_sessions(token,room,wallet) values('ct','room','client'),('ft','room','freelancer'),('ot','other','outsider');");
 const request=async(token,action='list',id=null,version=null,p=null,room='room')=>(await db.query('select accord_scope_request($1,$2,$3,$4,$5,$6::jsonb) as data',[token,room,action,id,version,p?JSON.stringify(p):null])).rows[0].data;
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from accord_scope_proposals'));await assert.rejects(request('ct'));await db.exec('reset role');}
 await db.exec('set role service_role');
 await assert.rejects(request('ot'));await assert.rejects(request('unknown'));
 const id=randomUUID();let data=await request('ct','create',id,0,proposal);assert.equal(data.proposals[0].version,1);assert.equal(data.proposals[0].proposer,'client');
 assert.equal((await request('ct','create',id,0,proposal)).proposals.length,1);
 await assert.rejects(request('ct','create',id,0,{...proposal,scope:'Changed'}));
 await assert.rejects(request('ft','create',randomUUID(),1,proposal));
 await assert.rejects(request('ct','accept',id,1,{termsHash}));
 await assert.rejects(request('ft','withdraw',id,1,{termsHash}));
 await assert.rejects(request('ft','accept',id,0,{termsHash}));
 await assert.rejects(request('ft','accept',id,1,{termsHash:'b'.repeat(64)}));
 data=await request('ft','accept',id,1,{termsHash});assert.equal(data.proposals[0].status,'accepted');assert.equal(data.proposals[0].decided_by,'freelancer');
 assert.equal((await request('ft','accept',id,1,{termsHash})).proposals[0].status,'accepted');
 await assert.rejects(request('ft','reject',id,1,{termsHash}));await assert.rejects(request('ct','withdraw',id,1,{termsHash}));
 const second=randomUUID();await assert.rejects(request('ft','create',second,0,proposal));await request('ft','create',second,1,proposal);
 await db.query("update accord_scope_proposals set expires_at=now()-interval '1 second' where id=$1",[second]);
 await assert.rejects(request('ct','accept',second,2,{termsHash}));
 const third=randomUUID();await request('ct','create',third,2,proposal);await request('ct','withdraw',third,3,{termsHash});
 await assert.rejects(request('ft','accept',third,3,{termsHash}));
 assert.equal((await request('ot','list',null,null,null,'other')).proposals.length,0);
 assert.equal((await request('ct')).proposals.length,3);
 await db.exec("reset role;update accord_room_sessions set expires_at=now()-interval '1 second' where token='ct';set role service_role;");await assert.rejects(request('ct'));
 }finally{await db.close();}
});
test('scope server rechecks chain state and terms before writes, then broadcasts only invalidation',async()=>{
 let state='Funded',calls=[];
 const call=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return {ok:true,json:async()=>({proposals:[]})};};
 const membership=async()=>({state:[state],terms:Buffer.from(termsHash,'hex')});
 const body={action:'scope-create',session:'session',id:'AC-'+randomUUID(),proposalId:randomUUID(),version:0,proposal};
 await roomScope(body,{wallet:'client',room:'room',membership,call});
 assert.equal(calls[0].body.p_proposal.termsHash,termsHash);assert.notEqual(calls[0].body.p_token,'session');assert.deepEqual(calls[1].body.messages[0].payload,{changed:true});
 calls=[];state='Disputed';await assert.rejects(roomScope(body,{wallet:'client',room:'room',membership,call}));assert.equal(calls.length,0);
 state='Funded';await assert.rejects(roomScope({...body,proposal:{...proposal,termsHash:'b'.repeat(64)}},{wallet:'client',room:'room',membership,call}));assert.equal(calls.length,0);
 await assert.rejects(roomScope({...body,action:'scope-accept',termsHash:'b'.repeat(64)},{wallet:'client',room:'room',membership,call}));
 await roomScope({...body,action:'scope-list'},{wallet:'client',room:'room',membership:()=>{throw Error('History should not require a new chain write');},call});assert.equal(calls.length,1);
});

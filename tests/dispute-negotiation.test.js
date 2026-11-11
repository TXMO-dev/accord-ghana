import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {cleanDisputeProposal} from '../src/dispute-model.js';
import {roomDispute} from '../server/room-dispute.js';
const termsHash='a'.repeat(64),proposal={termsHash,reason:'Partially completed work',evidence:'Review notes from today',sellerUnits:'5000000',totalUnits:'10000000'};
test('negotiation amounts are exact, bounded, and tied to verified terms and total',()=>{
 assert.deepEqual(cleanDisputeProposal(proposal,termsHash,'10000000'),proposal);
 for(const patch of [{sellerUnits:'10000001'},{sellerUnits:'-1'},{sellerUnits:'0.5'},{totalUnits:'2'},{termsHash:'b'.repeat(64)},{evidence:'S'+'A'.repeat(55)},{reason:''}])assert.throws(()=>cleanDisputeProposal({...proposal,...patch},termsHash,'10000000'));
 assert.equal(cleanDisputeProposal({...proposal,sellerUnits:'0'},termsHash,'10000000').sellerUnits,'0');
 const large='900719925474099312345';assert.equal(cleanDisputeProposal({...proposal,sellerUnits:large,totalUnits:large},termsHash,large).sellerUnits,large);
});
test('private negotiation isolates participants and serializes replies and counteroffers',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 await db.exec(readFileSync('supabase/migrations/20261103_private_rooms.sql','utf8'));
 const sql=readFileSync('DISPUTE-NEGOTIATION.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec("insert into accord_rooms(id,client,freelancer) values('room','client','freelancer'),('other','outsider','otherfreelancer');insert into accord_room_sessions(token,room,wallet) values('ct','room','client'),('ft','room','freelancer'),('ot','other','outsider');");
 const call=async(token,action='list',id=null,version=null,p=null,room='room')=>(await db.query('select accord_dispute_request($1,$2,$3,$4,$5,$6::jsonb) as data',[token,room,action,id,version,p?JSON.stringify(p):null])).rows[0].data;
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from accord_dispute_proposals'));await assert.rejects(call('ct'));await db.exec('reset role');}
 await db.exec('set role service_role');await assert.rejects(call('ot'));await assert.rejects(call('invalid'));
 const id=randomUUID();let result=await call('ct','create',id,0,proposal);assert.equal(result.proposals[0].seller_units,'5000000');
 assert.equal((await call('ct','create',id,0,proposal)).proposals.length,1);
 await assert.rejects(call('ct','create',id,0,{...proposal,sellerUnits:'2'}));
 await assert.rejects(call('ft','create',randomUUID(),1,proposal));await assert.rejects(call('ct','accept',id,1,{termsHash}));
 await assert.rejects(call('ft','accept',id,0,{termsHash}));await assert.rejects(call('ft','accept',id,1,{termsHash:'b'.repeat(64)}));
 await call('ft','reject',id,1,{termsHash});await assert.rejects(call('ft','accept',id,1,{termsHash}));
 const counter=randomUUID();await call('ft','create',counter,1,{...proposal,sellerUnits:'6000000'});
 await call('ct','accept',counter,2,{termsHash});result=await call('ct','accept',counter,2,{termsHash});assert.equal(result.proposals[0].status,'accepted');assert.equal(result.proposals[1].status,'rejected');
 const expired=randomUUID();await call('ct','create',expired,2,proposal);await db.query("update accord_dispute_proposals set expires_at=now()-interval '1 second' where id=$1",[expired]);await assert.rejects(call('ft','accept',expired,3,{termsHash}));
 assert.equal((await call('ot','list',null,null,null,'other')).proposals.length,0);
 await db.exec("reset role;update accord_room_sessions set expires_at=now()-interval '1 second' where token='ct';set role service_role;");await assert.rejects(call('ct'));
 }finally{await db.close();}
});
test('negotiation writes recheck disputed chain state, supported asset and exact amount',async()=>{
 let state='Disputed',calls=[];const call=async(path,opts)=>{calls.push({path,body:JSON.parse(opts.body)});return {ok:true,json:async()=>({proposals:[]})};};
 const membership=async()=>({state:[state],asset:'asset',amount:10000000n,terms:Buffer.from(termsHash,'hex')});
 const body={action:'dispute-create',session:'session',id:'AC-'+randomUUID(),proposalId:randomUUID(),version:0,proposal};
 await roomDispute(body,{wallet:'client',room:'room',membership,call,asset:'asset'});assert.equal(calls[0].body.p_proposal.totalUnits,'10000000');assert.deepEqual(calls[1].body.messages[0].payload,{changed:true});
 calls=[];state='Released';await assert.rejects(roomDispute(body,{wallet:'client',room:'room',membership,call,asset:'asset'}));assert.equal(calls.length,0);
 state='Disputed';await assert.rejects(roomDispute(body,{wallet:'client',room:'room',membership,call,asset:'wrong'}));
 await assert.rejects(roomDispute({...body,proposal:{...proposal,totalUnits:'2'}},{wallet:'client',room:'room',membership,call,asset:'asset'}));
 await roomDispute({...body,action:'dispute-list'},{wallet:'client',room:'room',membership:()=>{throw Error('History does not require a transaction');},call,asset:'asset'});
});

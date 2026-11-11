import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {Keypair,Account,Contract,Address,TransactionBuilder,Networks,nativeToScVal} from '@stellar/stellar-sdk';
import {workFields,verifyWorkRelease} from '../server/work-proof.js';
import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
import {sha} from '../server/room-auth.js';
const buyer=Keypair.random(),seller=Keypair.random(),contract=Address.contract(Buffer.alloc(32,7)).toString(),id='AC-11111111-1111-4111-8111-111111111111';
function receipt(action='release',network=Networks.TESTNET){
 const tx=new TransactionBuilder(new Account(buyer.publicKey(),'1'),{fee:'100',networkPassphrase:network}).addOperation(new Contract(contract).call(action,nativeToScVal(Buffer.from(sha(id),'hex'),{type:'bytes'}))).setTimeout(60).build();
 return {r:{status:'SUCCESS',envelopeXdr:tx.toXDR()},hash:Buffer.from(tx.hash()).toString('hex')};
}
test('work cards require the exact successful release and freelancer, not a settlement',()=>{
 const {r,hash}=receipt(),a={state:['Released'],seller:seller.publicKey(),buyer:buyer.publicKey()},f={wallet:seller.publicKey(),id,hash,contract};
 assert.equal(verifyWorkRelease(r,a,f),true);
 for(const patch of [{state:['Settled']},{seller:buyer.publicKey()},{buyer:seller.publicKey()}])assert.throws(()=>verifyWorkRelease(r,{...a,...patch},f));
 for(const patch of [{wallet:buyer.publicKey()},{hash:'0'.repeat(64)},{id:id.replace('4111','4112')},{contract:Address.contract(Buffer.alloc(32,8)).toString()}])assert.throws(()=>verifyWorkRelease(r,a,{...f,...patch}));
 assert.throws(()=>verifyWorkRelease({...r,status:'FAILED'},a,f));
 for(const action of ['settle','submit','fund']){const x=receipt(action);assert.throws(()=>verifyWorkRelease(x.r,a,{...f,hash:x.hash}));}
 const main=receipt('release',Networks.PUBLIC);assert.throws(()=>verifyWorkRelease(main.r,a,{...f,hash:main.hash}));
});
test('public fields are bounded and signatures are purpose and content bound',()=>{
 const f={id,hash:'a'.repeat(64),title:' Design ',description:'Public description'};
 assert.equal(workFields(f).title,'Design');
 for(const p of [{title:''},{description:'S'+'A'.repeat(55)},{title:'x'.repeat(61)},{description:'private\nline'},{hash:'x'}])assert.throws(()=>workFields({...f,...p}));
 const secret='s'.repeat(32),origin='https://accord-ghana.vercel.app',now=100000;
 const p=makeLoungeProof({wallet:seller.publicKey(),name:'Design',body:JSON.stringify(f),purpose:'work-save',origin,secret,now});
 const signature=Buffer.from(seller.sign(createHash('sha256').update('Stellar Signed Message:\n'+p.message).digest())).toString('base64');
 assert.equal(verifyLoungeProof({...p,signature,origin,secret,now,purpose:'work-save'}).wallet,seller.publicKey());
 assert.throws(()=>verifyLoungeProof({...p,signature,origin,secret,now,purpose:'work-remove'}));
 assert.throws(()=>verifyLoungeProof({...p,signature,origin,secret,now:now+120001,purpose:'work-save'}));
});
test('database restricts writes, hides withdrawn cards and prevents replay or ownership takeover',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 const sql=readFileSync('WORK-CARDS.sql','utf8');await db.exec(sql);await db.exec(sql);
 const write=(revision,remove=false,wallet=seller.publicKey(),hash='a'.repeat(64))=>db.query('select accord_work_card_write($1,$2,$3,$4,$5,$6,$7,$8)',[wallet,contract,id,hash,revision,remove,remove?null:'Design',remove?null:'Public description']);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);assert.equal((await db.query('select * from accord_work_cards')).rows.length,0);await assert.rejects(write(0));await db.exec('reset role');}
 await db.exec('set role service_role');await write(0);await assert.rejects(write(0));await assert.rejects(write(1,false,buyer.publicKey()));await assert.rejects(write(1,false,seller.publicKey(),'b'.repeat(64)));
 await db.exec('reset role;set role anon');assert.equal((await db.query('select * from accord_work_cards')).rows.length,1);
 await assert.rejects(db.exec("update accord_work_cards set hidden=false"));
 await db.exec('reset role;set role service_role');await write(1,true);await assert.rejects(write(0));
 const row=(await db.query('select * from accord_work_cards')).rows[0];assert.equal(row.title,null);assert.equal(row.description,null);assert.equal(row.revision,2);
 await db.exec('reset role;set role anon');assert.equal((await db.query('select * from accord_work_cards')).rows.length,0);
 await db.exec('reset role;update accord_work_cards set hidden=true;set role service_role');await write(2);
 await db.exec('reset role;set role anon');assert.equal((await db.query('select * from accord_work_cards')).rows.length,0);
 }finally{await db.close();}
});

import {createWorkCardsHandler} from '../api/work-cards.js';
import config from '../public/network.json' with {type:'json'};
test('API binds signed fields, rechecks the release, and rejects wrong origins and missing consent',async()=>{
 const secret='s'.repeat(32),origin='https://accord-ghana.vercel.app',now=100000;
 const tx=new TransactionBuilder(new Account(buyer.publicKey(),'1'),{fee:'100',networkPassphrase:Networks.TESTNET}).addOperation(new Contract(config.contractId).call('release',nativeToScVal(Buffer.from(sha(id),'hex'),{type:'bytes'}))).setTimeout(60).build();
 const hash=Buffer.from(tx.hash()).toString('hex');let writes=[],state='Released',verified=0;
 const request=async(url,options={})=>({ok:true,json:async()=>{
 if(url.includes('/accounts/'))return {signers:[{key:seller.publicKey(),weight:1}],thresholds:{low_threshold:1,med_threshold:1,high_threshold:1}};
 if(url.includes('/transactions/'))return {hash,successful:true,envelope_xdr:tx.toXDR()};
 if(url.includes('/rpc/')){writes.push(JSON.parse(options.body));return 1;}return [];
 }});
 const handler=createWorkCardsHandler({env:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'test',ROOM_AUTH_SECRET:secret},request,now:()=>now,getAgreement:async()=>{verified++;return {state:[state],seller:seller.publicKey(),buyer:buyer.publicKey()};}});
 const call=async(body,header=origin)=>{let code,data;const res={setHeader(){},status(n){code=n;return this;},json(d){data=d;return this;}};await handler({method:'POST',headers:{origin:header},body},res);return {code,data};};
 const body={action:'challenge',operation:'save',wallet:seller.publicKey(),id,hash,title:'Chosen title',description:'Chosen public text',consent:true};
 assert.equal((await call({...body,consent:false})).code,400);assert.equal((await call(body,'https://other.example')).code,403);
 const challenge=await call(body);assert.equal(challenge.code,200,JSON.stringify(challenge.data));const proof=challenge.data,signature=Buffer.from(seller.sign(createHash('sha256').update('Stellar Signed Message:\n'+proof.message).digest())).toString('base64');
 const saved=await call({action:'save',token:proof.token,signature,title:'Tampered',description:'Injected'});assert.equal(saved.code,200,JSON.stringify(saved.data));
 assert.equal(writes[0].p_title,'Chosen title');assert.equal(writes[0].p_description,'Chosen public text');assert.equal(verified,1);
 state='Disputed';assert.equal((await call({action:'save',token:proof.token,signature})).code,400);assert.equal(writes.length,1);
 assert.equal((await call({action:'remove',token:proof.token,signature})).code,400);
});

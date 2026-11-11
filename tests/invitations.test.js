import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Keypair} from '@stellar/stellar-sdk';
import {PGlite} from '@electric-sql/pglite';
import {makeInvitationProof,verifyInvitationProof,invitationFields,invitationSession,readInvitationSession,invitationId,invitationOrigin} from '../server/invitation-auth.js';
import {createInvitationsHandler} from '../api/invitations.js';
const secret='disposable-test-only-secret-more-than-32',client=Keypair.random(),freelancer=Keypair.random(),outsider=Keypair.random(),now=1000000;
const signed=(proof,key)=>Buffer.from(key.sign(createHash('sha256').update('Stellar Signed Message:\n'+proof.message).digest())).toString('base64');
test('invitation proof binds action, content, wallet and expiry; inbox tokens cannot authorize writes',()=>{
 const proof=makeInvitationProof({wallet:client.publicKey(),operation:'create',fields:{recipient:freelancer.publicKey(),client:client.publicKey(),id:randomUUID(),title:'Website',brief:'A prototype',revision:0},secret,now});
 const p=verifyInvitationProof({...proof,signature:signed(proof,client),secret,now:now+1});assert.equal(p.operation,'create');
 assert.throws(()=>verifyInvitationProof({...proof,signature:signed(proof,outsider),secret,now}));
 assert.throws(()=>verifyInvitationProof({...proof,signature:signed(proof,client),secret,now:now+120000}));
 const [encoded,mac]=proof.token.split('.'),tampered=JSON.parse(Buffer.from(encoded,'base64url'));tampered.recipient=outsider.publicKey();
 assert.throws(()=>verifyInvitationProof({token:Buffer.from(JSON.stringify(tampered)).toString('base64url')+'.'+mac,signature:signed(proof,client),secret,now}));
 const session=invitationSession(p,secret);assert.equal(readInvitationSession(session,secret,now).wallet,client.publicKey());
 assert.throws(()=>readInvitationSession(session,secret,now+600000));
 assert.throws(()=>readInvitationSession(proof.token,secret,now));
 assert.throws(()=>verifyInvitationProof({token:session,signature:signed(proof,client),secret,now}));
 assert.equal(invitationId(client.publicKey(),now),invitationId(client.publicKey(),now+1));
 assert.notEqual(invitationId(client.publicKey(),now),invitationId(client.publicKey(),now+60000));
});
test('invitation brief validation rejects self invites, secrets and oversized input',()=>{
 const input={wallet:client.publicKey(),recipient:freelancer.publicKey(),title:' Website ',brief:'A prototype'};
 assert.equal(invitationFields(input).title,'Website');
 for(const fields of [{recipient:client.publicKey()},{brief:'x'.repeat(601)},{brief:client.secret()},{recipient:'Gbad'},{title:''}])assert.throws(()=>invitationFields({...input,...fields}));
});
test('private database permissions, actor restrictions, terminal states, replay and expiry',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
  const sql=readFileSync('PRIVATE-INVITATIONS.sql','utf8');await db.exec(sql);await db.exec(sql);
  const id=randomUUID(),actor=client.publicKey(),recipient=freelancer.publicKey();
  const write=(op,who=actor,target=id,rev=0,to=recipient,title='Prototype')=>db.query('select public.accord_invitation_write($1,$2,$3,$4,$5,$6,$7) as result',[who,op,target,to,title,'Private test brief',rev]);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.accord_invitations'));await assert.rejects(write('create'));await db.exec('reset role');}
  await db.exec('set role service_role');await write('create');await write('create');
  assert.equal((await db.query('select count(*) as n from public.accord_invitations')).rows[0].n,1);
  await assert.rejects(write('create',actor,id,0,recipient,'Changed brief'));
  await assert.rejects(write('create',actor,randomUUID())); // duplicate pending recipient
  await assert.rejects(write('accept',actor));await assert.rejects(write('accept',outsider.publicKey()));
  const accepted=(await write('accept',recipient)).rows[0].result;assert.equal(accepted.status,'accepted');assert.equal(accepted.revision,1);
  assert.deepEqual((await write('accept',recipient)).rows[0].result,accepted);
  await assert.rejects(write('decline',recipient));await assert.rejects(write('cancel',actor));
  const expired=randomUUID();await write('create',actor,expired);
  await db.query("update public.accord_invitations set expires_at=now()-interval '1 minute' where id=$1",[expired]);
  await assert.rejects(write('accept',recipient,expired));
  const cancelled=randomUUID();await write('create',actor,cancelled);await write('cancel',actor,cancelled);await assert.rejects(write('accept',recipient,cancelled));
 }finally{await db.close();}
});
test('API lists only proven wallet, ignores spoofed wallet and rejects nonparticipant actions',async()=>{
 const paths=[];let rows=[];
 const handler=createInvitationsHandler({env:{SUPABASE_URL:'https://db.example',SUPABASE_SECRET_KEY:'test',ROOM_AUTH_SECRET:secret},now:()=>now,request:async(url,options)=>{
  paths.push(url);if(url.includes('horizon-testnet'))return {ok:true,json:async()=>({signers:[{key:client.publicKey(),weight:1}],thresholds:{low_threshold:1,med_threshold:1,high_threshold:1}})};
  return {ok:true,json:async()=>rows};
 }});
 const call=async(body,origin=invitationOrigin)=>{const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await handler({method:'POST',headers:{origin},body},res);return res;};
 let r=await call({action:'challenge',operation:'inbox',wallet:client.publicKey()});assert.equal(r.code,200);
 r=await call({action:'commit',token:r.data.token,signature:signed(r.data,client)});assert.equal(r.code,200);const session=r.data.session;
 r=await call({action:'list',session,wallet:outsider.publicKey()});assert.equal(r.code,200);
 assert.ok(paths.at(-1).includes('client.eq.'+client.publicKey()+',recipient.eq.'+client.publicKey()));assert.ok(!paths.at(-1).includes(outsider.publicKey()));
 assert.equal((await call({action:'list',session},'https://evil.example')).code,403);
 assert.equal((await call({action:'list',session:'bad'})).code,400);
 const id=randomUUID();rows=[{id,client:outsider.publicKey(),recipient:freelancer.publicKey(),status:'pending',expires_at:new Date(now+100000).toISOString()}];
 assert.equal((await call({action:'challenge',operation:'accept',id,wallet:client.publicKey(),session})).code,400);
 assert.equal((await call({action:'challenge',operation:'accept',id,wallet:outsider.publicKey(),session})).code,400);
});

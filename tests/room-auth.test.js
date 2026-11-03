import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Keypair} from '@stellar/stellar-sdk';
import {makeChallenge,verifyChallenge} from '../server/room-auth.js';
import {createProgressTracker} from '../src/live-progress.js';
const key=Keypair.random(),other=Keypair.random(),secret='test-only-secret-not-a-deployment-secret',origin='https://accord-ghana.vercel.app',contract='test-contract';
const input={wallet:key.publicKey(),id:'AC-12345678-1234-1234-1234-123456789012',secret,origin,contract,now:100000};
const sign=(message,k=key)=>Buffer.from(k.sign(createHash('sha256').update('Stellar Signed Message:\n'+message).digest())).toString('base64');
test('room proof verifies expected wallet and readable challenge',()=>{const c=makeChallenge(input);assert.equal(verifyChallenge({...input,token:c.token,signature:sign(c.message)}).wallet,key.publicKey());});
test('different wallet cannot impersonate participant',()=>{const c=makeChallenge(input);assert.throws(()=>verifyChallenge({...input,token:c.token,signature:sign(c.message,other)}));});
test('expired, cross-domain, cross-contract and altered challenges fail closed',()=>{const c=makeChallenge(input),proof={...input,token:c.token,signature:sign(c.message)};for(const patch of [{now:220001},{origin:'https://other.example'},{contract:'another-contract'},{token:c.token+'x'}])assert.throws(()=>verifyChallenge({...proof,...patch}));});
test('a raw transaction-style signature cannot authenticate a room',()=>{const c=makeChallenge(input);assert.throws(()=>verifyChallenge({...input,token:c.token,signature:Buffer.from(key.sign(Buffer.from(c.message))).toString('base64')}));});
test('celebrations require a new verified forward transition, not reload or pending state',()=>{const track=createProgressTracker(),d={id:'one',verified:true,state:'Draft'};assert.equal(track(d),null);assert.equal(track({...d,state:'Released',pending:true}),null);assert.equal(track({...d,state:'Funded'}),'Funded');assert.equal(track({...d,state:'Funded'}),null);assert.equal(track({...d,id:'two',state:'Released'}),null);assert.equal(track({...d,state:'Disputed'}),null);assert.equal(track({...d,state:'Released'}),null);});

import {checkWalletSelection} from '../src/wallet-check.js';
test('wallet preflight distinguishes a shared-profile account change from wrong network and locked wallet',()=>{
 const expected=key.publicKey(),selected=other.publicKey(),network={networkPassphrase:'testnet'};
 assert.doesNotThrow(()=>checkWalletSelection(expected,expected,{address:expected},network,'testnet'));
 assert.throws(()=>checkWalletSelection(expected,expected,{address:selected},network,'testnet'),e=>e.code==='WALLET_SELECTION'&&e.message.includes(expected.slice(0,6))&&e.message.includes(selected.slice(0,6)));
 assert.throws(()=>checkWalletSelection(expected,expected,{address:expected},{networkPassphrase:'mainnet'},'testnet'),/not on Stellar Testnet/);
 assert.throws(()=>checkWalletSelection(expected,expected,{error:{}},network,'testnet'),/Unlock your wallet/);
});

import {verifiedActivity} from '../server/room-activity.js';
import {Account as ActivityAccount,Contract as ActivityContract,TransactionBuilder as ActivityBuilder,Networks as ActivityNetworks,Address as ActivityAddress,nativeToScVal as activityVal} from '@stellar/stellar-sdk';
import {sha as activitySha} from '../server/room-auth.js';
test('participant notifications require a successful exact transaction and agreement',()=>{
 const contract=ActivityAddress.contract(Buffer.alloc(32,7)).toString(),id=input.id,wallet=key.publicKey();
 const tx=new ActivityBuilder(new ActivityAccount(wallet,'1'),{fee:'100',networkPassphrase:ActivityNetworks.TESTNET}).addOperation(new ActivityContract(contract).call('fund',activityVal(Buffer.from(activitySha(id),'hex'),{type:'bytes'}))).setTimeout(60).build();
 const receipt={status:'SUCCESS',envelopeXdr:tx.toEnvelope()},context={hash:tx.hash().toString('hex'),wallet,contract,id};
 assert.equal(verifiedActivity(receipt,context).action,'fund');
 for(const change of [{wallet:other.publicKey()},{hash:'0'.repeat(64)},{id:id+'different'},{contract:ActivityAddress.contract(Buffer.alloc(32,8)).toString()}])assert.throws(()=>verifiedActivity(receipt,{...context,...change}));
 assert.throws(()=>verifiedActivity({...receipt,status:'FAILED'},context));
});

test('room sign-in proofs are bound to the declared Stellar network',()=>{
 const c=makeChallenge({...input,network:'MAINNET'});
 assert.match(c.message,/Stellar Mainnet/);
 const proof={...input,token:c.token,signature:sign(c.message)};
 assert.throws(()=>verifyChallenge(proof));
 assert.equal(verifyChallenge({...proof,network:'MAINNET'}).wallet,key.publicKey());
});
import {checkedWalletSign} from '../src/wallet-signing.js';
test('multi-wallet signing routes each signature and rejects account/network drift',async()=>{
 const options={address:'expected',networkPassphrase:'testnet'};
 const api={getAddress:async()=>({address:'expected'}),getNetworkDetails:async()=>({networkPassphrase:'testnet'})};
 for(const [method,field] of Object.entries({signTransaction:'signedTxXdr',signAuthEntry:'signedAuthEntry',signMessage:'signedMessage'})){
  let calls=0;const signer={...api,[method]:async(value,opts)=>{calls++;assert.equal(value,'payload');assert.equal(opts,options);return {[field]:'signature'};}};
  assert.equal((await checkedWalletSign(signer,method,'payload',options,'testnet'))[field],'signature');assert.equal(calls,1);
  await assert.rejects(checkedWalletSign(signer,method,'payload',{...options,networkPassphrase:'mainnet'},'testnet'));assert.equal(calls,1);
  await assert.rejects(checkedWalletSign({...signer,[method]:async()=>({[field]:'signature',signerAddress:'other'})},method,'payload',options,'testnet'),/different signer/);
  let checks=0;await assert.rejects(checkedWalletSign({...signer,getAddress:async()=>({address:++checks===1?'expected':'other'})},method,'payload',options,'testnet'),/changed/);
  await assert.rejects(checkedWalletSign({...signer,[method]:async()=>({error:{message:'Rejected'}})},method,'payload',options,'testnet'),/Rejected/);
 }
});
import {cleanAvatar} from '../src/avatar-model.js';
import {roomSettlement as avatarRequest} from '../server/room-settlement.js';
test('avatar updates use authenticated room identity and allowlisted appearance only',async()=>{
 const id=input.id,contract='contract',room=activitySha(contract+':'+id),wallet=key.publicKey();let sent;
 const fetcher=async(url,options)=>{if(url.includes('accord_room_sessions'))return {ok:true,json:async()=>[{room,wallet,expires_at:new Date(Date.now()+60000).toISOString()}]};if(url.includes('accord_rooms?'))return {ok:true,json:async()=>[{client:wallet,freelancer:other.publicKey()}]};sent=JSON.parse(options.body);return {ok:true};};
 const result=await avatarRequest({action:'avatar',id,session:'a'.repeat(64),wallet:other.publicKey(),avatar:{skin:'https://evil.invalid/image',hair:'bun',role:'client'}},{config:{contractId:contract},env:{SUPABASE_URL:'https://test.invalid',SUPABASE_SECRET_KEY:'test'},fetcher});
 assert.equal(result.shared,true);assert.equal(sent.messages[0].payload.wallet,wallet);assert.equal(sent.messages[0].topic,'accord:'+room);assert.equal(sent.messages[0].private,true);assert.deepEqual(sent.messages[0].payload.avatar,cleanAvatar({hair:'bun'}));
 await assert.rejects(avatarRequest({action:'avatar',id,session:'a'.repeat(64)},{config:{contractId:contract},env:{SUPABASE_URL:'https://test.invalid'},fetcher:async()=>({ok:true,json:async()=>[]})}),/expired/);
});

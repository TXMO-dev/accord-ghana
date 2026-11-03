import test from 'node:test';
import {receiptEvents,searchAgreements} from '../src/library-model.js';
import assert from 'node:assert/strict';
test('receipt history excludes unsafe links, unknown actions and duplicate hashes',()=>{
 const h='a'.repeat(64);
 const events=receiptEvents([{action:'release',hash:h,confirmedAt:'not-a-date'},{action:'SUCCESS',hash:h},{action:'release',hash:'javascript:alert(1)'},{action:'invented',hash:'b'.repeat(64)},null]);
 assert.equal(events.length,1);assert.equal(events[0].label,'Payment released');assert.equal(events[0].confirmedAt,null);
});
test('library search combines title or ID search with unresolved transaction filter',()=>{
 const records=[{title:'Brand concept',id:'AC-one'},{title:'Web build',id:'AC-two',pending:'a'.repeat(64)}];
 assert.deepEqual(searchAgreements(records,' BRAND '),[records[0]]);assert.deepEqual(searchAgreements(records,'ac-TWO','pending'),[records[1]]);assert.deepEqual(searchAgreements(records,'brand','pending'),[]);assert.equal(records.length,2);
});
import {scValToNative,Asset,Networks} from '@stellar/stellar-sdk';
import {amount,validateContract,digest,NETWORK} from '../src/values.js';
test('only testnet is configured',()=>assert.equal(NETWORK,Networks.TESTNET));
test('amount conversion is exact to seven decimals',()=>assert.equal(scValToNative(amount('1.0000001')),10000001n));
test('smallest positive unit is retained',()=>assert.equal(scValToNative(amount('0.0000001')),1n));
test('unsafe amount inputs are rejected',()=>{for(const n of ['0','-1','NaN','Infinity','1e2','1.00000001','100001',''])assert.throws(()=>amount(n))});
test('native asset contract validates',()=>assert.equal(validateContract(Asset.native().contractId(NETWORK)),Asset.native().contractId(NETWORK)));
test('malformed and account addresses cannot be contracts',()=>assert.throws(()=>validateContract('GABC')));
test('terms hashing is stable and sensitive to content',async()=>{assert.deepEqual(await digest('terms'),await digest('terms'));assert.notDeepEqual(await digest('terms'),await digest('changed'));assert.equal((await digest('terms')).length,32)});
import {availableActions,formatUnits,validatePackage,stateName} from '../src/workspace-model.js';
test('workspace permissions cover both parties and exclude observers',()=>{
 const a={buyer:'client',seller:'freelancer',state:['Draft']};
 assert.deepEqual(availableActions(a,'client'),['fund']);assert.deepEqual(availableActions(a,'freelancer'),[]);
 a.state=['Funded'];assert.deepEqual(availableActions(a,'freelancer'),['submit','dispute']);assert.deepEqual(availableActions(a,'client'),['dispute']);
 a.state=['Submitted'];assert.deepEqual(availableActions(a,'client'),['release','dispute']);assert.deepEqual(availableActions(a,'freelancer'),['dispute']);
 for(const state of ['Draft','Funded','Submitted','Disputed','Released','Cancelled']){a.state=[state];assert.deepEqual(availableActions(a,'outsider'),[])}
 for(const state of ['Disputed','Released','Cancelled']){a.state=[state];assert.deepEqual(availableActions(a,'client'),[]);assert.deepEqual(availableActions(a,'freelancer'),[])}
});
test('test XLM display preserves precision',()=>{assert.equal(formatUnits(10000001n),'1.0000001');assert.equal(formatUnits(1n),'0.0000001');assert.equal(formatUnits(10000000n),'1')});
test('agreement exchange rejects unrelated deployments and malicious shapes',()=>{
 const p={version:1,network:'testnet',contract:'contract',id:'AC-12345678-1234-1234-1234-123456789abc',title:'Design',terms:'Deliver logo'};
 assert.equal(validatePackage(p,'contract').title,'Design');
 for(const change of [{network:'mainnet'},{contract:'another'},{id:'<script>'},{terms:''},{title:2},{version:2}])assert.throws(()=>validatePackage({...p,...change},'contract'));
 assert.deepEqual(validatePackage({...p,events:[{hash:'injected'}]},'contract').events,[]);
});
import {connectTestnet,requireWalletReviewClear} from '../src/wallet-policy.js';
test('security review hold prevents every wallet API request',async()=>{let calls=0;const api={isConnected:async()=>{calls++;return {isConnected:true}}};await assert.rejects(connectTestnet(api,NETWORK,true),/paused/);assert.equal(calls,0);assert.throws(()=>requireWalletReviewClear(true),/paused/)});
test('mainnet is rejected before requesting wallet access',async()=>{let requests=0;const api={isConnected:async()=>({isConnected:true}),getNetworkDetails:async()=>({networkPassphrase:Networks.PUBLIC}),requestAccess:async()=>{requests++;return {address:'test'}}};await assert.rejects(connectTestnet(api,NETWORK,false),/No connection request/);assert.equal(requests,0)});
test('network switch during approval cannot establish a session',async()=>{let reads=0;const api={isConnected:async()=>({isConnected:true}),getNetworkDetails:async()=>({networkPassphrase:++reads===1?NETWORK:Networks.PUBLIC}),requestAccess:async()=>({address:'test'})};await assert.rejects(connectTestnet(api,NETWORK,false),/network changed/)});
test('enabled Testnet handshake checks network before and after access',async()=>{const calls=[];const api={isConnected:async()=>({isConnected:true}),getNetworkDetails:async()=>{calls.push('network');return {networkPassphrase:NETWORK}},requestAccess:async()=>{calls.push('access');return {address:'test'}}};assert.equal(await connectTestnet(api,NETWORK,false),'test');assert.deepEqual(calls,['network','access','network'])});
import {localTestingAllowed} from '../src/local-mode.js';
import {createDisposableWallets} from '../src/disposable-wallets.js';
import {TransactionBuilder,Account,Operation,Keypair} from '@stellar/stellar-sdk';
test('local wallet mode requires dev build, explicit mode, HTTP and exact loopback host',()=>{
 const ok={dev:true,mode:'local-test',hostname:'127.0.0.1',protocol:'http:'};assert.equal(localTestingAllowed(ok),true);
 for(const change of [{dev:false},{mode:'production'},{hostname:'accord-ghana.vercel.app'},{hostname:'127.0.0.1.evil.example'},{hostname:'192.168.1.1'},{protocol:'https:'}])assert.equal(localTestingAllowed({...ok,...change}),false);
});
test('disposable wallets are distinct, replaceable and refuse mainnet or wrong-account signatures',()=>{
 const w=createDisposableWallets(),a=w.addresses();assert.notEqual(a.client,a.freelancer);assert.notEqual(createDisposableWallets().addresses().client,a.client);
 const tx=new TransactionBuilder(new Account(a.client,'0'),{fee:'100',networkPassphrase:NETWORK}).addOperation(Operation.manageData({name:'local-test',value:'test'})).setTimeout(60).build();
 assert.throws(()=>w.sign(tx.toXDR(),{networkPassphrase:Networks.PUBLIC,address:a.client}),/only sign/);
 w.select('freelancer');assert.throws(()=>w.sign(tx.toXDR(),{networkPassphrase:NETWORK,address:a.client}),/changed/);
 w.select('client');const signed=TransactionBuilder.fromXDR(w.sign(tx.toXDR(),{networkPassphrase:NETWORK,address:a.client}).signedTxXdr,NETWORK);
 assert.equal(Keypair.fromPublicKey(a.client).verify(signed.hash(),signed.signatures[0].signature),true);
 assert.equal(JSON.stringify(w).includes('secret'),false);
});


import {transactionHashHex} from '../src/values.js';
test('browser Uint8Array transaction hashes use hexadecimal, not comma-separated decimals',()=>{assert.equal(transactionHashHex(new Uint8Array([0,15,16,255])),'000f10ff');assert.match(transactionHashHex(new Uint8Array(32)),/^[a-f0-9]{64}$/)});
import {nextStep,milestoneProgress,cleanDraft} from '../src/workspace-model.js';
test('next steps distinguish signing parties, waiting parties, and observers',()=>{
 const a={buyer:'buyer',seller:'seller',state:['Draft']};assert.match(nextStep(a,'buyer'),/fund/);assert.match(nextStep(a,'seller'),/Waiting/);
 a.state=['Submitted'];assert.match(nextStep(a,'buyer'),/verify/);assert.match(nextStep(a,'seller'),/Waiting/);
 for(const state of ['Draft','Funded','Submitted','Released','Disputed','Cancelled']){a.state=[state];assert.match(nextStep(a,'other'),/not a party/)}
 a.state=['Disputed'];assert.match(nextStep(a,'buyer'),/frozen/);assert.equal(milestoneProgress(a).some(x=>x.complete),false);
 a.state=['Released'];assert.equal(milestoneProgress(a).filter(x=>x.complete).length,4);assert.equal(milestoneProgress(a).filter(x=>x.current).length,1);
});
test('draft restoration only accepts bounded text fields',()=>{
 assert.deepEqual(cleanDraft(null),{});const draft=cleanDraft({title:'x'.repeat(100),seller:42,terms:'terms',amount:'1.0000001',secret:'do not copy'});assert.equal(draft.title.length,90);assert.equal(draft.seller,'');assert.equal(draft.amount,'1.0000001');assert.equal('secret' in draft,false);
});
import {agreementSummary} from '../src/handoff.js';
test('handoff summary preserves exact amounts and excludes untrusted receipt URLs',()=>{
 const record={id:'AC-test',title:'Logo',terms:'Deliver three concepts',pending:'not-a-receipt',events:[{action:'release',hash:'a'.repeat(64)},{action:'bad',hash:'javascript:alert(1)'}]};
 const text=agreementSummary({record,agreement:{buyer:'buyer',seller:'seller',amount:10000001n,state:['Released']},contract:'contract',checkedAt:'2026-11-03T12:00:00Z'});
 assert.match(text,/1\.0000001 test XLM/);assert.match(text,/Deliver three concepts/);assert.match(text,/snapshot/);assert.ok(text.includes('https://stellar.expert/explorer/testnet/tx/'+'a'.repeat(64)));assert.ok(!text.includes('javascript:'));assert.ok(!text.includes('not-a-receipt'));
});
test('unverified summary does not invent a state or balance',()=>{const text=agreementSummary({record:{id:'AC-test',title:'Draft',terms:'Terms',events:[]},agreement:null,contract:'contract'});assert.match(text,/not verified/);assert.ok(!text.includes('Amount:'));assert.ok(!text.includes('State:'))});

test('accepted appeal does not imply wallet propagation was verified',async()=>{const policy=await import('../src/wallet-policy.js');assert.equal(policy.WALLET_REVIEW_HOLD,false);assert.equal(policy.DOMAIN_REVIEW_PENDING,false);assert.equal(policy.WALLET_PROPAGATION_VERIFIED,false);assert.doesNotThrow(()=>policy.requireWalletReviewClear());});

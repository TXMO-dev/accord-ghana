import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Address,Keypair,Networks,authorizeEntry,xdr,nativeToScVal,buildAuthorizationEntryPreimage} from '@stellar/stellar-sdk';
import {splitUnits,settlementArgs,settlementSnapshot,validateSettlement,validateInvocation} from '../src/settlement-model.js';
import {createDisposableWallets} from '../src/disposable-wallets.js';
const config=JSON.parse(await readFile(new URL('../public/network.json',import.meta.url)));
const buyer=Keypair.random(),seller=Keypair.random(),id='AC-00000000-0000-0000-0000-000000000001';
const agreement={buyer:buyer.publicKey(),seller:seller.publicKey(),asset:config.assetId,amount:10000001n,terms:new Uint8Array(32),evidence:null,state:['Disputed']};
async function fixture({network=Networks.TESTNET,method='settle',signer=seller,nested=false}={}){
 const invocation=new xdr.SorobanAuthorizedInvocation({function:xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(new xdr.InvokeContractArgs({contractAddress:new Address(config.contractId).toScAddress(),functionName:method,args:await settlementArgs(id,'4000000')})),subInvocations:[]});
 const root=nested?new xdr.SorobanAuthorizedInvocation({function:invocation.function,subInvocations:[invocation]}):invocation;
 const entry=new xdr.SorobanAuthorizationEntry({rootInvocation:root,credentials:xdr.SorobanCredentials.sorobanCredentialsAddress(new xdr.SorobanAddressCredentials({address:new Address(signer.publicKey()).toScAddress(),nonce:1n,signatureExpirationLedger:0,signature:nativeToScVal(null)}))});
 const signed=await authorizeEntry(entry,signer,110,network);
 return {version:1,kind:'accord-settlement',network:'testnet',contract:config.contractId,id,snapshot:settlementSnapshot(agreement),sellerUnits:'4000000',expiresLedger:110,authorization:signed.toXdr('base64')};
}
const ctx={config,id,agreement,ledger:100};
test('settlement split supports full refund, full payment and exact smallest unit',()=>{
 assert.deepEqual(splitUnits('0',10000001n),{seller:0n,buyer:10000001n});
 assert.deepEqual(splitUnits('1.0000001',10000001n),{seller:10000001n,buyer:0n});
 assert.deepEqual(splitUnits('0.0000001',10000001n),{seller:1n,buyer:10000000n});
 for(const value of ['-1','1.0000002','0.00000001','1e-7','Infinity','',' 1', '1'.repeat(31)])assert.throws(()=>splitUnits(value,10000001n));
});
test('valid signed offer yields exact payment and refund',async()=>{const r=await validateSettlement(await fixture(),ctx);assert.equal(r.seller,4000000n);assert.equal(r.buyer,6000001n)});
test('settlement rejects metadata substitution and changed ledger state',async()=>{
 const p=await fixture();for(const change of [{network:'mainnet'},{contract:config.assetId},{id:'another'},{sellerUnits:'4000001'},{expiresLedger:111},{authorization:'bad'}])await assert.rejects(validateSettlement({...p,...change},ctx));
 for(const change of [{state:['Released']},{state:['Funded']},{amount:2n},{seller:buyer.publicKey()},{evidence:new Uint8Array(32)}])await assert.rejects(validateSettlement(p,{...ctx,agreement:{...agreement,...change}}));
});
test('expired or excessive-lived authorizations fail before wallet access',async()=>{const p=await fixture();await assert.rejects(validateSettlement(p,{...ctx,ledger:110}),/expired/);await assert.rejects(validateSettlement({...p,expiresLedger:221},ctx),/expiry/)});
test('wrong network signatures, wrong signer, methods and nested calls are rejected',async()=>{
 for(const changes of [{network:Networks.PUBLIC},{signer:buyer},{method:'release'},{nested:true}])await assert.rejects(validateSettlement(await fixture(changes),ctx));
});
test('disposable auth signer rejects a mainnet payload even with testnet options',async()=>{
 const w=createDisposableWallets(),p=await fixture();const entry=xdr.SorobanAuthorizationEntry.fromXdr(p.authorization,'base64');
 await assert.rejects(w.signAuthEntry(buildAuthorizationEntryPreimage(entry,110,Networks.PUBLIC).toXdr('base64'),{networkPassphrase:Networks.TESTNET,address:w.address()}),/Testnet/);
});

import {roomSettlement,authorizeSettlementSession} from '../server/room-settlement.js';
import {sha} from '../server/room-auth.js';
import {setRoomBridge,roomRequest} from '../src/room-bridge.js';
test('shared approvals require an unexpired matching participant room and seller-only writes',()=>{
 const room='room',parties={client:buyer.publicKey(),freelancer:seller.publicKey()},session={room,wallet:seller.publicKey(),expires_at:new Date(Date.now()+60000).toISOString()};
 assert.equal(authorizeSettlementSession(session,room,parties,'settlement-share'),seller.publicKey());
 assert.throws(()=>authorizeSettlementSession({...session,room:'other'},room,parties,'settlement-get'));
 assert.throws(()=>authorizeSettlementSession({...session,expires_at:new Date(0).toISOString()},room,parties,'settlement-get'));
 assert.throws(()=>authorizeSettlementSession({...session,wallet:Keypair.random().publicKey()},room,parties,'settlement-get'));
 assert.throws(()=>authorizeSettlementSession({...session,wallet:buyer.publicKey()},room,parties,'settlement-share'));
});
test('shared settlement transport validates signatures before storage and scopes reads to the session room',async()=>{
 const room=sha(config.contractId+':'+id),offer=await fixture();let stored=null,writes=0,selected=seller.publicKey();
 const fetcher=async(url,options)=>{
  if(url.includes('/accord_room_sessions?'))return Response.json([{room,wallet:selected,expires_at:new Date(Date.now()+60000).toISOString()}]);
  if(url.includes('/accord_rooms?'))return Response.json([{client:buyer.publicKey(),freelancer:seller.publicKey()}]);
  if(url.includes('/storage/')){assert.ok(url.endsWith(room+'.json'));if(options.method==='POST'){stored=JSON.parse(options.body);writes++;return Response.json({});}return stored?Response.json(stored):new Response('',{status:404});}
  return new Response(null,{status:202});
 };
 const deps={config,membership:async()=>agreement,stellar:{getLatestLedger:async()=>({sequence:100})},env:{SUPABASE_URL:'https://test.invalid',SUPABASE_SECRET_KEY:'test-only'},fetcher};
 const body={action:'settlement-share',id,session:'test-session',offer};
 await assert.rejects(roomSettlement({...body,offer:{...offer,sellerUnits:'1'}},deps));assert.equal(writes,0);
 assert.equal((await roomSettlement(body,deps)).shared,true);assert.equal(writes,1);
 selected=buyer.publicKey();assert.deepEqual((await roomSettlement({...body,action:'settlement-get'},deps)).offer,offer);
 await assert.rejects(roomSettlement(body,deps));assert.equal(writes,1);
});
test('room switching discards a delayed shared approval response',async()=>{
 let finish;setRoomBridge({id:'a',wallet:'buyer',request:()=>new Promise(resolve=>finish=resolve)});
 const request=roomRequest('a','buyer','settlement-get');setRoomBridge(null);finish({offer:{}});await assert.rejects(request,/changed/);
 await assert.rejects(roomRequest('a','buyer','settlement-get'),/Join/);
});

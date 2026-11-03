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
 assert.throws(()=>checkWalletSelection(expected,expected,{error:{}},network,'testnet'),/Unlock Varial/);
});

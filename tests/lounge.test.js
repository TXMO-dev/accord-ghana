import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Keypair} from '@stellar/stellar-sdk';
import {makeLoungeProof,verifyLoungeProof} from '../server/lounge-auth.js';
import {createLoungeHandler} from '../api/lounge.js';
const key=Keypair.random(),origin='https://accord-ghana.vercel.app',secret='unit-test-secret-for-lounge-only-123456789',now=100000;
const input={wallet:key.publicKey(),name:'Test creator',body:'Looking for a collaborator',origin,secret,now};
const sign=(m,k=key)=>Buffer.from(k.sign(createHash('sha256').update('Stellar Signed Message:\n'+m).digest())).toString('base64');
test('lounge approval binds exact public text and wallet, and expires',()=>{
 const c=makeLoungeProof(input),proof={token:c.token,signature:sign(c.message),origin,secret,now};
 assert.equal(verifyLoungeProof(proof).body,input.body);
 for(const patch of [{signature:sign(c.message,Keypair.random())},{origin:'https://elsewhere.example'},{now:220000},{token:c.token+'x'}])assert.throws(()=>verifyLoungeProof({...proof,...patch}));
 assert.match(c.message,/PUBLIC/);assert.match(c.message,/No payment/);
});
test('same wallet posting slot has same primary key even for different text',()=>{
 const a=makeLoungeProof(input),b=makeLoungeProof({...input,body:'Second post',now:100001});
 const parse=c=>JSON.parse(Buffer.from(c.token.split('.')[0],'base64url'));
 assert.equal(parse(a).id,parse(b).id);assert.notEqual(parse(a).id,parse(makeLoungeProof({...input,now:130000})).id);
 assert.throws(()=>makeLoungeProof({...input,body:'x'.repeat(1001)}));
});
function response(){return {code:0,body:null,setHeader(){},status(n){this.code=n;return this;},json(d){this.body=d;return this;}};}
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'server-test-key',ROOM_AUTH_SECRET:secret};
test('feed is filtered server-side; private key never returned',async()=>{
 let url;const h=createLoungeHandler({env,now:()=>now,request:async u=>{url=u;return {ok:true,json:async()=>[]};}}),res=response();await h({method:'GET'},res);assert.equal(res.code,200);assert.match(url,/hidden=eq.false/);assert.match(url,/expires_at=gt/);assert.doesNotMatch(JSON.stringify(res.body),/server-test-key/);
});
test('posting requires proof, checks account, and handles database replay conflict',async()=>{
 const c=makeLoungeProof(input);let writes=0;
 const h=createLoungeHandler({env,now:()=>now,request:async (u,o)=>{if(u.includes('horizon-'))return {ok:true,json:async()=>({signers:[{key:key.publicKey(),weight:1}],thresholds:{low_threshold:1,med_threshold:1,high_threshold:1}})};writes++;assert.equal(JSON.parse(o.body).body,input.body);return {ok:false,status:409};}});
 let res=response();await h({method:'POST',headers:{origin},body:{action:'post',token:c.token,signature:sign(c.message)}},res);assert.equal(res.code,409);assert.equal(writes,1);
 res=response();await h({method:'POST',headers:{origin:'https://other.example'},body:{}},res);assert.equal(res.code,403);assert.equal(writes,1);
});

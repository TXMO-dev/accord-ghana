import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {Keypair,StrKey} from '@stellar/stellar-sdk';
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function realtimeToken({room,secret,now=Date.now()}){
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const payload=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'authenticated',aud:'authenticated',accord_room:room,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+1800});
 return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}
export function validateRoom(wallet,id){
 if(!StrKey.isValidEd25519PublicKey(wallet)||!/^AC-[a-f0-9-]{36}$/.test(id))throw Error('Invalid wallet or agreement.');
}
export function makeChallenge({wallet,id,contract,origin,secret,now=Date.now()}){
 validateRoom(wallet,id);
 const payload={wallet,id,contract,origin,nonce:randomBytes(24).toString('hex'),expires:now+120000};
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const token=encoded+'.'+createHmac('sha256',secret).update(encoded).digest('base64url');
 return {token,message:challengeMessage(payload)};
}
export function challengeMessage(p){return `Accord private project room\nSite: ${p.origin}\nNetwork: Stellar Testnet\nContract: ${p.contract}\nAgreement: ${p.id}\nWallet: ${p.wallet}\nNonce: ${p.nonce}\nExpires: ${new Date(p.expires).toISOString()}\nSign in to read and post project comments. This does not authorize a payment.`;}
export function verifyChallenge({token,signature,secret,origin,contract,now=Date.now()}){
 if(typeof token!=='string'||token.length>2000||typeof signature!=='string'||signature.length>128)throw Error('Invalid proof.');
 const [encoded,mac,...extra]=token.split('.');
 const expected=createHmac('sha256',secret).update(encoded).digest();
 const received=Buffer.from(mac||'','base64url');
 if(extra.length||received.length!==expected.length||!timingSafeEqual(received,expected))throw Error('Invalid challenge.');
 const p=JSON.parse(Buffer.from(encoded,'base64url').toString());validateRoom(p.wallet,p.id);
 if(p.origin!==origin||p.contract!==contract||!Number.isFinite(p.expires)||p.expires<=now||p.expires>now+120000)throw Error('Challenge expired or belongs to another site.');
 const sig=/^[a-f0-9]{128}$/i.test(signature)?Buffer.from(signature,'hex'):Buffer.from(signature,'base64');
 const digest=createHash('sha256').update('Stellar Signed Message:\n'+challengeMessage(p)).digest();
 if(sig.length!==64||!Keypair.fromPublicKey(p.wallet).verify(digest,sig))throw Error('Wallet proof did not verify.');
 return p;
}

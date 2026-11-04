import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {Keypair,StrKey} from '@stellar/stellar-sdk';
const hash=v=>createHash('sha256').update(v).digest('hex');
export function loungeText(value,max){if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(value))throw Error('Enter a valid name and message (60 and 1000 characters maximum).');return value.trim();}
export const reportReasons=['Spam','Scam or fraud','Harassment','Inappropriate content'];
export function loungeMessage(p){if(p.purpose==='profile-save'||p.purpose==='profile-remove')return `Accord PUBLIC Lounge profile\nSite: ${p.origin}\nNetwork: Stellar Testnet\nWallet: ${p.wallet}\nAction: ${p.purpose==='profile-save'?'Publish or update profile':'Remove public profile'}\nName: ${p.name}\nDetails: ${p.body}\n\nProfiles stay public until removed; they do not expire with chat messages. Others may copy them. Removal clears profile text; wallet and version metadata remain to prevent replay. No payment authorized.\nExpires: ${new Date(p.expires).toISOString()}`;if(p.purpose==='report')return `Accord PRIVATE Lounge report\nSite: ${p.origin}\nNetwork: Stellar Testnet\nWallet: ${p.wallet}\nMessage ID: ${p.body}\nReason: ${p.name}\n\nSend to Accord moderators. This does not hide the message or authorize payment. Reports are deleted with the message.\nReport ID: ${p.id}\nExpires: ${new Date(p.expires).toISOString()}`;return `Accord PUBLIC Lounge post\nSite: ${p.origin}\nNetwork: Stellar Testnet\nWallet: ${p.wallet}\nName (self-chosen): ${p.name}\nMessage:\n${p.body}\n\nPublicly visible for 24 hours. Others may copy it. No payment authorized.\nPost ID: ${p.id}\nExpires: ${new Date(p.expires).toISOString()}`;}
export function makeLoungeProof({wallet,name,body,origin,secret,now=Date.now(),purpose='post'}){
 if(!StrKey.isValidEd25519PublicKey(wallet))throw Error('Connect a Stellar wallet first.');
 if(!['post','report','profile-save','profile-remove'].includes(purpose))throw Error('Invalid lounge action.');
 name=loungeText(name,60);body=loungeText(body,1000);
 if(purpose==='report'&&(!reportReasons.includes(name)||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(body)))throw Error('Select a valid message and report reason.');
 if(/\bS[A-Z2-7]{55}\b/.test(body))throw Error('Do not post wallet secret keys.');
 // A database primary key enforces one post per wallet per 30-second slot,
 // including concurrent requests and replayed signatures across server instances.
 const h=hash(`accord-lounge:${purpose}:testnet:${wallet}:${Math.floor(now/30000)}`);
 const id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
 const p={purpose,wallet,name,body,origin,network:'testnet',id,issued:now,expires:now+120000};
 const encoded=Buffer.from(JSON.stringify(p)).toString('base64url');
 return {token:encoded+'.'+createHmac('sha256',secret).update(encoded).digest('base64url'),message:loungeMessage(p)};
}
export function verifyLoungeProof({token,signature,origin,secret,now=Date.now(),purpose='post'}){
 if(typeof token!=='string'||token.length>12000||typeof signature!=='string'||signature.length>128)throw Error('Invalid lounge approval.');
 const [encoded,mac,...rest]=token.split('.');
 const expected=createHmac('sha256',secret).update(encoded).digest(),actual=Buffer.from(mac||'','base64url');
 if(rest.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid lounge approval.');
 const p=JSON.parse(Buffer.from(encoded,'base64url').toString());
 if(p.purpose!==purpose)throw Error('Approval is for a different lounge action.');
 if(p.origin!==origin||p.network!=='testnet'||!Number.isFinite(p.issued)||p.issued>now||p.expires!==p.issued+120000||p.expires<=now)throw Error('Approval expired. Review and sign again.');
 const sig=/^[a-f0-9]{128}$/i.test(signature)?Buffer.from(signature,'hex'):Buffer.from(signature,'base64');
 const digest=createHash('sha256').update('Stellar Signed Message:\n'+loungeMessage(p)).digest();
 if(sig.length!==64||!Keypair.fromPublicKey(p.wallet).verify(digest,sig))throw Error('Wallet signature did not verify.');
 return p;
}

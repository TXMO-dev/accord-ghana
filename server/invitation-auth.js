import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {Keypair,StrKey} from '@stellar/stellar-sdk';
export const invitationOrigin='https://accord-ghana.vercel.app';
export function invitationFields(input){
 if(!StrKey.isValidEd25519PublicKey(input.wallet)||!StrKey.isValidEd25519PublicKey(input.recipient)||input.wallet===input.recipient)throw Error('Choose a different freelancer wallet.');
 const clean=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u001f\u007f]/.test(value.replace(/\n/g,''))||/\bS[A-Z2-7]{55}\b/.test(value))throw Error('Use a title up to 90 characters and a brief up to 600 characters. Never include secrets.');return value.trim();};
 return {recipient:input.recipient,title:clean(input.title,90),brief:clean(input.brief,600)};
}
function seal(value,secret){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+createHmac('sha256',secret).update('accord-invitations:'+data).digest('base64url');}
function open(token,secret){
 if(typeof token!=='string'||token.length>8000)throw Error('Invalid invitation approval.');
 const [data,mac,...rest]=token.split('.'),expected=createHmac('sha256',secret).update('accord-invitations:'+data).digest(),actual=Buffer.from(mac||'','base64url');
 if(rest.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw Error('Invalid invitation approval.');
 return JSON.parse(Buffer.from(data,'base64url'));
}
export function invitationMessage(p){return ['Accord PRIVATE collaboration invitation','Site: '+p.origin,'Network: Stellar Testnet','Wallet: '+p.wallet,'Action: '+p.operation,...(p.operation==='inbox'?['Open my private invitations for 10 minutes.']:['Invitation: '+p.id,'Client: '+p.client,'Freelancer: '+p.recipient,'Title: '+p.title,'Brief: '+p.brief,'Revision: '+p.revision]),'','Only the participants and Accord service can access this. It is not end-to-end encrypted.','Accepting expresses interest only. No escrow, contract acceptance or payment is authorized.','Invitations can be answered for 7 days. Records remain in your private inbox.','Approval expires: '+new Date(p.expires).toISOString()].join('\n');}
export function makeInvitationProof({wallet,operation,fields={},secret,now=Date.now()}){
 if(!StrKey.isValidEd25519PublicKey(wallet)||!['inbox','create','accept','decline','cancel'].includes(operation))throw Error('Invalid invitation action.');
 const p={...fields,kind:'invitation-proof',origin:invitationOrigin,network:'testnet',wallet,operation,issued:now,expires:now+120000};
 return {token:seal(p,secret),message:invitationMessage(p)};
}
export function verifyInvitationProof({token,signature,secret,now=Date.now()}){
 const p=open(token,secret);
 if(p.kind!=='invitation-proof'||p.origin!==invitationOrigin||p.network!=='testnet'||!Number.isFinite(p.issued)||p.issued>now||p.expires!==p.issued+120000||p.expires<=now)throw Error('Approval expired. Review again.');
 if(typeof signature!=='string'||signature.length>128)throw Error('Invalid wallet signature.');
 const sig=/^[a-f0-9]{128}$/i.test(signature)?Buffer.from(signature,'hex'):Buffer.from(signature,'base64');
 const digest=createHash('sha256').update('Stellar Signed Message:\n'+invitationMessage(p)).digest();
 if(sig.length!==64||!Keypair.fromPublicKey(p.wallet).verify(digest,sig))throw Error('Wallet signature did not verify.');
 return p;
}
export function invitationSession(proof,secret){return seal({kind:'invitation-session',wallet:proof.wallet,network:'testnet',expires:proof.issued+600000},secret);}
export function readInvitationSession(token,secret,now=Date.now()){
 const p=open(token,secret);if(p.kind!=='invitation-session'||p.network!=='testnet'||!StrKey.isValidEd25519PublicKey(p.wallet)||!Number.isFinite(p.expires)||p.expires<=now)throw Error('Unlock your private inbox again.');return p;
}
export function invitationId(wallet,now){const h=createHash('sha256').update('accord-invitation:'+wallet+':'+Math.floor(now/60000)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}

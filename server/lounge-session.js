import {createHmac,timingSafeEqual} from 'node:crypto';
export function sealPresence(p,secret){const value=Buffer.from(JSON.stringify(p)).toString('base64url');return value+'.'+createHmac('sha256',secret).update('presence:'+value).digest('base64url');}
export function readPresence(token,secret,now=Date.now()){
 if(typeof token!=='string'||token.length>2000)throw Error('Join the Lounge again.');
 const [value,mac,...extra]=token.split('.'),expected=createHmac('sha256',secret).update('presence:'+value).digest(),actual=Buffer.from(mac||'','base64url');
 if(extra.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid presence session.');
 const p=JSON.parse(Buffer.from(value,'base64url'));
 if(p.kind!=='lounge-presence'||!Number.isFinite(p.expires)||p.expires<=now)throw Error('Presence expired. Join the Lounge again.');
 return p;
}

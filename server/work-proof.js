import {verifiedActivity} from './room-activity.js';
export function workFields(input){
 if(!/^AC-[a-f0-9-]{36}$/.test(input.id||'')||!/^[a-f0-9]{64}$/.test(input.hash||''))throw Error('Enter the agreement ID and full release transaction hash.');
 const text=(key,max)=>{const v=input[key];if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u001f\u007f]/.test(v)||/\bS[A-Z2-7]{55}\b/.test(v))throw Error('Use a public title up to 60 characters and description up to 240 characters. Never include secrets.');return v.trim();};
 return {id:input.id,hash:input.hash,title:text('title',60),description:text('description',240)};
}
export function verifyWorkRelease(receipt,agreement,{wallet,id,hash,contract}){
 const state=Array.isArray(agreement.state)?agreement.state[0]:agreement.state;
 if(state!=='Released'||agreement.seller!==wallet||agreement.buyer===agreement.seller)throw Error('Only the freelancer on a released agreement can publish its work card.');
 const activity=verifiedActivity(receipt,{hash,wallet:agreement.buyer,contract,id,network:'TESTNET'});
 if(activity.action!=='release')throw Error('Use the payment release receipt, not a delivery or settlement receipt.');
 return true;
}

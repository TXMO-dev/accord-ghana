export function cleanDisputeProposal(value,termsHash,total){
 if(!value||value.termsHash!==termsHash||!/^[a-f0-9]{64}$/.test(termsHash))throw Error('Original conditions do not match Stellar.');
 const text=(key,max)=>{const v=value[key];if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)||/\bS[A-Z2-7]{55}\b/.test(v))throw Error('Enter a reason and a private evidence reference within their limits. Do not include secrets.');return v.trim();};
 if(!/^(0|[1-9][0-9]{0,38})$/.test(value.sellerUnits||'')||!/^([1-9][0-9]{0,38})$/.test(String(total))||value.totalUnits!==String(total)||BigInt(value.sellerUnits)>BigInt(total))throw Error('The proposed split must match the current escrow total.');
 return {termsHash,reason:text('reason',2000),evidence:text('evidence',400),sellerUnits:value.sellerUnits,totalUnits:String(total)};
}

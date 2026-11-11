export function cleanScopeProposal(value,termsHash){
 if(!value||value.termsHash!==termsHash||!/^[a-f0-9]{64}$/.test(termsHash))throw Error('Original conditions do not match Stellar. Refresh the agreement.');
 const text=(key,max)=>{const v=value[key];if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)||/\bS[A-Z2-7]{55}\b/.test(v))throw Error('Complete the scope, reason, price and timing fields within their limits. Do not include secrets.');return v.trim();};
 return {termsHash,scope:text('scope',2000),reason:text('reason',400),priceEffect:text('priceEffect',200),timeEffect:text('timeEffect',200)};
}
export function scopeEditable(state){return ['Draft','Funded','Submitted'].includes(state);}

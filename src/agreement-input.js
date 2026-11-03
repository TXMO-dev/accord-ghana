import {StrKey} from '@stellar/stellar-sdk';
import {amount,validateContract} from './values.js';
export function validateAgreementInput({buyer,seller,asset,amount:quantity,terms}){
 const fail=(field,message)=>{throw Object.assign(new Error(message),{field})};
 if(!StrKey.isValidEd25519PublicKey(buyer||''))fail('buyer','Connect your wallet before creating an agreement.');
 seller=String(seller||'').trim();
 if(!seller)fail('seller',"Enter the freelancer’s Stellar wallet address.");
 if(!StrKey.isValidEd25519PublicKey(seller))fail('seller','Enter a valid freelancer wallet address beginning with G.');
 if(seller===buyer)fail('seller','Client and freelancer must use different wallets.');
 try{validateContract(asset)}catch{fail('asset','The test asset is unavailable. Reload Accord and try again.')}
 quantity=String(quantity||'').trim();try{amount(quantity)}catch(error){fail('amount',error.message)}
 terms=String(terms||'').trim();if(!terms)fail('terms','Describe what the freelancer will deliver and how you will approve it.');
 return {buyer,seller,asset,amount:quantity,terms};
}

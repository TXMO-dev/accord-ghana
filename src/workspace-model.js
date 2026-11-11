import {projectLink} from './project-links.js';
export const stateName = a => Array.isArray(a.state) ? a.state[0] : a.state;
export function availableActions(a, wallet) {
  const state=stateName(a), buyer=a.buyer===wallet, seller=a.seller===wallet;
  return [state==='Draft'&&buyer&&'fund',state==='Funded'&&seller&&'submit',state==='Submitted'&&buyer&&'release', ['Funded','Submitted'].includes(state)&&(buyer||seller)&&'dispute'].filter(Boolean);
}
export function formatUnits(value) {
  const n=BigInt(value), fraction=(n%10000000n).toString().padStart(7,'0').replace(/0+$/,'');
  return (n/10000000n).toString()+(fraction?'.'+fraction:'');
}
export function validatePackage(p, contract) {
  if(p?.version!==1||p.network!=='testnet'||p.contract!==contract)throw Error('This file belongs to a different network or Accord deployment.');
  if(typeof p.id!=='string'||!/^AC-[a-f0-9-]{36}$/.test(p.id)||typeof p.title!=='string'||!p.title.trim()||p.title.length>90||typeof p.terms!=='string'||!p.terms.trim()||p.terms.length>4000)throw Error('Invalid agreement file.');
  return {id:p.id,title:p.title,terms:p.terms,events:[],...(p.project?{project:projectLink(p.project)}:{})};
}
export function nextStep(a, wallet) {
 const role=a.buyer===wallet?'client':a.seller===wallet?'freelancer':'observer';
 if(role==='observer')return 'This wallet is not a party to this agreement. Connect the client or freelancer wallet to take action.';
 switch(stateName(a)){
  case 'Draft':return role==='client'?'Next: fund the agreed milestone before work starts.':'Waiting for the client to fund the milestone. Begin work after funding is confirmed.';
  case 'Funded':return role==='freelancer'?'Next: deliver the work and submit a reference for your client to verify.':'The milestone is funded. Waiting for the freelancer to submit delivery.';
  case 'Submitted':return role==='client'?'Next: review the work, verify the delivery reference, then approve release.':'Delivery submitted. Waiting for the client to review and release payment.';
  case 'Released':return 'Milestone complete. Export the agreement to keep your terms and transaction receipts.';
  case 'Disputed':return 'Payment is frozen. Both parties must agree to settlement; use the settlement panel to agree a split and collect both signatures.';
  case 'Cancelled':return 'This agreement has been settled and closed. Keep the transaction receipts for your records.';
  default:return 'Refresh to verify the agreement state.';
 }
}
export function milestoneProgress(a) {
 const state=stateName(a);
 if(['Disputed','Cancelled'].includes(state))return [
  {label:'Agreed',complete:true,current:false},
  {label:'Funded',complete:true,current:false},
  {label:a.evidence?'Delivery recorded':'Delivery not recorded',complete:!!a.evidence,current:false},
  {label:state==='Cancelled'?'Settled':'In dispute',complete:state==='Cancelled',current:true},
 ];
 const index=['Draft','Funded','Submitted','Released'].indexOf(state);
 return ['Agreed','Funded','Delivered','Released'].map((label,i)=>({label,complete:index>=i,current:index===i}));
}
export function actionWarning(method) {
 return {fund:'Funding locks the agreed test XLM in this milestone. It does not pay the freelancer yet.',submit:'Only the hash is recorded. Share the original delivery reference privately with your client.',release:'Release cannot be undone. Verify the delivered work before signing.',dispute:'This freezes the funds. It does not request delivery or issue a refund. Both parties must authorize settlement to close the dispute.'}[method]||'';
}
export function cleanDraft(value) {
 if(!value||typeof value!=='object')return {};
 return {...Object.fromEntries(Object.entries({title:90,seller:56,terms:4000,amount:30}).map(([key,max])=>[key,typeof value[key]==='string'?value[key].slice(0,max):''])),...(value.project?{project:projectLink(value.project)}:{})};
}

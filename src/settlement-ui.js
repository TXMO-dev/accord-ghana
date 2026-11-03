import {account,assertWallet,readAgreement,server,signAuthorization,signAndSubmit,digest} from './stellar.js';
import {splitUnits,validateSettlement,assertDisputed,settlementSnapshot} from './settlement-model.js';
import {prepareSellerOffer,prepareBuyerSettlement} from './settlement-service.js';
import {reviewAction} from './review.js';
import {formatUnits,stateName} from './workspace-model.js';
import {downloadText} from './handoff.js';

const offers=new Map();
const drafts=new Map();
export function mountSettlement(container,{config,record,agreement,context,lock,status,pending,confirmed,refresh}){
 if(stateName(agreement)!=='Disputed'||![agreement.buyer,agreement.seller].includes(account))return;
 const seller=account===agreement.seller,section=document.createElement('section');section.className='settlement-panel';section.id='settlement-panel';section.tabIndex=-1;
 section.innerHTML='<span class="eyebrow">A SHARED WAY FORWARD / TESTNET</span><h3>Find your middle ground.</h3><p>One exact split. Two independent approvals. The freelancer authorizes first; the client signs and submits.</p><ol class="settlement-steps"><li>Agree on the split</li><li>Freelancer exports approval</li><li>Client reviews & settles</li></ol><p class="muted">Approvals expire after 120 ledgers (roughly ten minutes, network-dependent). Export only when both parties are ready. Deleting a file does not revoke its signature.</p>';
 const body=document.createElement('div');body.className='settlement-body';section.append(body);container.append(section);
 const walletAtMount=account;
 function checkContext(){if(context().record!==record||account!==walletAtMount||record.pending)throw Error('Wallet, agreement or pending transaction changed. Refresh before continuing.')}
 async function fresh(){checkContext();await assertWallet(walletAtMount);const a=await readAgreement(config.contractId,record.id);assertDisputed(a,config.assetId);if(JSON.stringify(settlementSnapshot(a))!==JSON.stringify(settlementSnapshot(agreement)))throw Error('Agreement changed. Refresh and start a new proposal.');const terms=await digest(record.terms);if(terms.length!==a.terms.length||terms.some((v,i)=>v!==a.terms[i]))throw Error('Acceptance conditions do not match the contract.');return a}
 const fields=(a,split)=>[['Agreement',record.title],['Escrow total',formatUnits(a.amount)+' test XLM'],['Freelancer receives',formatUnits(split.seller)+' test XLM'],['Client refund',formatUnits(split.buyer)+' test XLM'],['Client',a.buyer],['Freelancer',a.seller]];
 const buttons=[];
 async function action(fn){if(context().busy||record.pending)return;lock(true);status('Checking the current agreement on Testnet…');buttons.forEach(b=>b.disabled=true);try{await fn()}catch(e){status(e.message)}finally{lock(false);buttons.forEach(b=>b.disabled=!!record.pending);await refresh()}}
 if(seller){
   const label=document.createElement('label');label.textContent='Freelancer payment · test XLM';const input=document.createElement('input');input.id='settlement-amount';input.inputMode='decimal';input.value=drafts.get(record.id)||'0';input.maxLength=30;label.append(input);
   const preview=document.createElement('p');preview.className='settlement-split';preview.setAttribute('role','status');
   const update=()=>{drafts.set(record.id,input.value);try{const split=splitUnits(input.value,agreement.amount);preview.textContent='Freelancer '+formatUnits(split.seller)+' / Client refund '+formatUnits(split.buyer)+' test XLM'}catch(e){preview.textContent=e.message}};input.oninput=update;update();
   const approve=document.createElement('button');approve.dataset.studioAction='settlement-offer';approve.textContent='Review & authorize split';buttons.push(approve);
   approve.onclick=()=>action(async()=>{
     const split=splitUnits(input.value,agreement.amount),a=await fresh();
     if(!await reviewAction({title:'A fair close, together.',description:'Authorize this exact split, then send the approval file privately to the client.',fields:fields(a,split),warning:'This authorization can be used until its ledger expiry. It cannot be revoked by deleting the file. The client must also sign. No funds move in this step.',confirmLabel:'Authorize split'})){status('Cancelled. No authorization requested.');return}
     await fresh();status('Preparing freelancer authorization…');
     const offer=await prepareSellerOffer({server,config,id:record.id,agreement:a,sellerUnits:split.seller,sign:(entry,expiry)=>signAuthorization(entry,expiry,walletAtMount)});
     checkContext();offers.set(record.id,offer);downloadText(record.id+'-settlement.json',JSON.stringify(offer,null,2),'application/json');status('Approval downloaded. Send it privately to the client before ledger '+offer.expiresLedger+'. No funds moved.');
   });body.append(label,preview,approve);
   if(offers.has(record.id)){const again=document.createElement('button');again.className='secondary';again.textContent='Download last approval';again.onclick=()=>downloadText(record.id+'-settlement.json',JSON.stringify(offers.get(record.id),null,2),'application/json');body.append(again)}
 }else{
   const explanation=document.createElement('p');explanation.textContent='Ask the freelancer for their settlement approval file. Accord verifies its signature and shows both amounts before you approve.';
   const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;input.id='settlement-file';
   const open=document.createElement('button');open.dataset.studioAction='settlement-import';open.textContent='Open freelancer approval';open.onclick=()=>input.click();buttons.push(open);body.append(explanation,open,input);
   input.onchange=()=>action(async()=>{
     const file=input.files[0];input.value='';if(!file)return;if(file.size>24000)throw Error('Settlement file is too large.');
     const offer=JSON.parse(await file.text()),a=await fresh();
     const split=await validateSettlement(offer,{config,id:record.id,agreement:a,ledger:(await server.getLatestLedger()).sequence});
     if(!await reviewAction({title:'Close on common ground.',description:'The freelancer has authorized this split. Your signature submits the settlement and closes the milestone.',fields:[...fields(a,split),['Expires at ledger',offer.expiresLedger]],warning:'Settlement cannot be undone. The amounts shown exclude the client’s Testnet transaction fee. An expired or already-used approval cannot settle again.',confirmLabel:'Approve split & continue'})){status('Cancelled. Nothing was submitted.');return}
     const current=await fresh();status('Verifying both authorizations with Stellar…');
     const tx=await prepareBuyerSettlement({server,config,id:record.id,agreement:current,proposal:offer});
     checkContext();
     const result=await signAndSubmit(tx,walletAtMount,status,(hash,info)=>pending(hash,info));
     confirmed(result.hash);offers.delete(record.id);status('Settlement confirmed. Freelancer payment and client refund completed on Testnet.');
   });
 }
}

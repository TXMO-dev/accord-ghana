import {roomConnected,roomRequest} from './room-bridge.js';
import {account,assertWallet,readAgreement,server,signAuthorization,signAndSubmit,digest} from './stellar.js';
import {splitUnits,validateSettlement,assertDisputed,settlementSnapshot} from './settlement-model.js';
import {prepareSellerOffer,prepareBuyerSettlement} from './settlement-service.js';
import {reviewAction} from './review.js';
import {formatUnits,stateName} from './workspace-model.js';
import {downloadText} from './handoff.js';

const offers=new Map();
const drafts=new Map();
const feedback=new Map();
export function mountSettlement(container,{config,record,agreement,context,lock,status:onStatus,pending,confirmed,refresh}){
 if(stateName(agreement)!=='Disputed'||![agreement.buyer,agreement.seller].includes(account))return;
 const seller=account===agreement.seller,section=document.createElement('section');section.className='settlement-panel';section.id='settlement-panel';section.tabIndex=-1;
 section.innerHTML='<span class="eyebrow">A SHARED WAY FORWARD / TESTNET</span><h3>Find your middle ground.</h3><p>One exact split. Two independent approvals. The freelancer authorizes first; the client signs and submits.</p><ol class="settlement-steps"><li>Agree on the split</li><li>Freelancer shares approval</li><li>Client reviews & settles</li></ol><p class="muted">Approvals expire after 120 ledgers (roughly ten minutes, network-dependent). Authorize only when both parties are ready. Sharing a new approval does not revoke an earlier signature; signed approvals remain usable until expiry.</p>';
 const body=document.createElement('div');body.className='settlement-body';section.append(body);container.append(section);
 const walletAtMount=account;
 const feedbackKey=config.contractId+':'+record.id+':'+walletAtMount;
 const localStatus=document.createElement('p');localStatus.className='notice settlement-status';localStatus.setAttribute('role','status');localStatus.setAttribute('aria-live','polite');localStatus.textContent=feedback.get(feedbackKey)||'';localStatus.hidden=!localStatus.textContent;section.append(localStatus);
 function status(message){feedback.set(feedbackKey,message);localStatus.hidden=false;localStatus.textContent=message;onStatus(message);}

 function checkContext(){if(context().record!==record||account!==walletAtMount||record.pending)throw Error('Wallet, agreement or pending transaction changed. Refresh before continuing.')}
 async function fresh(){checkContext();await assertWallet(walletAtMount);const a=await readAgreement(config.contractId,record.id);assertDisputed(a,config.assetId);if(JSON.stringify(settlementSnapshot(a))!==JSON.stringify(settlementSnapshot(agreement)))throw Error('Agreement changed. Refresh and start a new proposal.');const terms=await digest(record.terms);if(terms.length!==a.terms.length||terms.some((v,i)=>v!==a.terms[i]))throw Error('Acceptance conditions do not match the contract.');return a}
 const fields=(a,split)=>[['Agreement',record.title],['Escrow total',formatUnits(a.amount)+' test XLM'],['Freelancer receives',formatUnits(split.seller)+' test XLM'],['Client refund',formatUnits(split.buyer)+' test XLM'],['Client',a.buyer],['Freelancer',a.seller]];
 const buttons=[];
 async function action(fn){if(context().busy||record.pending){status('An action is already in progress. Wait for confirmation, then refresh the agreement.');return;}lock(true);section.setAttribute('aria-busy','true');status('Checking the shared approval and current agreement…');const labels=buttons.map(b=>b.textContent);buttons.forEach(b=>{b.disabled=true;if(b.dataset.studioAction==='settlement-review')b.textContent='Loading approval…';});try{await fn()}catch(e){status(e.message||'Could not load the approval. Try again.')}finally{lock(false);section.setAttribute('aria-busy','false');buttons.forEach((b,i)=>{b.disabled=!!record.pending;b.textContent=labels[i];});await refresh()}}
 if(seller){
   const label=document.createElement('label');label.textContent='Freelancer payment · test XLM';const input=document.createElement('input');input.id='settlement-amount';input.inputMode='decimal';input.value=drafts.get(record.id)||'0';input.maxLength=30;label.append(input);
   const preview=document.createElement('p');preview.className='settlement-split';preview.setAttribute('role','status');
   const update=()=>{drafts.set(record.id,input.value);try{const split=splitUnits(input.value,agreement.amount);preview.textContent='Freelancer '+formatUnits(split.seller)+' / Client refund '+formatUnits(split.buyer)+' test XLM'}catch(e){preview.textContent=e.message}};input.oninput=update;update();
   const approve=document.createElement('button');approve.dataset.studioAction='settlement-offer';approve.textContent='Review & authorize split';buttons.push(approve);
   approve.onclick=()=>action(async()=>{
     if(!roomConnected(record.id,walletAtMount))throw Error('Join this agreement’s project room first to share the approval directly.');
     const split=splitUnits(input.value,agreement.amount),a=await fresh();
     if(!await reviewAction({title:'A fair close, together.',description:'Authorize this exact split and share it in your private project room for the client to review.',fields:fields(a,split),warning:'This authorization can be used until its ledger expiry. Sharing a new approval does not revoke an earlier one. The client must also sign. No funds move in this step.',confirmLabel:'Authorize split'})){status('Cancelled. No authorization requested.');return}
     await fresh();status('Preparing freelancer authorization…');
     const offer=await prepareSellerOffer({server,config,id:record.id,agreement:a,sellerUnits:split.seller,sign:(entry,expiry)=>signAuthorization(entry,expiry,walletAtMount)});
     checkContext();offers.set(record.id,offer);await roomRequest(record.id,walletAtMount,'settlement-share',offer);status('Approval shared in your project room. The client can review it before ledger '+offer.expiresLedger+'. No funds moved.');
   });body.append(label,preview,approve);
   if(offers.has(record.id)){const retry=document.createElement('button');retry.className='secondary';retry.textContent='Share last signed approval';buttons.push(retry);retry.onclick=()=>action(async()=>{await fresh();await roomRequest(record.id,walletAtMount,'settlement-share',offers.get(record.id));status('Signed approval shared. Waiting for the client to review.');});body.append(retry);const again=document.createElement('button');again.className='secondary';again.textContent='Download last approval';again.onclick=()=>downloadText(record.id+'-settlement.json',JSON.stringify(offers.get(record.id),null,2),'application/json');body.append(again)}
 }else{
   const explanation=document.createElement('p');explanation.textContent='Join the shared project room. When the freelancer shares a signed split, review it here and approve in your wallet. Accord checks the signature, amounts and expiry before submitting.';const shared=document.createElement('button');shared.textContent='Review shared approval';shared.dataset.studioAction='settlement-review';buttons.push(shared);body.append(explanation,shared);
   const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;input.id='settlement-file';
   const open=document.createElement('button');open.dataset.studioAction='settlement-import';open.textContent='Import signed approval file';open.onclick=()=>input.click();buttons.push(open);const fallback=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Use an approval file instead';fallback.append(summary,open,input);body.append(fallback);
   const settle=async offer=>{
     const a=await fresh();
     const split=await validateSettlement(offer,{config,id:record.id,agreement:a,ledger:(await server.getLatestLedger()).sequence});
     if(!await reviewAction({title:'Close on common ground.',description:'The freelancer has authorized this split. Your signature submits the settlement and closes the milestone.',fields:[...fields(a,split),['Expires at ledger',offer.expiresLedger]],warning:'Settlement cannot be undone. The amounts shown exclude the client’s Testnet transaction fee. An expired or already-used approval cannot settle again.',confirmLabel:'Approve split & continue'})){status('Cancelled. Nothing was submitted.');return}
     const current=await fresh();status('Verifying both authorizations with Stellar…');
     const tx=await prepareBuyerSettlement({server,config,id:record.id,agreement:current,proposal:offer});
     checkContext();
     const result=await signAndSubmit(tx,walletAtMount,status,(hash,info)=>pending(hash,info));
     confirmed(result.hash);offers.delete(record.id);status('Settlement confirmed. Freelancer payment and client refund completed on Testnet.');
   };
   shared.onclick=()=>action(async()=>{const data=await roomRequest(record.id,walletAtMount,'settlement-get');if(!data.offer)throw Error('No shared approval yet. Ask the freelancer to authorize and share the split.');await settle(data.offer);});
   input.onchange=()=>action(async()=>{const file=input.files[0];input.value='';if(!file)return;if(file.size>24000)throw Error('Settlement file is too large.');await settle(JSON.parse(await file.text()));});
 }
}

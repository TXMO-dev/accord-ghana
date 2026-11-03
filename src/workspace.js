import {validateAgreementInput} from './agreement-input.js';
import {pendingMetadata,recoveryOutcome,recoveryEvent} from './recovery-model.js';
import {receiptEvents,searchAgreements} from './library-model.js';
import {mountSettlement} from './settlement-ui.js';
import {reviewAction} from './review.js';
import {agreementSummary,downloadText,copyText} from './handoff.js';
import {connect,account,invoke,readAgreement,digest,bytes,address,amount,transactionStatus} from './stellar.js';
import {availableActions,stateName,formatUnits,validatePackage,nextStep,milestoneProgress,cleanDraft} from './workspace-model.js';
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const config=await fetch('/network.json').then(r=>r.json());
const storage='accord-live-'+config.contractId;
let records=[], selected='', chain=null, busy=false, refreshing=false, refreshAgain=false,checkedAt='';
const proofDrafts=new Map(),verificationDrafts=new Map();
const draftKey=()=>storage+'-draft-'+account;
function saveDraft(){if(!account)return;try{localStorage.setItem(draftKey(),JSON.stringify(cleanDraft(Object.fromEntries(new FormData($('studio-create'))))));$('studio-draft-note').textContent='Draft saved on this device for this wallet.'}catch{$('studio-draft-note').textContent='Draft could not be saved. Keep this form open.'}}
function loadDraft(){let draft={};try{draft=cleanDraft(JSON.parse(localStorage.getItem(draftKey())))}catch{}for(const name of ['title','seller','terms','amount'])$('studio-create').elements.namedItem(name).value=draft[name]||(name==='amount'?'1':'');$('studio-draft-note').textContent=draft.title||draft.terms?'Your saved draft has been restored.':'Drafts are saved only on this device. Avoid confidential information.'}

try{const saved=JSON.parse(localStorage.getItem(storage));if(Array.isArray(saved))records=saved.map(p=>({...validatePackage({...p,version:1,network:'testnet',contract:config.contractId},config.contractId),pending:p.pending,pendingInfo:pendingMetadata(p.pending,p.pendingInfo),events:Array.isArray(p.events)?p.events:[]}))}catch{}
const current=()=>records.find(r=>r.id===selected);
const say=s=>{$('studio-status').textContent=s;if(!refreshing)$('studio-create-status').textContent=s};
function save(){try{localStorage.setItem(storage,JSON.stringify(records));return true}catch{say('Browser storage unavailable. Export your agreement file before leaving.');return false}}
function track(r,hash,info,action){r.pending=hash;r.pendingInfo={...info,action};if(!save()){delete r.pending;delete r.pendingInfo;throw Error('Could not save the recovery reference. Nothing was submitted. Enable browser storage before retrying.')}render()}
function controls(){for(const id of ['studio-new','studio-open','studio-import','studio-refresh'])$(id).disabled=busy||!account;$('studio-connect').disabled=busy;$('studio-create-button').disabled=busy;$('studio-close').disabled=busy;document.querySelectorAll('[data-studio-action]').forEach(b=>b.disabled=busy||refreshing||!!current()?.pending);$('studio-refresh').disabled=busy||refreshing||!account;$('studio-refresh').textContent=refreshing?'Checking ledger…':'Refresh';$('studio-detail').setAttribute('aria-busy',String(busy||refreshing));window.dispatchEvent(new CustomEvent('accord-workspace-lock',{detail:busy||!!current()?.pending}))}
function list(){
 const visible=searchAgreements(records,$('studio-search').value,$('studio-filter').value);
 $('studio-count').textContent=visible.length+' / '+records.length;
 $('studio-clear').hidden=!$('studio-search').value&&$('studio-filter').value==='all';
 $('studio-list').innerHTML=visible.map(r=>`<button data-record="${esc(r.id)}" aria-pressed="${r.id===selected}" class="${r.id===selected?'active':''}"><span class="tag">${esc(r.id.slice(0,11))}</span><strong>${esc(r.title)}</strong><small>${r.pending?'Awaiting confirmation':receiptEvents(r.events).length+' local receipts'}${r.id===selected?' · Selected':''}</small></button>`).join('')||(records.length?'<p>No agreements match. Clear your filters to see all saved work.</p>':'<p class="eyebrow">YOUR FIRST MILESTONE</p><p>01 / Connect your wallet</p><p>02 / Agree on the work</p><p>03 / Fund, deliver, approve</p>');
 for(const b of $('studio-list').querySelectorAll('button')){b.disabled=busy;b.onclick=()=>{selected=b.dataset.record;chain=null;render();refresh()}}
}
function activity(r){const events=receiptEvents(r.events);return '<section class="agreement-activity"><span class="eyebrow">THE RECORD OF YOUR WORK</span><h3>Every step leaves a trace.</h3><p class="muted">Receipts saved in this browser, not a complete chain history. Open a receipt to inspect its ledger result.</p><ol>'+events.map((e,i)=>`<li><span class="activity-index">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(e.label)}</strong><small>${e.confirmedAt?esc(new Date(e.confirmedAt).toLocaleString()):'Confirmation time not recorded'}</small><a target="_blank" rel="noopener" href="https://stellar.expert/explorer/testnet/tx/${e.hash}">View receipt ↗ <span class="receipt-short">${e.hash.slice(0,10)}…</span></a></div></li>`).join('')+'</ol>'+(!events.length?'<p>No local receipts yet. Imported agreements are verified separately against the contract.</p>':'')+'</section>'}

function render(){list();const r=current();if(!r){$('studio-detail').innerHTML='<h2>Start with a clear agreement.</h2><p>Create an agreement as a client, or open one shared with you as a freelancer. Connect your Testnet wallet to begin.</p>';controls();return}
 const role=chain?(chain.buyer===account?'Client':chain.seller===account?'Freelancer':'Observer'):'Not verified';
 $('studio-detail').innerHTML=`<div class="row"><span class="tag">${esc(role)} / Testnet</span><span class="pill">${chain?esc(stateName(chain)==='Cancelled'?'Settled':stateName(chain)):'Awaiting verification'}</span></div><h2>${esc(r.title)}</h2>${chain?`<ol class="milestone-progress" aria-label="Milestone progress">${milestoneProgress(chain).map(step=>`<li class="${step.complete?'complete':''}" ${step.current?'aria-current="step"':''}><span aria-hidden="true">${step.complete?'✓':'○'}</span>${step.label}</li>`).join('')}</ol><p class="next-step">${esc(nextStep(chain,account))}</p>`:''}<p class="studio-terms">${esc(r.terms)}</p>${chain?`<p class="studio-amount">${formatUnits(chain.amount)} <small>test XLM</small></p><p class="muted wallet-address">Client: ${esc(chain.buyer)}<br>Freelancer: ${esc(chain.seller)}</p><p class="muted">Acceptance conditions verified against the onchain hash.</p>`:''}<div class="actions">${chain?availableActions(chain,account).map(a=>`<button data-studio-action="${a}" ${r.pending?'disabled':''}>${({fund:'Fund milestone',submit:'Submit delivery',release:'Approve & release',dispute:'Raise dispute'})[a]}</button>`).join(''):''}<button id="studio-export" class="secondary">Export & share agreement</button></div>${chain&&stateName(chain)==='Funded'&&chain.seller===account?'<label>Delivery reference<textarea id="studio-proof" rows="3" maxlength="4000" placeholder="Describe the delivery or paste a reference shared privately with the client"></textarea></label>':''}${chain?.evidence?`<details><summary>Verify a delivery reference</summary><p class="muted">Get the reference privately from the freelancer, then check it matches their onchain submission before approving.</p><textarea id="studio-verify-text" rows="2"></textarea><button id="studio-verify" class="secondary">Check reference</button><p id="studio-verify-result" role="status"></p></details>`:''}${chain&&stateName(chain)==='Disputed'?'<p class="notice">Funds are frozen. Both parties must authorize settlement. Use the settlement panel below to exchange an exact split and collect both approvals.</p>':''}${r.pending?`<p class="notice">A transaction is awaiting a definitive result. Refresh to reconcile it before sending another action.</p><a target="_blank" rel="noopener" href="https://stellar.expert/explorer/testnet/tx/${esc(r.pending)}">Inspect pending transaction ↗</a>`:''}${activity(r)}`;
 const handoff=document.createElement('section');handoff.className='handoff-actions';
 handoff.innerHTML='<h3>Keep everyone on the same page.</h3><p>Share the agreement file privately. The summary includes the terms, verified state snapshot and locally recorded transaction links.</p><div class="actions"><button class="secondary" id="studio-summary">Download summary</button><button class="secondary" id="studio-copy-summary">Copy summary</button></div><p class="review-status" id="studio-handoff-status" role="status"></p>';
 $('studio-detail').append(handoff);
 const handoffStatus=text=>$('studio-handoff-status').textContent=text;
 const summary=()=>agreementSummary({record:r,agreement:chain,contract:config.contractId,checkedAt});
 $('studio-summary').onclick=()=>downloadText(r.id+'-summary.txt',summary());
 $('studio-copy-summary').onclick=()=>copyText(summary(),handoffStatus);
 $('studio-export').onclick=()=>downloadText(r.id+'.json',JSON.stringify({version:1,network:'testnet',contract:config.contractId,id:r.id,title:r.title,terms:r.terms,events:r.events},null,2),'application/json');
 if(proofDrafts.get(r.id)&&chain?.evidence){const button=document.createElement('button');button.className='secondary';button.textContent='Copy delivery reference';button.onclick=async()=>{const proof=proofDrafts.get(r.id).trim();if(equal(await digest(proof),chain.evidence))await copyText(proof,handoffStatus);else handoffStatus('This draft does not match the submitted delivery reference.')};handoff.querySelector('.actions').append(button)}
 for(const b of document.querySelectorAll('[data-studio-action]'))b.onclick=()=>act(b.dataset.studioAction);
 if($('studio-verify'))$('studio-verify').onclick=async()=>{$('studio-verify-result').textContent=equal(await digest($('studio-verify-text').value.trim()),chain.evidence)?'Match: this is the submitted reference.':'Does not match the submitted reference.'};
 if($('studio-proof')){$('studio-proof').value=proofDrafts.get(r.id)||'';$('studio-proof').oninput=e=>proofDrafts.set(r.id,e.target.value)}
 if($('studio-verify-text')){$('studio-verify-text').value=verificationDrafts.get(r.id)||'';$('studio-verify-text').oninput=e=>verificationDrafts.set(r.id,e.target.value)}
 if(chain)mountSettlement($('studio-detail'),{config,record:r,agreement:chain,context:()=>({record:current(),busy}),lock:value=>{busy=value;list();controls()},status:say,pending:(hash,info)=>track(r,hash,info,'settle'),confirmed:hash=>{r.events.push({action:'settle',hash,confirmedAt:new Date().toISOString()});delete r.pending;delete r.pendingInfo;save()},refresh:()=>refresh(true)});
 controls();
}
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
async function refresh(quiet=false){if(refreshing){refreshAgain=true;return}if(busy||!account||!current())return;refreshing=true;controls();const r=current(),walletAtStart=account;try{
 let recovery='';
 if(r.pending){const result=await transactionStatus(r.pending);const outcome=recoveryOutcome(r.pending,r.pendingInfo,result);const event=recoveryEvent(r.pending,r.pendingInfo,outcome);if(event){r.events.push(event);delete r.pending;delete r.pendingInfo;save();recovery=outcome==='EXPIRED'?'The previous transaction expired without being recorded. Review the current agreement before trying again.':outcome==='FAILED'?'The previous transaction failed. Review the current agreement before trying again.':'The previous transaction is confirmed.'}else if(outcome==='HISTORY_UNAVAILABLE'){recovery='This transaction is outside the RPC history window. The agreement stays locked; inspect its explorer receipt before taking further action.'}}
 const a=await readAgreement(config.contractId,r.id);
 if(!equal(await digest(r.terms),a.terms))throw Error('The acceptance conditions in this file do not match the contract. Do not proceed.');
 if(current()!==r||walletAtStart!==account){refreshAgain=true;return}if(busy)return;chain=a;checkedAt=new Date().toISOString();render();if(recovery||!quiet)say(recovery||'Verified on Stellar Testnet. '+(r.pending?'Transaction still unresolved.':'Ready for the next step.'));
 }catch(e){if(current()===r&&walletAtStart===account&&!busy){chain=null;render();say('Could not verify agreement: '+e.message+' Use Refresh to retry.')}}finally{refreshing=false;controls();if(refreshAgain){refreshAgain=false;queueMicrotask(()=>refresh(quiet))}}}
async function run(r,method,args){busy=true;say('Preparing '+method+' transaction…');render();try{
 const result=await invoke(config.contractId,method,args,say,(hash,info)=>track(r,hash,info,method));
 r.events.push({action:method,hash:result.hash,confirmedAt:new Date().toISOString()});delete r.pending;delete r.pendingInfo;save();say('Confirmed on Stellar Testnet.');return true;
 }catch(e){say(e.message+(r.pending?' Refresh to check the submitted transaction before retrying.':' You can retry when ready.'));return false}finally{busy=false;render()}}
async function act(method){
 if(busy||refreshing||!chain||current()?.pending||!availableActions(chain,account).includes(method))return;
 const r=current(),snapshot=chain,walletAtStart=account;
 const proof=method==='submit'?$('studio-proof').value.trim():'';
 if(method==='submit'&&!proof){say('Enter a delivery reference first.');return}
 busy=true;controls();
 try{
  const fields=[['Agreement',r.title],['Amount',formatUnits(snapshot.amount)+' test XLM'],['Client',snapshot.buyer],['Freelancer',snapshot.seller]];
  if(proof)fields.push(['Delivery reference',proof]);
  const titles={fund:'Make room for good work.',submit:'Let the work speak.',release:'Close the loop.',dispute:'Pause this milestone.'};
  const descriptions={fund:'Lock the agreed test assets in this milestone.',submit:'Record the hash of your delivery reference. Share the original privately with your client.',release:'Approve the work and transfer the test assets to the freelancer.',dispute:'Freeze this milestone while both parties resolve the disagreement.'};
  const warning=method==='release'?'Release cannot be undone. Verify the delivered work before signing.':method==='submit'?'The delivery reference itself stays offchain. Only its hash is recorded.':'Disputes freeze funds. Both parties must agree to settlement; use the settlement panel after raising a dispute.';
  const approved=await reviewAction({title:titles[method],description:descriptions[method],fields,warning,confirmLabel:method==='release'?'Approve & continue':'Continue to signature'});
  if(!approved){say('Action cancelled. No transaction was sent.');return}
  if(account!==walletAtStart||current()!==r)throw Error('Wallet or agreement changed. Review the action again.');
  const args=[bytes(await digest(r.id))];if(method==='submit')args.push(bytes(await digest(proof)));if(method==='dispute')args.push(address(account));
  if(await run(r,method,args))await refresh();
 }catch(error){say(error.message)}finally{busy=false;controls()}
}
$('studio-connect').onclick=async()=>{if(busy)return;busy=true;controls();try{await connect();$('studio-wallet').textContent=account+' · Testnet';say('Wallet connected. Create or open an agreement.');chain=null;busy=false;render();await refresh()}catch(e){say(e.message)}finally{busy=false;controls()}};
$('studio-new').onclick=()=>{$('studio-create-status').textContent='';loadDraft();$('studio-dialog').showModal()};$('studio-create').addEventListener('input',saveDraft);$('studio-close').onclick=()=>$('studio-dialog').close();$('studio-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault()});
$('studio-refresh').onclick=()=>refresh();
$('studio-create').onsubmit=async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.target);try{
 const title=f.get('title').trim(),terms=f.get('terms').trim(),seller=f.get('seller').trim();if(!title||!terms)throw Error('Complete the project name and acceptance conditions.');if(seller===account)throw Error('Client and freelancer must use different wallets.');
 validateAgreementInput({buyer:account,seller,asset:config.assetId,amount:f.get('amount'),terms});
 const sellerArg=address(seller),value=amount(f.get('amount').trim());
 busy=true;controls();const walletAtStart=account;
 const approved=await reviewAction({title:'Start on the same page.',description:'Review the acceptance conditions and the signing parties before creating this milestone.',fields:[['Project',title],['Acceptance conditions',terms],['Client',account],['Freelancer',seller],['Amount',f.get('amount').trim()+' test XLM']],warning:'Creation records the agreement. Funding is a separate step. Only a hash of the acceptance conditions is stored onchain.',confirmLabel:'Create & continue'});
 if(!approved){busy=false;controls();say('Draft kept. No transaction was sent.');return}
 if(account!==walletAtStart)throw Error('Wallet changed. Review the agreement again.');
 const r={id:'AC-'+crypto.randomUUID(),title,terms,events:[]};records.push(r);selected=r.id;$('studio-search').value='';$('studio-filter').value='all';chain=null;save();
 const ok=await run(r,'create',[bytes(await digest(r.id)),address(account),sellerArg,address(config.assetId),value,bytes(await digest(terms))]);
 if(ok){try{localStorage.removeItem(draftKey())}catch{}$('studio-dialog').close();e.target.reset();await refresh()}else if(r.pending){$('studio-dialog').close()}else if(!r.pending){records=records.filter(x=>x!==r);selected=records[0]?.id||'';save();render()}
 }catch(error){say(error.message)}finally{busy=false;controls()}};
$('studio-open').onclick=()=>$('studio-import').click();
$('studio-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>50000)throw Error('Agreement file is too large.');const r=validatePackage(JSON.parse(await file.text()),config.contractId);if(!records.some(x=>x.id===r.id))records.push(r);selected=r.id;$('studio-search').value='';$('studio-filter').value='all';chain=null;save();render();await refresh()}catch(error){say(error.message)}finally{e.target.value=''}};
$('studio-search').oninput=list;$('studio-filter').onchange=list;$('studio-clear').onclick=()=>{$('studio-search').value='';$('studio-filter').value='all';list();$('studio-search').focus()};
selected=records[0]?.id||'';render();
window.addEventListener('accord-wallet',()=>{$('studio-wallet').textContent=account+' · Testnet';chain=null;render();refresh()});
setInterval(()=>{if(!document.hidden&&!busy&&account&&current()&&!$('studio-proof')&&!$('studio-verify-text')&&!document.querySelector('.settlement-panel'))refresh(true)},15000);

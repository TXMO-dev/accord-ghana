import {encodeOpportunity,parseOpportunity,opportunityDraft} from './opportunities-model.js';
export function mountOpportunities(panel,form){
 panel.querySelector('[data-opportunity-composer]')?.remove();
 const box=document.createElement('details');box.dataset.opportunityComposer='';
 box.innerHTML='<summary>Find work or hire a collaborator</summary><p>Public opportunities last 24 hours. A post is an introduction, not an accepted contract.</p><label>Looking to<select data-kind><option value="hiring">Hire a freelancer</option><option value="available">Offer my services</option></select></label><label>Headline<input data-title maxlength="90" placeholder="Frontend developer available for a website project"></label><label>Skills, deliverables and availability<textarea data-details maxlength="650" rows="3"></textarea></label><button type="button" data-use>Prepare public opportunity</button><p data-feedback role="status"></p>';
 form.before(box);
 box.querySelector('[data-use]').onclick=()=>{const feedback=box.querySelector('[data-feedback]');try{if(form.elements.message.value.trim())throw Error('Finish or clear your current message before preparing an opportunity.');form.elements.message.value=encodeOpportunity({kind:box.querySelector('[data-kind]').value,title:box.querySelector('[data-title]').value,details:box.querySelector('[data-details]').value});feedback.textContent='Prepared below. Review the exact post and sign to publish.';form.elements.name.focus();}catch(e){feedback.textContent=e.message;}};
}
export function decorateOpportunity(row,body,panel,form){
 const offer=parseOpportunity(row.body);if(!offer)return;
 body.textContent=(offer.kind==='hiring'?'HIRING · ':'AVAILABLE FOR WORK · ')+offer.title+'\n\n'+offer.details;
 const button=document.createElement('button');button.type='button';button.textContent=offer.kind==='available'?'Draft an agreement':'Introduce myself';body.after(button);
 button.onclick=async()=>{
  const status=panel.querySelector('[data-result]');button.disabled=true;
  try{
   if(offer.kind==='hiring'){if(form.elements.message.value.trim())throw Error('Finish or clear your current message first.');form.elements.message.value=`Hi ${row.display_name}, I’m interested in “${offer.title}”. My relevant experience and availability: `;form.elements.message.focus();return;}
   const stellar=await import('./stellar.js');if(!stellar.account)await stellar.connect();
   const wallet=stellar.account;const draft=opportunityDraft(row,wallet);await stellar.assertWallet(wallet);
   const workspace=await import('./workspace.js');
   if(stellar.account!==wallet)throw Error('Wallet changed. Review the opportunity again.');
   if(await workspace.draftFromOpportunity(draft))panel.close();
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 };
}

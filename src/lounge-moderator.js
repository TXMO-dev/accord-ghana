import './lounge.css';
export function openModerator(){
 const dialog=document.createElement('dialog');dialog.className='accord-lounge accord-moderator';dialog.setAttribute('aria-labelledby','moderator-title');
 dialog.innerHTML='<button type="button" data-close>Close moderator desk</button><h2 id="moderator-title">The moderator desk</h2><p>Review public Lounge reports. Only an authorized wallet can load reports or make decisions. Each request needs a signature; no payment is requested.</p><button type="button" data-load>Sign in & load reports</button><p data-status role="status"></p><div data-reports></div>';
 document.body.append(dialog);dialog.showModal();
 const status=dialog.querySelector('[data-status]'),list=dialog.querySelector('[data-reports]'),load=dialog.querySelector('[data-load]');let closed=false,busy=false,epoch=0;
 const clear=()=>{epoch++;list.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');a.load();});list.replaceChildren();};
 const changed=()=>{clear();status.textContent='Wallet changed. Sign in again to view reports.';};addEventListener('accord-wallet',changed);
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>{closed=true;clear();removeEventListener('accord-wallet',changed);dialog.remove();};
 const request=async body=>{const r=await fetch('/api/lounge-moderator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed.');return d;};
 async function signed(decision,messageId){
  const stellar=await import('./stellar.js');if(!stellar.account)await stellar.connect();const wallet=stellar.account,version=epoch;await stellar.assertWallet(wallet);
  const proof=await request({action:'challenge',decision,messageId,wallet});if(closed||version!==epoch)throw Error('Request cancelled.');status.textContent='Review '+decision+' in your wallet. No payment is requested.';
  const {signMessage}=await import('./wallet-kit.js');const s=await signMessage(proof.message,{address:wallet,networkPassphrase:stellar.NETWORK});await stellar.assertWallet(wallet);
  if(closed||version!==epoch)throw Error('Wallet or panel changed. Request cancelled.');if(s.error||!s.signedMessage||s.signerAddress!==wallet)throw Error('Signature cancelled.');
  const signature=typeof s.signedMessage==='string'?s.signedMessage:btoa(String.fromCharCode(...s.signedMessage));const d=await request({action:'execute',token:proof.token,signature});if(closed||version!==epoch)throw Error('Panel changed. Reload reports to check the result.');return d;
 }
 async function run(fn){if(busy)return;busy=true;load.disabled=true;try{await fn();}catch(e){if(!closed)status.textContent=e.message;}finally{busy=false;if(!closed)load.disabled=false;}}
 load.onclick=()=>run(async()=>{const d=await signed('queue');clear();status.textContent='Showing up to 100 recent reports for unexpired messages. Reporter identities are not displayed.';render(d.reports);});
 function render(reports){
  const groups=new Map();for(const r of reports){const m=r.accord_lounge_messages;if(!m)continue;if(!groups.has(m.id))groups.set(m.id,{m,reports:[]});groups.get(m.id).reports.push(r);}
  if(!groups.size){list.textContent='No reports on current messages.';return;}
  for(const {m,reports:rs} of groups.values()){
   const card=document.createElement('article'),heading=document.createElement('h3'),body=document.createElement('p'),state=document.createElement('p'),reasons=document.createElement('p'),id=document.createElement('small');heading.textContent=m.display_name;body.textContent=m.body;id.textContent=m.id;state.textContent=m.hidden?'Hidden from public feed':'Visible in public feed';reasons.textContent=rs.map(r=>r.reason+' ('+(r.decision||'pending')+')').join(' · ');card.append(heading,id,body,state,reasons);
   if(m.voice_seconds){const audio=document.createElement('audio');audio.controls=true;audio.hidden=true;audio.preload='none';const listen=document.createElement('button');listen.textContent='Review voice note';listen.onclick=()=>run(async()=>{const d=await signed('listen',m.id);audio.src=d.url;audio.hidden=false;status.textContent='Press play to review. The audio link is short-lived.';});card.append(listen,audio);}
   for(const [action,label] of [['hide','Hide message'],['dismiss','Dismiss reports'],['restore','Restore message']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>run(async()=>{
    const {reviewAction}=await import('./review.js');const yes=await reviewAction({title:label+'?',description:action==='hide'?'Remove this message from the public feed. Existing audio links may last up to 60 seconds.':action==='restore'?'Make this message visible again until its original expiry.':'Mark reports reviewed without changing message visibility.',fields:[['Message',m.id],['Public post',m.body]],confirmLabel:'Review in wallet',eyebrow:'LOUNGE MODERATION'});if(!yes||closed)return;
    await signed(action,m.id);state.textContent=action==='hide'?'Hidden from public feed':action==='restore'?'Visible in public feed':state.textContent;status.textContent='Decision recorded. Reload reports for the latest queue. One decision per 30-second approval slot.';card.querySelectorAll('button').forEach(b=>b.disabled=true);
   });card.append(button);}
   list.append(card);
  }
 }
}

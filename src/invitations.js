export function mountInvitations(panel){
 panel.querySelector('[data-invitations]')?.remove();
 const root=document.createElement('details');root.dataset.invitations='';
 root.innerHTML='<summary>Private invitations</summary><p>Invite a freelancer to discuss work. Accepting expresses interest only; creating and funding an agreement are separate steps.</p><p>Only the two wallets and Accord’s service can access invitations. They are not end-to-end encrypted. Invitations expire after 7 days; records remain in your private inbox. Do not include secrets or confidential files.</p><button type="button" data-unlock disabled>Unlock my inbox with wallet</button><button type="button" data-lock hidden>Lock inbox</button><p data-state role="status">Checking availability…</p><div data-private hidden><button type="button" data-refresh>Refresh invitations</button><div data-list></div><h3>Invite a freelancer</h3><label>Freelancer wallet<input data-recipient maxlength="56" placeholder="G…"></label><label>Project title<input data-title maxlength="90"></label><label>Brief<textarea data-brief maxlength="600" rows="3"></textarea></label><button type="button" data-send>Review & sign invitation</button><p>Up to 10 invitations per day, one new invitation per minute. An existing pending invitation must be answered or cancelled first.</p></div>';
 panel.querySelector('[data-live]').before(root);
 const $=s=>root.querySelector(s),status=$('[data-state]');let session='',wallet='',epoch=0,closed=false,busy=false,reading=false,items=[];
 const request=async body=>{const r=await fetch('/api/invitations',{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Invitations unavailable.');return d;};
 const lock=()=>{epoch++;session='';wallet='';items=[];$('[data-list]').replaceChildren();$('[data-private]').hidden=true;$('[data-lock]').hidden=true;$('[data-unlock]').hidden=false;for(const el of root.querySelectorAll('input,textarea'))el.value='';status.textContent='Inbox locked. Sign in with the intended wallet.';};
 const fresh=(version)=>{if(closed||epoch!==version)throw Error('Wallet or Lounge changed. Review again.');};
 async function sign(operation,fields={}){
  const stellar=await import('./stellar.js');if(!stellar.account)await stellar.connect();const signingWallet=stellar.account,version=epoch;await stellar.assertWallet(signingWallet);
  if(operation!=='inbox'&&signingWallet!==wallet)throw Error('Unlock the inbox with this wallet first.');
  const proof=await request({action:'challenge',operation,...fields,wallet:signingWallet,session});fresh(version);
  status.textContent='Review the private invitation action in your wallet. No payment requested.';
  const {signMessage}=await import('./wallet-kit.js');const signed=await signMessage(proof.message,{address:signingWallet,networkPassphrase:stellar.NETWORK});
  await stellar.assertWallet(signingWallet);fresh(version);
  if(signed.error||!signed.signedMessage||signed.signerAddress!==signingWallet)throw Error('Signature cancelled. Nothing was sent.');
  const signature=typeof signed.signedMessage==='string'?signed.signedMessage:btoa(String.fromCharCode(...signed.signedMessage));
  const data=await request({action:'commit',token:proof.token,signature});fresh(version);return {...data,wallet:signingWallet};
 }
 async function action(task){if(busy||closed)return;busy=true;root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);try{await task();}catch(e){if(!closed)status.textContent=e.message;}finally{busy=false;root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false);}}
 function render(){
  const list=$('[data-list]');list.replaceChildren();
  for(const row of items){
   const card=document.createElement('article'),expired=Date.parse(row.expires_at)<=Date.now(),pending=row.status==='pending'&&!expired;
   for(const text of [row.title,(row.client===wallet?'Sent to '+row.recipient:'From '+row.client),row.brief,(row.status==='pending'&&expired?'expired':row.status)+' · responds by '+new Date(row.expires_at).toLocaleString()]){const line=document.createElement('p');line.textContent=text;line.style.overflowWrap='anywhere';card.append(line);}
   const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>action(fn);card.append(b);};
   if(pending){for(const operation of row.client===wallet?['cancel']:['accept','decline'])button(operation[0].toUpperCase()+operation.slice(1)+' invitation',async()=>{await sign(operation,{id:row.id});await read();status.textContent='Invitation '+operation+' confirmed. No escrow or payment was created.';});}
   if(row.status==='accepted'&&row.client===wallet)button('Review agreement draft',async()=>{
    const version=epoch;const d=await request({action:'list',session});fresh(version);const current=d.invitations.find(i=>i.id===row.id);
    if(current?.status!=='accepted'||current.client!==wallet)throw Error('Refresh the invitation before continuing.');
    const stellar=await import('./stellar.js');await stellar.assertWallet(wallet);fresh(version);
    const workspace=await import('./workspace.js');fresh(version);await stellar.assertWallet(wallet);fresh(version);if(await workspace.draftFromOpportunity({title:current.title,seller:current.recipient,terms:current.brief,source:'invitation'})){panel.close();}
   });
   list.append(card);
  }
  if(!items.length)list.textContent='No invitations yet. Invite a collaborator below.';
 }
 async function read(){if(!session||reading||closed)return;reading=true;const version=epoch;try{const data=await request({action:'list',session});fresh(version);items=data.invitations;render();status.textContent='Private inbox updated · checks every 15 seconds while open.';}catch(e){if(!closed&&version===epoch)status.textContent=e.message;}finally{reading=false;}}
 $('[data-unlock]').onclick=()=>action(async()=>{const d=await sign('inbox');session=d.session;wallet=d.wallet;$('[data-private]').hidden=false;$('[data-lock]').hidden=false;$('[data-unlock]').hidden=true;await read();});
 $('[data-lock]').onclick=lock;$('[data-refresh]').onclick=()=>action(read);
 $('[data-send]').onclick=()=>action(async()=>{await sign('create',{recipient:$('[data-recipient]').value.trim(),title:$('[data-title]').value,brief:$('[data-brief]').value});$('[data-title]').value='';$('[data-brief]').value='';await read();status.textContent='Private invitation sent. No agreement or payment was created.';});
 const prefill=e=>{root.open=true;if(!session){status.textContent='Unlock your private inbox, then choose Invite privately again.';root.scrollIntoView({block:'nearest'});return;}if($('[data-title]').value||$('[data-brief]').value){status.textContent='Finish or clear your invitation draft before choosing another person.';return;}$('[data-recipient]').value=e.detail.wallet;$('[data-title]').value=e.detail.title||'';$('[data-brief]').value=(e.detail.brief||'').slice(0,600);root.scrollIntoView({block:'nearest'});};
 addEventListener('accord-private-invite',prefill);addEventListener('accord-wallet',lock);
 request().then(()=>{if(!closed){$('[data-unlock]').disabled=false;status.textContent='Ready. Unlock your private inbox with a wallet signature.';}}).catch(()=>{if(!closed){status.textContent='Private invitations need their database setup. Public chat and existing agreements remain available.';$('[data-unlock]').disabled=true;}});
 const timer=setInterval(()=>{if(root.open&&!document.hidden&&!busy)read();},15000);
 return()=>{closed=true;lock();clearInterval(timer);removeEventListener('accord-wallet',lock);removeEventListener('accord-private-invite',prefill);};
}

export function mountProfiles(panel){
 panel.querySelector('[data-people]')?.remove();
 const root=document.createElement('details');root.dataset.people='';
 root.innerHTML=`<summary>People & profiles</summary><h3>Find your next collaborator</h3><p>Opt-in profiles stay public until removed. Names and skills are self-described, not verified credentials.</p><button type="button" data-reload>Refresh people</button><div data-directory></div><details><summary>Publish or edit my profile</summary><button type="button" data-load>Load my public profile</button><form data-profile-form><label>Public name<input name="name" maxlength="60" required></label><label>Introduction<textarea name="intro" maxlength="280" required></textarea></label><label>Skills<input name="skills" maxlength="120" required placeholder="Design, development, writing…"></label><label>Availability<select name="availability"><option>Available for work</option><option>Hiring</option><option>Open to collaboration</option><option>Not currently available</option></select></label><label><input type="checkbox" name="consent" required> Publish my profile and wallet address publicly until I remove it.</label><p>Others may copy your profile. Removal clears its text; wallet and version metadata remain to prevent replay. No payment is requested.</p><button type="submit">Review & sign profile</button><button type="button" data-remove>Remove my public profile</button></form></details><p data-profile-status role="status"></p>`;
 panel.querySelector('[data-live]').before(root);
 const form=root.querySelector('form'),status=root.querySelector('[data-profile-status]'),directory=root.querySelector('[data-directory]');
 let closed=false,epoch=0,busy=false;
 const changed=()=>{epoch++;form.reset();status.textContent='Wallet changed. Load your profile before editing.';};
 addEventListener('accord-wallet',changed);
 async function request(body,query=''){
  const r=await fetch('/api/lounge-profiles'+query,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Profiles unavailable.');return d;
 }
 async function read(){try{const d=await request();if(closed)return;directory.replaceChildren();for(const p of d.profiles){const card=document.createElement('article');for(const value of [p.display_name,p.availability,p.intro,p.skills,p.wallet]){const line=document.createElement('p');line.textContent=value;line.style.overflowWrap='anywhere';card.append(line);}directory.append(card);}if(!d.profiles.length)directory.textContent='Be the first to introduce yourself.';}catch(e){if(!closed)status.textContent=e.message;}}
 root.querySelector('[data-reload]').onclick=read;
 root.querySelector('[data-load]').onclick=async()=>{try{const stellar=await import('./stellar.js');if(!stellar.account)await stellar.connect();const wallet=stellar.account,version=epoch;const d=await request(null,'?wallet='+encodeURIComponent(wallet));if(closed||version!==epoch)return;const p=d.profiles.find(p=>p.wallet===wallet);if(!p){status.textContent='No visible profile for this wallet yet.';return;}for(const k of ['intro','skills','availability'])form.elements[k].value=p[k];form.elements.name.value=p.display_name;form.elements.consent.checked=false;status.textContent='Profile loaded. Review your changes before signing.';}catch(e){if(!closed)status.textContent=e.message;}};
 async function write(operation){
  if(busy)return;const values=Object.fromEntries(new FormData(form)),consent=form.elements.consent.checked;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const stellar=await import('./stellar.js');if(!stellar.account)await stellar.connect();const wallet=stellar.account,version=epoch;await stellar.assertWallet(wallet);
   const proof=await request({action:'challenge',operation,wallet,...values,consent});
   if(closed||version!==epoch)throw Error('Wallet changed. Review again.');
   status.textContent='Review the profile action in your wallet. No payment is requested.';
   const {signMessage}=await import('./wallet-kit.js');const signed=await signMessage(proof.message,{address:wallet,networkPassphrase:stellar.NETWORK});await stellar.assertWallet(wallet);
   if(closed||version!==epoch)throw Error('Profile action cancelled because the wallet changed.');
   if(signed.error||!signed.signedMessage||signed.signerAddress!==wallet)throw Error('Signature cancelled. Your draft is still here.');
   const signature=typeof signed.signedMessage==='string'?signed.signedMessage:btoa(String.fromCharCode(...signed.signedMessage));
   await request({action:operation,token:proof.token,signature});if(closed)return;
   status.textContent=operation==='remove'?'Public profile removed.':'Profile published. You can edit or remove it here.';if(operation==='remove')form.reset();await read();
  }catch(e){if(!closed)status.textContent=e.message;}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 form.onsubmit=e=>{e.preventDefault();write('save');};root.querySelector('[data-remove]').onclick=()=>write('remove');
 read();return()=>{closed=true;epoch++;removeEventListener('accord-wallet',changed);};
}

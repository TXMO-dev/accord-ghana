import './lounge.css';
let dialog,stop=()=>{};
export function openLounge(){
 if(!dialog){
  dialog=document.createElement('dialog');dialog.className='accord-lounge';dialog.dataset.worldConversation='';dialog.setAttribute('aria-labelledby','lounge-title');
  dialog.innerHTML=`<button type="button" data-close aria-label="Close Accord Lounge">Close ×</button><small>MEET PEOPLE. FIND YOUR NEXT COLLABORATION.</small><h2 id="lounge-title">Accord Lounge</h2><p>Introduce yourself, share what you do, or find your next collaborator.</p><p class="lounge-disclosure">Public conversation · Testnet community. Messages disappear from this feed after 24 hours. Others can copy them. Names are self-chosen; wallet signatures do not verify someone's identity.</p><p data-live role="status">Connecting to the lounge…</p><ol data-feed aria-label="Recent public lounge messages"></ol><button type="button" data-refresh>Refresh conversation</button><form><label>Your public name<input name="name" maxlength="60" autocomplete="nickname" required></label><label>Your message<textarea name="message" maxlength="1000" rows="3" placeholder="Hi! I build websites in Accra. I’m looking for a design collaborator…" required></textarea></label><p>No payment is requested. Your wallet signs the exact post before it is published. Never share secret keys or confidential information.</p><button type="submit">Review & sign public post</button></form><p data-result role="status"></p>`;
  (document.querySelector('.room-view')||document.body).append(dialog);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();}});
  dialog.addEventListener('close',()=>stop());
 }
 if(dialog.open)return;
 dialog.show();startLounge(dialog);
}
function startLounge(panel){
 let closed=false,loading=false,posting=false,rows=[],client=null,live=false,lastFetch=0,epoch=0;
 const feed=panel.querySelector('[data-feed]'),status=panel.querySelector('[data-live]'),result=panel.querySelector('[data-result]'),form=panel.querySelector('form'),submit=form.querySelector('button');
 const blocked=new Set();try{for(const w of JSON.parse(localStorage.getItem('accord-lounge-muted')||'[]'))if(typeof w==='string')blocked.add(w);}catch{}
 const render=()=>{
  const visible=rows.filter(r=>Date.parse(r.expires_at)>Date.now()&&!blocked.has(r.wallet));feed.replaceChildren();
  if(!visible.length){const li=document.createElement('li');li.textContent='The lounge is quiet. Start a conversation.';feed.append(li);}
  for(const r of [...visible].reverse()){
   const li=document.createElement('li'),name=document.createElement('strong'),wallet=document.createElement('small'),body=document.createElement('p'),mute=document.createElement('button');
   name.textContent=r.display_name;wallet.textContent=`${r.wallet.slice(0,6)}…${r.wallet.slice(-4)} · ${new Date(r.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;wallet.title=r.wallet;body.textContent=r.body;mute.type='button';mute.textContent='Mute wallet';mute.setAttribute('aria-label','Mute wallet '+r.wallet.slice(0,6));mute.onclick=()=>{blocked.add(r.wallet);try{localStorage.setItem('accord-lounge-muted',JSON.stringify([...blocked]));}catch{}render();result.textContent='Wallet muted on this device.';};li.append(name,wallet,body,mute);feed.append(li);
  }
 };
 async function read(){
  if(closed||document.hidden||loading||Date.now()-lastFetch<1500)return;
  loading=true;lastFetch=Date.now();
  try{
   const r=await fetch('/api/lounge',{signal:AbortSignal.timeout(20000)}),data=await r.json();if(!r.ok)throw Error(data.error||'Conversation unavailable.');if(closed)return;
   rows=data.messages;render();status.textContent=live?'Live conversation connected':'Conversation up to date · checking for new messages';
   if(!client&&data.realtime){
    const {createClient}=await import('@supabase/supabase-js');if(closed)return;
    client=createClient(data.realtime.url,data.realtime.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    client.channel(data.realtime.topic).on('broadcast',{event:'lounge_changed'},()=>read()).subscribe(state=>{if(closed)return;live=state==='SUBSCRIBED';status.textContent=live?'Live conversation connected':'Live connection reconnecting · periodic refresh remains active';});
   }
  }catch(e){if(!closed)status.textContent=e.message;}finally{loading=false;}
 }
 const changed=()=>{epoch++;if(!closed)result.textContent='Wallet changed. Your next post will ask you to review and sign.';};
 addEventListener('accord-wallet',changed);
 panel.querySelector('[data-refresh]').onclick=()=>{lastFetch=0;read();};
 form.onsubmit=async e=>{
  e.preventDefault();if(posting)return;posting=true;submit.disabled=true;
  try{
   const stellar=await import('./stellar.js');if(!stellar.account)await stellar.connect();
   const wallet=stellar.account,version=epoch;await stellar.assertWallet(wallet);
   const request=async b=>{const r=await fetch('/api/lounge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),signal:AbortSignal.timeout(25000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Lounge request failed.');return d;};
   const proof=await request({action:'challenge',wallet,name:form.elements.name.value,text:form.elements.message.value});
   if(closed||version!==epoch)throw Error('Wallet changed. Please review your post again.');
   result.textContent='Review the public post in your wallet. Signing publishes this text; no funds move.';
   const {signMessage}=await import('./wallet-kit.js');const signed=await signMessage(proof.message,{address:wallet,networkPassphrase:stellar.NETWORK});
   await stellar.assertWallet(wallet);if(closed||version!==epoch)throw Error('Posting cancelled because the wallet or lounge changed.');
   if(signed.error||!signed.signedMessage||signed.signerAddress!==wallet)throw Error('Signature cancelled. Your draft is still here.');
   const signature=typeof signed.signedMessage==='string'?signed.signedMessage:btoa(String.fromCharCode(...signed.signedMessage));
   await request({action:'post',token:proof.token,signature});if(closed)return;
   form.elements.message.value='';result.textContent='Posted to the public lounge. Visible for 24 hours.';lastFetch=0;await read();
  }catch(e){if(!closed)result.textContent=e.message;}finally{posting=false;submit.disabled=false;}
 };
 const refresh=setInterval(read,12000),expiry=setInterval(render,1000);
 stop=()=>{closed=true;epoch++;clearInterval(refresh);clearInterval(expiry);removeEventListener('accord-wallet',changed);client?.removeAllChannels();};
 read();
}

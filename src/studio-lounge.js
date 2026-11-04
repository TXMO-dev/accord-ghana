import './lounge.css';
let dialog;
export function openLounge(){
 if(!dialog){
  dialog=document.createElement('dialog');dialog.className='accord-lounge';dialog.dataset.worldConversation='';dialog.setAttribute('aria-labelledby','lounge-title');
  dialog.innerHTML=`<button type="button" data-close aria-label="Close Accord Lounge">Close ×</button><small>MEET PEOPLE. FIND YOUR NEXT COLLABORATION.</small><h2 id="lounge-title">Accord Lounge</h2><p>A place for creators and clients to start a conversation, then turn a good connection into a clear agreement.</p><form><label>Your introduction<textarea name="intro" maxlength="500" rows="3" placeholder="Hi, I design identities for growing businesses in Ghana…" required></textarea></label><label>Skills or services<input name="skills" maxlength="160" placeholder="Brand design, illustration, web development" required></label><label>What brings you here?<select name="looking"><option>Looking for a client</option><option>Looking for a freelancer</option><option>Looking for collaborators</option></select></label><button type="submit">Prepare introduction</button></form><section hidden data-preview><h3>Your introduction</h3><p data-copy></p><button type="button" data-clipboard>Copy introduction</button></section><p role="status"></p><details><summary>What is coming to the lounge?</summary><p>Wallet-verified introductions, live conversations and public messages that expire after 24 hours. Public chat and voice notes are not available yet. This introduction stays in this open panel and is not published.</p><p>Accord Gallery is a later phase for showcasing creative work. NFT sales are not enabled.</p></details>`;
  (document.querySelector('.room-view')||document.body).append(dialog);
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();}});
  const status=dialog.querySelector('[role=status]');
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);dialog.querySelector('[data-copy]').textContent=`${data.get('intro').trim()}\n\nSkills: ${data.get('skills').trim()}\n${data.get('looking')}`;dialog.querySelector('[data-preview]').hidden=false;status.textContent='Ready to copy. Nothing has been posted publicly.';};
  dialog.querySelector('[data-clipboard]').onclick=async()=>{try{await navigator.clipboard.writeText(dialog.querySelector('[data-copy]').textContent);status.textContent='Introduction copied.';}catch{status.textContent='Copy unavailable. Select your introduction text and copy it manually.';}};
 }
 if(!dialog.open)dialog.show();
}

// Session-only notices. No wallet credentials or private comment bodies are saved.
const dialog=document.createElement('dialog');dialog.className='room-keyboard-help';
dialog.innerHTML='<h2>Your project updates</h2><p class="inbox-scope"></p><p>Updates received in this page session. Join the project room for live updates; this is not a complete transaction history.</p><ol class="activity-inbox-list"></ol><div class="actions"><button type="button" data-room>Open project room</button><button type="button" class="secondary" data-close>Close</button></div>';
document.body.append(dialog);
const button=document.createElement('button');button.type='button';button.textContent='Updates';document.querySelector('.room-view-controls').append(button);
let context='',title='',items=[],unread=0;
function render(){button.textContent=unread?'Updates · '+unread:'Updates';dialog.querySelector('.inbox-scope').textContent=title||'Select an agreement to begin.';const list=dialog.querySelector('ol');list.replaceChildren();for(const item of items){const li=document.createElement('li'),time=document.createElement('small'),text=document.createElement('p');time.textContent=new Date(item.at).toLocaleTimeString();text.textContent=item.text;li.append(time,text);list.append(li);}if(!items.length){const li=document.createElement('li');li.textContent='No updates received in this session yet.';list.append(li);}}
function open(){unread=0;render();if(!dialog.open)dialog.showModal();dispatchEvent(new Event('accord-inbox-read'));}
button.onclick=open;addEventListener('accord-open-inbox',open);
dialog.querySelector('[data-close]').onclick=()=>dialog.close();
dialog.querySelector('[data-room]').onclick=()=>{dialog.close();dispatchEvent(new Event('accord-open-workspace'));dispatchEvent(new Event('accord-open-project-room'));};
function add(text){if(!context)return;items.unshift({text,at:Date.now()});items=items.slice(0,50);if(!dialog.open)unread++;render();}
addEventListener('accord-agreement-state',e=>{const next=e.detail.wallet&&e.detail.id?e.detail.wallet+':'+e.detail.id:'';if(next!==context){context=next;items=[];unread=0;}title=e.detail.title||'';render();});
addEventListener('accord-participant-notice',e=>{if(typeof e.detail?.text==='string')add(e.detail.text);});
addEventListener('accord-room-new-comment',e=>add((e.detail?.count||1)+' new project comment(s). Open the shared room to read them.'));
const offline=document.createElement('p');offline.className='studio-offline notice';offline.setAttribute('role','status');document.querySelector('.room-layout').append(offline);
function connectivity(){offline.hidden=navigator.onLine;offline.textContent='You are offline. Saved agreements remain on this device. Reconnect and refresh the ledger before continuing.';}
addEventListener('online',connectivity);addEventListener('offline',connectivity);connectivity();render();

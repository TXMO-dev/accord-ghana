import {LOCAL_TESTING} from './local-mode.js';
if(!LOCAL_TESTING)throw Error('Local testing only.');
const wallet=await import('./local-wallet.js');
const {connect}=await import('./stellar.js');
const panel=document.createElement('section');panel.id='local-test-panel';
panel.style.cssText='padding:26px 6%;background:#173d31;color:#fff;border:2px solid #b48c68;position:relative;z-index:6';
panel.innerHTML='<h2 style="margin:0 0 12px">Local Testnet lab</h2><p>Disposable wallets · keys stay in this tab’s memory · reload discards both wallets. No Varial connection is used. Export agreement records before reloading; these wallets cannot be recovered.</p><button id="local-fund">1. Fund disposable wallets</button> <button id="local-client">Use client</button> <button id="local-freelancer">Use freelancer</button><p id="local-status" role="status">Fund both wallets, then use the client to create an agreement.</p><label>Client address<input id="local-client-address" readonly></label><label>Freelancer address<input id="local-freelancer-address" readonly></label><p>Create with the freelancer address below, fund, switch to freelancer to submit, then switch to client to approve. All writes still ask for confirmation.</p>';
document.querySelector('#workspace').prepend(panel);
for(const role of ['client','freelancer'])document.querySelector('#local-'+role+'-address').value=wallet.addresses[role];
const status=s=>document.querySelector('#local-status').textContent=s;
let working=false,workspaceLocked=false;
function localControls(){for(const id of ['local-client','local-freelancer','local-fund'])document.getElementById(id).disabled=working||workspaceLocked}
window.addEventListener('accord-workspace-lock',event=>{workspaceLocked=event.detail;localControls()});
async function switchRole(role){if(working||workspaceLocked)return;wallet.selectRole(role);await connect();status('Active disposable wallet: '+role+'. Continue in the workspace below.');}
document.querySelector('#local-client').onclick=()=>switchRole('client');
document.querySelector('#local-freelancer').onclick=()=>switchRole('freelancer');
document.querySelector('#local-fund').onclick=async()=>{if(working)return;working=true;localControls();const b=document.querySelector('#local-fund');b.disabled=true;try{await wallet.fundWallets(status);wallet.selectRole('client');await connect();status('Both disposable wallets funded. Client selected. Create your first agreement below.')}catch(e){status(e.message)}finally{working=false;localControls()}};
for(const notice of document.querySelectorAll('.notice'))if(notice.textContent.includes('Testnet access is open.'))notice.textContent='LOCAL TEST MODE: disposable Testnet wallets enabled on localhost only. Blockaid reports the false-positive flag corrected; wallet propagation remains unverified.';
for(const id of ['studio-connect','connect-wallet','account-connect'])document.getElementById(id).textContent='Connect selected test wallet';

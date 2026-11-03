import {connect,invoke,readAgreement,digest,bytes,address,amount} from './stellar.js';
const $=id=>document.getElementById(id);
let busy=false;
const status=text=>$('chain-status').textContent=text;
const config=await fetch('/network.json').then(r=>r.json()).catch(()=>({}));
if(config.contractId){$('contract-id').value=config.contractId;$('contract-id').readOnly=true}
if(config.assetId){$('asset-id').value=config.assetId;$('asset-id').readOnly=true}
$('connect-wallet').onclick=async()=>{
 try {status('Waiting for Varial…');const a=await connect();$('wallet-address').textContent=a;status('Wallet connected. Each write still requires your signature.');}
 catch(e){status(e.message)}
};
$('chain-action').onsubmit=async e=>{
 e.preventDefault();if(busy)return;busy=true;
 const buttons=e.target.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
 try{
   const f=new FormData(e.target),id=String(f.get('agreement')).trim(), contract=String(f.get('contract')).trim();
   if(!id)throw Error('An agreement identifier is required.');
   const key=bytes(await digest(id));const action=e.submitter.value;
   if(action==='read'){const a=await readAgreement(contract,id);$('chain-result').textContent=JSON.stringify(a,(_,v)=>typeof v==='bigint'?v.toString():v,2);status('Read from Stellar Testnet.');return}
   let args=[key];
   if(action==='create'){
     const terms=String(f.get('terms')).trim();if(!terms)throw Error('Write the acceptance conditions first.');
     const wallet=$('wallet-address').textContent;
     args=[key,address(wallet),address(String(f.get('seller')).trim()),address(String(f.get('asset')).trim()),amount(String(f.get('amount'))),bytes(await digest(terms))];
   }
   if(action==='submit'){const proof=String(f.get('evidence')).trim();if(!proof)throw Error('Enter a delivery reference to hash.');args.push(bytes(await digest(proof)))}
   if(action==='dispute')args.push(address($('wallet-address').textContent));
   const result=await invoke(contract,action,args,status);
   const a=document.createElement('a');a.href='https://stellar.expert/explorer/testnet/tx/'+result.hash;a.target='_blank';a.rel='noopener';a.textContent='Confirmed on testnet ↗';
   $('chain-result').replaceChildren(a);status('Confirmed. Refresh the agreement to inspect its current state.');
 }catch(e){status(e.message)}finally{busy=false;buttons.forEach(b=>b.disabled=false)}
};

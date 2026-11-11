import {formatUnits,stateName} from './workspace-model.js';
export function agreementSummary({record,agreement,contract,checkedAt}) {
 const lines=['ACCORD / AGREEMENT SUMMARY','Stellar Testnet - test assets only','',record.title,'Agreement: '+record.id,'Contract: '+contract,''];
 if(record.project)lines.push('PROJECT PLAN (unverified grouping metadata)',record.project.name,'Project: '+record.project.id,'Stage: '+record.project.stage+' of '+record.project.total,'');
 if(agreement)lines.push('State: '+stateName(agreement),'Amount: '+formatUnits(agreement.amount)+' test XLM','Client: '+agreement.buyer,'Freelancer: '+agreement.seller,'Last checked: '+checkedAt,'');
 else lines.push('Onchain state not verified in this session.','');
 lines.push('ACCEPTANCE CONDITIONS',record.terms,'','HANDOFF','Share the exported agreement JSON privately. The recipient should open it in Accord and verify the conditions against the contract. In the local lab, each tab generates different disposable wallets; use the same tab and role controls to test both parties.','','RECEIPTS RECORDED IN THIS BROWSER');
 for(const event of record.events||[])if(/^[a-f0-9]{64}$/.test(event.hash))lines.push(event.action+': https://stellar.expert/explorer/testnet/tx/'+event.hash);
 lines.push('','This summary is a snapshot, not a live balance statement or independent audit. Recheck the contract for current state. No real-money payout is supported.');
 return lines.join('\n');
}
export function downloadText(name,text,type='text/plain') {
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function copyText(text,onStatus){
 try{await navigator.clipboard.writeText(text);onStatus('Copied. Share privately with the other party.')}catch{onStatus('Clipboard access is unavailable. Download the summary or select and copy the text manually.')}
}

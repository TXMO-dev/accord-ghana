// Navigation only: wallet and contract checks still authorize every action.
export function workstationIntent(station,{wallet='',state='',role='',pending=false,verified=false}={}){
 if(pending)return {message:'A transaction is awaiting confirmation. Refresh its receipt before another action.'};
 if(!wallet)return {target:'studio-connect',message:'Connect your wallet to use this workstation.'};
 if(station===0)return {target:'studio-new',message:'Define the work and review the agreement before signing.'};
 if(!verified)return {target:'studio-refresh',message:'Select an agreement and refresh it to verify its current state.'};
 if(state==='Disputed')return {target:'settlement-panel',message:'This agreement is disputed. Use the project room to agree and authorize a settlement.'};
 if(['Released','Settled','Cancelled'].includes(state))return {target:'studio-detail',message:'This agreement is complete. Your receipts are available below.'};
 if(station===1&&state==='Draft'&&role==='client')return {action:'fund',message:'Review the funding amount before approving in your wallet.'};
 if(station===2&&state==='Funded'&&role==='freelancer')return {target:'studio-proof',message:'Enter your delivery reference, then choose Submit delivery.'};
 if(station===3&&state==='Submitted'&&role==='client')return {target:'studio-verify-text',message:'Check the freelancer’s delivery reference, then choose Approve & release.'};
 return {target:'studio-detail',message:role==='observer'?'This wallet is not a participant in the selected agreement.':'This step is not available to your wallet in the current agreement state. Follow the next-step message below.'};
}

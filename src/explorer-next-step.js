// Guidance is derived from verified agreement state, never from room comments.
export function explorerNextStep(state={}){
 if(!state.id)return {label:'Start an agreement',detail:'Visit the agreement desk to set the scope together.',station:0};
 if(state.pending)return {label:'Check pending transaction',detail:'Wait for confirmation before taking the next step.',workspace:true};
 if(!state.verified||!state.participant)return {label:'Verify your agreement',detail:'Open your agreement and verify its state and participant wallet.',workspace:true};
 const client=state.wallet===state.buyer;
 switch(state.state){
 case 'Draft':return {label:client?'Fund the milestone':'Check milestone funding',detail:client?'Review the amount at the funding desk.':'The client must fund the milestone before work starts.',station:1};
 case 'Funded':return {label:client?'Check delivery progress':'Prepare your delivery',detail:client?'The freelancer can submit the delivery reference.':'Visit the delivery desk to submit your work reference.',station:2};
 case 'Submitted':case 'Delivered':return {label:client?'Review the delivery':'Check the client’s review',detail:client?'Review the delivered work before approving release.':'The client reviews the work and approves release.',station:3};
 case 'Disputed':return {label:'Discuss a settlement',detail:'Both parties must agree on the split. Visit the Project Pavilion.',place:'room'};
 case 'Released':case 'Settled':return {label:'Keep your receipts',detail:'Your milestone is closed. Visit the Receipt Gallery for its history.',place:'archive'};
 default:return {label:'Verify your agreement',detail:'Refresh the agreement before continuing.',workspace:true};
 }
}

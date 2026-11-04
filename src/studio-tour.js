import {courtyardPlaces} from './courtyard-layout.js';
export const tourHome={x:.1,z:2.9,text:'Back at base! Choose a workstation, explore the World map or open My agreements.'};
const descriptions={lounge:'Welcome to Accord Lounge. This is our café for meeting collaborators. Select the counter to prepare your introduction. Public chat is coming next; nothing you write here is published.',room:'Welcome to the Project Pavilion. Join your private project room to share updates and discuss a settlement with your partner. Select the desk to open it.',review:'This is the Review Terrace. Share delivery notes, request revisions and check the agreed conditions together. Review notes do not release payment.',archive:'The Receipt Gallery keeps the record of your work. Select its desk to inspect the selected agreement’s transaction history and save your receipts.'};
export const tourStops=[
 {x:-2,z:2.1,station:0,text:'First, the agreement desk. Write down the work, the amount and what “done” means.'},
 {x:-2,z:-1.4,station:1,text:'Next, funding. The client funds the milestone before work begins. Always check the actual agreement record.'},
 {x:2.5,z:-1.2,station:2,text:'Here, the freelancer submits delivery. Accord keeps the next action tied to the right wallet.'},
 {x:1,z:2.8,station:3,text:'At the review gallery, the client reviews delivery before approving payment. Now let’s explore the courtyard.'},
 ...courtyardPlaces.map(p=>({x:p.x,z:p.z-1.5,place:p.id,text:descriptions[p.id]})),
 tourHome
];

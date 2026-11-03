export function receiptEvents(events) {
 const labels={create:'Agreement created',fund:'Milestone funded',submit:'Delivery submitted',release:'Payment released',dispute:'Dispute raised',settle:'Mutual settlement completed',SUCCESS:'Transaction confirmed',FAILED:'Transaction failed',EXPIRED:'Transaction expired without confirmation'};
 const seen=new Set();
 return (Array.isArray(events)?events:[]).filter(e=>e&&typeof e.hash==='string'&&/^[a-f0-9]{64}$/i.test(e.hash)&&Object.hasOwn(labels,e.action)).filter(e=>{const key=e.hash.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).map(e=>({...e,label:labels[e.action],confirmedAt:typeof e.confirmedAt==='string'&&Number.isFinite(Date.parse(e.confirmedAt))?e.confirmedAt:null}));
}
export function searchAgreements(records,query='',scope='all') {
 const q=query.trim().toLowerCase();
 return records.filter(r=>(!q||r.title.toLowerCase().includes(q)||r.id.toLowerCase().includes(q))&&(scope!=='pending'||!!r.pending));
}

export const reviewPrefix='ACCORD_REVIEW_V1:';
export function conditionsList(terms){const lines=String(terms||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);return lines.length<=12?lines:[String(terms)];}
export function cleanReview(value,role,termsHash){
 if(!value||!['delivery','revision','reviewed'].includes(value.kind))throw Error('Choose a review action.');
 if((value.kind==='delivery'&&role!=='freelancer')||(value.kind!=='delivery'&&role!=='client'))throw Error('This review action belongs to the other participant.');
 const notes=typeof value.notes==='string'?value.notes.trim():'',reference=typeof value.reference==='string'?value.reference.trim():'';
 if(!notes||notes.length>600||reference.length>300)throw Error('Add notes up to 600 characters and a reference up to 300 characters.');
 if(value.kind==='delivery'&&!reference)throw Error('Add a delivery reference.');
 if(value.termsHash!==termsHash||!/^[a-f0-9]{64}$/.test(termsHash))throw Error('Agreement conditions changed. Refresh before reviewing.');
 const total=value.total;if(!Number.isInteger(total)||total<1||total>12)throw Error('Invalid acceptance checklist.');
 const checked=Array.isArray(value.checked)?[...new Set(value.checked)]:[];if(checked.some(i=>!Number.isInteger(i)||i<0||i>=total))throw Error('Invalid checklist selection.');
 const review={kind:value.kind,notes,reference,termsHash,total,checked};if((reviewPrefix+JSON.stringify(review)).length>1500)throw Error('Shorten the review notes.');return review;
}
export function parseReview(body){if(typeof body!=='string'||!body.startsWith(reviewPrefix))return null;try{const p=JSON.parse(body.slice(reviewPrefix.length));return cleanReview(p,p.kind==='delivery'?'freelancer':'client',p.termsHash);}catch{return null;}}

const prefix='ACCORD OPPORTUNITY / 1\n';
export function encodeOpportunity({kind,title,details}){
 if(!['hiring','available'].includes(kind))throw Error('Choose hiring or available for work.');
 if(typeof title!=='string'||!title.trim()||title.trim().length>90)throw Error('Add a title of up to 90 characters.');
 if(typeof details!=='string'||!details.trim()||details.trim().length>650)throw Error('Describe the opportunity in up to 650 characters.');
 const text=prefix+JSON.stringify({kind,title:title.trim(),details:details.trim()});
 if(text.length>1000)throw Error('Shorten the opportunity to fit a public post.');
 return text;
}
export function parseOpportunity(text){
 try{if(typeof text!=='string'||!text.startsWith(prefix)||text.length>1000)return null;const p=JSON.parse(text.slice(prefix.length));encodeOpportunity(p);return {kind:p.kind,title:p.title.trim(),details:p.details.trim()};}catch{return null;}
}
export function opportunityDraft(post,wallet,now=Date.now()){
 const p=parseOpportunity(post?.body);
 if(!p||post.hidden||!(Date.parse(post.expires_at)>now))throw Error('This opportunity has expired or is unavailable.');
 if(!/^G[A-Z2-7]{55}$/.test(post.wallet)||!/^G[A-Z2-7]{55}$/.test(wallet))throw Error('Connect a Stellar wallet first.');
 if(p.kind!=='available')throw Error('Contact the client first to agree on the work.');
 if(post.wallet===wallet)throw Error('Choose another freelancer; you cannot hire your own wallet.');
 return {title:p.title,seller:post.wallet,terms:'Draft for discussion — agree on deliverables, acceptance criteria and price before signing.\n\n'+p.details};
}

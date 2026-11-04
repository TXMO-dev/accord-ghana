// A new feed must not celebrate its existing history. IDs remain seen even when
// hidden or expired, so a restored message cannot trigger a second notification.
export function createLoungeActivityTracker(){
 let initialized=false;const seen=new Set();
 return {observe(rows,{muted=new Set(),now=Date.now()}={}){
  const fresh=[];
  for(const row of rows){if(!row?.id)continue;const known=seen.has(row.id);seen.add(row.id);
   if(initialized&&!known&&!muted.has(row.wallet)&&Date.parse(row.expires_at)>now)fresh.push(row);
  }
  initialized=true;return fresh.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
 }};
}

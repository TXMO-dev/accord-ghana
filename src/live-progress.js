// Only transitions between verified ledger snapshots qualify for a celebration.
export function createProgressTracker(){
 const states=new Map();
 return detail=>{
  if(!detail?.id||!detail.verified||detail.pending)return null;
  const previous=states.get(detail.id);states.set(detail.id,detail.state);
  if(!previous||previous===detail.state)return null;
  return {Draft:'Funded',Funded:'Submitted',Submitted:'Released'}[previous]===detail.state?detail.state:null;
 };
}
export function mountLiveProgress(){
 const track=createProgressTracker();
 addEventListener('accord-agreement-state',e=>{
  const milestone=track(e.detail);if(!milestone)return;
  dispatchEvent(new CustomEvent('accord-milestone-confirmed',{detail:{state:milestone}}));
  const note=document.createElement('div');note.className='milestone-toast';note.setAttribute('role','status');note.textContent=({Funded:'Milestone funded · verified on Stellar Testnet',Submitted:'Delivery recorded · verified on Stellar Testnet',Released:'Milestone released · verified on Stellar Testnet'})[milestone];document.body.append(note);setTimeout(()=>note.remove(),6500);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('still'))return;
  const burst=document.createElement('div');burst.className='milestone-confetti';burst.setAttribute('aria-hidden','true');
  for(let i=0;i<30;i++){const piece=document.createElement('i');piece.style.setProperty('--x',(i*3.4)+'vw');piece.style.setProperty('--delay',(i%6)*.08+'s');piece.style.setProperty('--turn',(i%2?1:-1)*270+'deg');burst.append(piece);}document.body.append(burst);setTimeout(()=>burst.remove(),3000);
 });
}

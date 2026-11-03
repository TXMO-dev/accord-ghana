import './review.css';
let active=false;
export function reviewAction({title,description,fields=[],confirmLabel='Continue',warning='',eyebrow='REVIEW / STELLAR TESTNET'}) {
 if(active)return Promise.resolve(false);
 active=true;
 return new Promise(resolve=>{
  const previous=document.activeElement, dialog=document.createElement('dialog');
  dialog.className='accord-review';dialog.setAttribute('aria-labelledby','review-heading');
  const art=document.createElement('div');art.className='review-art';
  const brand=document.createElement('span');brand.className='brand';brand.textContent='accord.';
  const principle=document.createElement('p');principle.textContent='Clarity before commitment.';art.append(brand,principle);
  const body=document.createElement('div');body.className='review-body';
  const tag=document.createElement('span');tag.className='eyebrow';tag.textContent=eyebrow;
  const heading=document.createElement('h2');heading.id='review-heading';heading.tabIndex=-1;heading.textContent=title;
  const text=document.createElement('p');text.textContent=description;
  const details=document.createElement('dl');details.className='review-fields';
  for(const [label,value] of fields){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);details.append(dt,dd)}
  body.append(tag,heading,text,details);
  if(warning){const note=document.createElement('p');note.className='notice';note.textContent=warning;body.append(note)}
  const actions=document.createElement('div');actions.className='review-actions';
  const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Go back';cancel.autofocus=true;
  const approve=document.createElement('button');approve.textContent=confirmLabel;
  let result=false;
  cancel.onclick=()=>dialog.close();approve.onclick=()=>{result=true;dialog.close()};
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close()});
  dialog.addEventListener('close',()=>{active=false;dialog.remove();if(previous?.isConnected)previous.focus();resolve(result)},{once:true});
  actions.append(cancel,approve);body.append(actions);dialog.append(art,body);document.body.append(dialog);dialog.showModal();heading.focus({preventScroll:true});dialog.scrollTop=0;
 });
}

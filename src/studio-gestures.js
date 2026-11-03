export function createTapTracker(threshold=10){
 const pointers=new Map();let candidate=null;
 return {
  down(e){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)candidate={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};else candidate=null;},
  move(e){if(candidate?.id===e.pointerId&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>threshold)candidate.moved=true;},
  up(e){const tapped=!!candidate&&candidate.id===e.pointerId&&!candidate.moved&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)<=threshold&&pointers.size===1;pointers.delete(e.pointerId);candidate=null;return tapped;},
  cancel(){pointers.clear();candidate=null;}
 };
}

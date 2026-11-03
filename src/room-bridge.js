let active=null;
export function setRoomBridge(value){active=value;}
export function roomConnected(id,wallet){return !!active&&active.id===id&&active.wallet===wallet;}
export async function roomRequest(id,wallet,action,offer){
 const selected=active;
 if(!roomConnected(id,wallet))throw Error('Join this agreement’s shared project room first, then try again.');
 const result=await selected.request({action,id,offer});
 if(active!==selected)throw Error('Room or wallet changed. Rejoin before continuing.');
 return result;
}

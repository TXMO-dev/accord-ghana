export const avatarOptions={skin:['#542f22','#815138','#b57850','#d4a47a','#efd1b4'],shirt:['#174b3d','#c59747','#367c91','#a34f45','#68558c'],trousers:['#183e36','#343b48','#73523c'],hair:['crop','curls','bun','none'],accessory:['none','glasses']};
export function cleanAvatar(value={}){return Object.fromEntries(Object.entries(avatarOptions).map(([key,choices])=>[key,choices.includes(value?.[key])?value[key]:choices[0]]));}
export function loadAvatar(wallet){try{const value=JSON.parse(localStorage.getItem('accord-avatar:'+wallet));return value?cleanAvatar(value):null;}catch{return null;}}

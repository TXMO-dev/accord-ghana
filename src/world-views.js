export const VIEW_KEY='accord-world-views-v1';
export function validView(v){return !!v&&typeof v.name==='string'&&v.name.trim().length>0&&v.name.length<=40&&['position','target'].every(k=>Array.isArray(v[k])&&v[k].length===3&&v[k].every(n=>Number.isFinite(n)&&Math.abs(n)<=120))&&v.position[1]>=.2&&Math.hypot(...v.position.map((n,i)=>n-v.target[i]))>=1;}
export function readViews(raw){try{const list=JSON.parse(raw);return Array.isArray(list)?list.filter(validView).slice(0,3):[];}catch{return [];}}
export function saveView(list,view){if(!validView(view))throw new Error('Choose a valid world viewpoint.');return [view,...list.filter(v=>v.name!==view.name)].slice(0,3);}

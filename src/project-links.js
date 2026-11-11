// Planning metadata, never payment authority or verified ledger state.
export function projectLink(value){
 if(value==null)return null;
 if(typeof value!=='object'||!/^AP-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>90||!Number.isInteger(value.stage)||!Number.isInteger(value.total)||value.stage<1||value.total<value.stage||value.total>8)throw Error('Invalid project milestone reference.');
 return {id:value.id,name:value.name.trim(),stage:value.stage,total:value.total};
}
export function linkedRecords(records,link){
 const project=projectLink(link);if(!project)return [];
 return records.filter(r=>r.project?.id===project.id).sort((a,b)=>a.project.stage-b.project.stage||a.id.localeCompare(b.id));
}
export function duplicateStage(records,link){const project=projectLink(link);return project?records.some(r=>r.project?.id===project.id&&r.project.stage===project.stage):false;}

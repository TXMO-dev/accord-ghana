import {projectLink} from './project-links.js';
export function stageUnits(value){
 const text=String(value??'').trim();if(!/^\d{1,6}(\.\d{1,7})?$/.test(text))throw Error('Each stage needs a positive amount with up to 7 decimal places.');
 const [whole,fraction='']=text.split('.');const units=BigInt(whole)*10000000n+BigInt(fraction.padEnd(7,'0'));if(units<=0n||units>1000000000000n)throw Error('Each stage must be greater than zero and at most 100,000 test XLM.');return units;
}
export function displayStageUnits(units){const fraction=String(units%10000000n).padStart(7,'0').replace(/0+$/,'');return String(units/10000000n)+(fraction?'.'+fraction:'');}
export function validatePlan(rows){if(!Array.isArray(rows)||rows.length<1||rows.length>8)throw Error('Plan between one and eight stages.');const stages=rows.map((row,index)=>{const title=String(row.title??'').trim(),terms=String(row.terms??'').trim();if(!title||title.length>90)throw Error(`Stage ${index+1}: add a name of up to 90 characters.`);if(!terms||terms.length>2000)throw Error(`Stage ${index+1}: describe delivery and acceptance in up to 2,000 characters.`);const units=stageUnits(row.amount);return {title,terms,amount:displayStageUnits(units)};});return {stages,total:displayStageUnits(stages.reduce((sum,s)=>sum+stageUnits(s.amount),0n))};}
export function planText(plan){return ['ACCORD / MILESTONE PLAN','Planning only. No agreement has been created or funded.','Each stage is a separate agreement; this plan does not enforce ordering or move funds.','',...plan.stages.flatMap((s,i)=>[`${i+1}. ${s.title}`,`${s.amount} test XLM`,s.terms,'']),`Total planned: ${plan.total} test XLM`].join('\n');}
// Drafts may be incomplete; imported plans must be complete before use.
export function cleanPlanDraft(rows){
 if(!Array.isArray(rows)||rows.length<1||rows.length>8)throw Error('A plan needs one to eight stages.');
 return rows.map(row=>{
  if(!row||typeof row!=='object')throw Error('Invalid stage.');
  const result={};
  for(const [field,max] of [['title',90],['terms',2000],['amount',32]]){
   if(typeof row[field]!=='string'||row[field].length>max)throw Error('Invalid '+field+' in plan.');
   result[field]=row[field];
  }
  return result;
 });
}
export function encodePlan(plan,project=null){const stages=cleanPlanDraft(plan);const link=project?projectLink({...project,stage:1,total:stages.length}):null;return JSON.stringify({format:'accord-project-plan',version:link?2:1,network:'testnet',draft:true,stages,...(link?{project:{id:link.id,name:link.name}}:{})},null,2);}
export function decodePlan(text){
 if(typeof text!=='string'||text.length>96000)throw Error('Choose an Accord plan smaller than 96 KB.');
 let data;try{data=JSON.parse(text);}catch{throw Error('This file is not valid JSON.');}
 if(data?.format!=='accord-project-plan'||![1,2].includes(data.version)||data.network!=='testnet')throw Error('Choose an Accord Testnet project plan, not an agreement or approval file.');
 if(data.version===2)projectLink({...data.project,stage:1,total:data.stages?.length});
 return data.draft===true?cleanPlanDraft(data.stages):validatePlan(cleanPlanDraft(data.stages)).stages;
}
export function planDraftKey(scope){return scope?'accord-project-plan-v1:'+scope:null;}

export function decodePlanProject(text){decodePlan(text);const data=JSON.parse(text);return data.version===2?{id:data.project.id,name:data.project.name}:null;}

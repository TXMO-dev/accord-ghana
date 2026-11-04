import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan,stageUnits,planText,cleanPlanDraft,encodePlan,decodePlan,planDraftKey} from '../src/milestone-planner-model.js';
const row=amount=>({title:'Prototype',terms:'Working preview and agreed checks pass.',amount});
test('totals are exact to seven decimal places',()=>{assert.equal(validatePlan([row('0.1'),row('0.2'),row('0.0000001')]).total,'0.3000001');});
test('invalid amounts and unsafe numeric notation are rejected',()=>{for(const n of ['0','-1','NaN','1e3','0.00000001','100000.0000001'])assert.throws(()=>stageUnits(n));});
test('empty stages and excessive plans cannot be exported',()=>{for(const rows of [[],Array(9).fill(row('1')),[{...row('1'),terms:''}]])assert.throws(()=>validatePlan(rows));});
test('export makes planning status explicit',()=>{assert.match(planText(validatePlan([row('1')])),/No agreement has been created or funded/);});

test('editable plans round-trip without importing transaction data',()=>{const rows=[row('0.1'),row('0.2')];assert.deepEqual(decodePlan(encodePlan(rows)),rows);const file=JSON.parse(encodePlan(rows));file.secret='ignored';assert.deepEqual(decodePlan(JSON.stringify(file)),rows);});
test('approval files, wrong networks, malformed and oversized plans are rejected',()=>{for(const value of ['{}','not json','x'.repeat(96001),JSON.stringify({format:'accord-project-plan',version:1,network:'mainnet',stages:[row('1')]})])assert.throws(()=>decodePlan(value));});
test('unfinished drafts survive storage but cannot masquerade as ready plans',()=>{const draft=[{title:'Work in progress',terms:'',amount:''}];assert.deepEqual(cleanPlanDraft(draft),draft);assert.deepEqual(decodePlan(encodePlan(draft)),draft);assert.throws(()=>validatePlan(draft));assert.throws(()=>cleanPlanDraft([{...row('1'),terms:'x'.repeat(2001)}]));});
test('wallet and contract scopes have different storage keys; guests do not persist',()=>{assert.equal(planDraftKey(''),null);assert.notEqual(planDraftKey('contract:client'),planDraftKey('contract:freelancer'));assert.notEqual(planDraftKey('contract:client'),planDraftKey('other:client'));});

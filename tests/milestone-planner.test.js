import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan,stageUnits,planText} from '../src/milestone-planner-model.js';
const row=amount=>({title:'Prototype',terms:'Working preview and agreed checks pass.',amount});
test('totals are exact to seven decimal places',()=>{assert.equal(validatePlan([row('0.1'),row('0.2'),row('0.0000001')]).total,'0.3000001');});
test('invalid amounts and unsafe numeric notation are rejected',()=>{for(const n of ['0','-1','NaN','1e3','0.00000001','100000.0000001'])assert.throws(()=>stageUnits(n));});
test('empty stages and excessive plans cannot be exported',()=>{for(const rows of [[],Array(9).fill(row('1')),[{...row('1'),terms:''}]])assert.throws(()=>validatePlan(rows));});
test('export makes planning status explicit',()=>{assert.match(planText(validatePlan([row('1')])),/No agreement has been created or funded/);});

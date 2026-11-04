import test from 'node:test';
import assert from 'node:assert/strict';
import {explorerNextStep} from '../src/explorer-next-step.js';
const base={id:'a',verified:true,participant:true,wallet:'client',buyer:'client',seller:'freelancer'};
test('pending and unverified state cannot suggest a transaction step',()=>{for(const state of [{...base,pending:true,state:'Draft'},{...base,verified:false,state:'Released'},{...base,participant:false,state:'Funded'}])assert.equal(explorerNextStep(state).workspace,true);});
test('normal workflow routes to appropriate workstations',()=>{for(const [state,station] of [['Draft',1],['Funded',2],['Submitted',3]])assert.equal(explorerNextStep({...base,state}).station,station);});
test('guidance distinguishes client and freelancer duties',()=>{assert.equal(explorerNextStep({...base,state:'Draft'}).label,'Fund the milestone');assert.equal(explorerNextStep({...base,wallet:'freelancer',state:'Draft'}).label,'Check milestone funding');});
test('disputes and closed milestones route to their courtyard destinations',()=>{assert.equal(explorerNextStep({...base,state:'Disputed'}).place,'room');for(const state of ['Settled','Released'])assert.equal(explorerNextStep({...base,state}).place,'archive');});
test('empty and unknown agreements have safe navigation defaults',()=>{assert.equal(explorerNextStep().station,0);assert.equal(explorerNextStep({...base,state:'unexpected'}).workspace,true);});

import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBrief,briefExamples} from '../src/brief-builder-model.js';
test('each example generates editable bounded terms without automatic payment promises',()=>{for(const example of Object.values(briefExamples)){const text=buildBrief({...example,date:'2026-12-01',exclusions:'Hosting fees'});assert.match(text,/Hosting fees/);assert.match(text,/not automatic contract timers/);assert.ok(text.length<4000);}});
test('incomplete briefs and invalid revision counts are rejected',()=>{assert.throws(()=>buildBrief({}));for(const revisions of [-1,10,1.5,''])assert.throws(()=>buildBrief({...briefExamples.design,revisions}));});
test('long fields stay within the existing draft storage limit',()=>{assert.ok(buildBrief({deliverables:'a'.repeat(8000),criteria:'b'.repeat(8000),revisions:'9',exclusions:'c'.repeat(8000)}).length<4000);});

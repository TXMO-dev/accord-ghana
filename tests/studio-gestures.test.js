import test from 'node:test';
import assert from 'node:assert/strict';
import {createTapTracker} from '../src/studio-gestures.js';
const p=(id,x,y)=>({pointerId:id,clientX:x,clientY:y});
test('a single intentional tap selects an object',()=>{const g=createTapTracker();g.down(p(1,20,20));assert.equal(g.up(p(1,24,22)),true);});
test('a drag returning to its starting point is not a tap',()=>{const g=createTapTracker();g.down(p(1,20,20));g.move(p(1,60,20));assert.equal(g.up(p(1,20,20)),false);});
test('pinching never selects on either finger release',()=>{const g=createTapTracker();g.down(p(1,20,20));g.down(p(2,40,40));assert.equal(g.up(p(2,40,40)),false);assert.equal(g.up(p(1,20,20)),false);});
test('cancelled gestures cannot select; a subsequent tap still works',()=>{const g=createTapTracker();g.down(p(1,20,20));g.cancel();assert.equal(g.up(p(1,20,20)),false);g.down(p(2,20,20));assert.equal(g.up(p(2,20,20)),true);});

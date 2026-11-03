import test from 'node:test';
import assert from 'node:assert/strict';
import {walkWithCollisions,blocked} from '../src/studio-navigation.js';
test('walking cannot tunnel through a wall even after a long frame',()=>{const walls=[{x:0,z:0,w:4,d:.2}];const p=walkWithCollisions({x:0,z:2},{x:0,z:-5},walls);assert.ok(p.z>.3);assert.equal(blocked(p.x,p.z,walls),false);});
test('diagonal movement slides along an obstacle rather than entering it',()=>{const walls=[{x:0,z:0,w:4,d:.2}];const p=walkWithCollisions({x:0,z:1},{x:1,z:-2},walls);assert.ok(p.x>.9);assert.ok(p.z>.3);});
test('open space and the courtyard entrance remain traversable',()=>{const p=walkWithCollisions({x:0,z:4},{x:0,z:3});assert.equal(p.z.toFixed(2),'7.00');});
test('the agreement desk blocks walking',()=>{const p=walkWithCollisions({x:-3,z:3},{x:0,z:-3});assert.ok(p.z>1.8);});

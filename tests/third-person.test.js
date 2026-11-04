import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movementDelta,nearestInteraction} from '../src/third-person-model.js';
import {walkWithCollisions} from '../src/studio-navigation.js';
test('diagonal movement is no faster than straight movement',()=>{assert.equal(Math.hypot(...Object.values(movementDelta(1,1,0,2))),2);assert.deepEqual(movementDelta(0,0,0,2),{x:0,z:0});});
test('camera-relative movement rotates with viewing direction',()=>{const d=movementDelta(1,0,Math.PI/2,1);assert.ok(Math.abs(d.x+1)<1e-9);assert.ok(Math.abs(d.z)<1e-9);});
test('player cannot walk through the studio back wall',()=>{const p=walkWithCollisions({x:0,z:-4},movementDelta(1,0,0,3));assert.ok(p.z>-5);});
test('interaction only selects a nearby character or workstation',()=>{const a={position:{x:1,z:0}},b={object:{position:{x:.5,z:0}}};assert.equal(nearestInteraction({x:0,z:0},[a,b]),b);assert.equal(nearestInteraction({x:10,z:10},[a,b]),null);});

test('all four diagonal combinations move in the correct direction at equal speed',()=>{
 for(const [f,r,x,z] of [[1,1,1,-1],[1,-1,-1,-1],[-1,-1,-1,1],[-1,1,1,1]]){
  const d=movementDelta(f,r,0,1);assert.equal(Math.sign(d.x),x);assert.equal(Math.sign(d.z),z);assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-9);
 }
});

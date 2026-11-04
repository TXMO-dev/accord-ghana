import test from 'node:test';
import assert from 'node:assert/strict';
import {courtyardPlaces,loungeSeats,gardenTreeSpots,treeClearsPlots} from '../src/courtyard-layout.js';
import {blocked,findStudioPath} from '../src/studio-navigation.js';
import {cyclingLane,createGuideBicycle,createRideState} from '../src/guide-bicycle.js';
import * as THREE from 'three';
test('destination plots are separate with reachable approaches',()=>{
 for(const p of courtyardPlaces){for(const q of courtyardPlaces)if(p!==q)assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>18);assert.ok(findStudioPath({x:0,z:6},{x:p.x,z:p.z-1.5}).length);}
});
test('lounge furniture blocks walking and central seating aisle remains open',()=>{
 const p=courtyardPlaces.find(p=>p.id==='lounge');for(const [x,z] of loungeSeats)assert.equal(blocked(p.x+x,p.z+z),true);for(const z of [1,2,3,4,5])assert.equal(blocked(p.x,p.z+z),false);
});
test('guide cycles on long lanes but dismounts around destinations',()=>{
 assert.equal(cyclingLane({x:0,z:3}),false);assert.equal(cyclingLane({x:-16,z:7}),true);for(const p of courtyardPlaces)assert.equal(cyclingLane(p),false);
 const scene=new THREE.Scene(),bike=createGuideBicycle(scene);bike.update({x:-16,z:7},.5,true,.016);assert.equal(scene.children[0].visible,true);bike.update({x:0,z:0},0,false,.016);assert.equal(scene.children[0].visible,false);bike.dispose();assert.equal(scene.children.length,0);
});

test('tree crowns and gust clearance cannot intersect destination plots',()=>{
 assert.equal(treeClearsPlots(24,5.5),false);
 assert.equal(treeClearsPlots(24,3),false);
 assert.ok(gardenTreeSpots().length>15);
 for(const p of gardenTreeSpots())assert.equal(treeClearsPlots(p.x,p.z),true);
});


test('cycling stays mounted across lane boundaries and eases off near arrival',()=>{
 const ride=createRideState(),goal={x:23,z:26};
 for(let i=0;i<20;i++)ride.update({x:0,z:8},goal,.05);
 assert.equal(ride.update({x:12,z:18.9},goal,.05).amount,1);
 assert.equal(ride.update({x:12,z:19.1},goal,.05).amount,1);
 const arrival=ride.update({x:23,z:25},goal,.05);assert.ok(arrival.amount>0&&arrival.amount<1);
 for(let i=0;i<20;i++)ride.update({x:23,z:25},goal,.05);
 assert.equal(ride.update({x:23,z:25},goal,.05).amount,0);
});

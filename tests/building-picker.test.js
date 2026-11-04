import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBuildingPicker} from '../src/building-picker.js';
import {courtyardPlaces} from '../src/courtyard-layout.js';
test('overview picks each building roof and ignores empty garden',()=>{
 const picker=createBuildingPicker();
 for(const p of [{id:'studio',x:0,z:0},...courtyardPlaces]){
  const ray=new THREE.Raycaster(new THREE.Vector3(p.x,30,p.z),new THREE.Vector3(0,-1,0));assert.equal(picker.pick(ray).id,p.id);
 }
 assert.equal(picker.pick(new THREE.Raycaster(new THREE.Vector3(12,30,20),new THREE.Vector3(0,-1,0))),null);picker.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLandscape,landscapeHeight} from '../src/studio-landscape.js';
test('landscape preserves the central plots and uses bounded instanced scenery',()=>{
 const scene=new THREE.Scene(),land=createLandscape(scene,{compact:true});
 for(const [x,z] of [[0,0],[-28,12],[23,26],[0,35]])assert.equal(landscapeHeight(x,z),-.475);
 for(const t of land.trees)assert.ok(Math.hypot(t.x,t.z-12)>=65);
 for(const h of land.houses)assert.ok(Math.hypot(h.x,h.z-12)>=85);
 assert.ok(land.group.children.length<10);
 const geo=land.group.getObjectByName('Continuous terrain').geometry;
 for(const v of geo.attributes.position.array)assert.ok(Number.isFinite(v));
 assert.ok(geo.parameters.width>2000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPavilionRoof} from '../src/pavilion-roof.js';
test('roof fades between camera and activity and returns when view is clear',()=>{
 const group=new THREE.Group(),meshes=[];
 const box=(w,h,d,x,y,z,mat,parent)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof mat==='string'?new THREE.MeshBasicMaterial():mat);mesh.position.set(x,y,z);parent.add(mesh);meshes.push(mesh);return mesh;};
 const roof=createPavilionRoof(group,box),camera=new THREE.PerspectiveCamera();camera.position.set(0,6,0);
 roof.update(camera,new THREE.Vector3(0,0,0),.05,true);const metal=meshes.find(m=>m.material.isMeshStandardMaterial).material;
 assert.equal(metal.opacity,.16);assert.equal(metal.depthWrite,false);
 camera.position.set(6,2,6);roof.update(camera,new THREE.Vector3(0,1,0),.05,true);assert.equal(metal.opacity,1);assert.equal(metal.depthWrite,true);
 camera.position.set(0,1,0);roof.update(camera,new THREE.Vector3(0,1,4),.05,true);assert.equal(metal.opacity,.16);
 roof.dispose();
});

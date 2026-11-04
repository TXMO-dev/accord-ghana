import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Sprite,PerspectiveCamera,Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from 'three';
import {cameraCollision} from '../src/third-person-camera.js';
test('follow camera ignores floating labels without crashing',()=>{
 const scene=new Scene();scene.add(new Sprite());
 assert.equal(cameraCollision(new PerspectiveCamera())(scene,new Vector3(0,0,3),new Vector3(0,0,-3)),null);
});
test('camera checks walls but excludes player and hidden objects',()=>{
 const scene=new Scene(),actor=new Group();actor.add(new Mesh(new BoxGeometry(),new MeshBasicMaterial()));scene.add(actor);
 const hidden=new Mesh(new BoxGeometry(),new MeshBasicMaterial());hidden.visible=false;scene.add(hidden);
 const collide=cameraCollision(new PerspectiveCamera()),from=new Vector3(0,0,3),to=new Vector3(0,0,-3);
 assert.equal(collide(scene,from,to,actor),null);
 const wall=new Mesh(new BoxGeometry(),new MeshBasicMaterial());scene.add(wall);
 assert.equal(collide(scene,from,to,actor).object,wall);
});

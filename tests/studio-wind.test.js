import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,BoxGeometry,MeshStandardMaterial,ShaderLib} from 'three';
import {createStudioWind} from '../src/studio-wind.js';
test('foliage and shadow shaders share wind timing and reduced-motion state',()=>{
 const wind=createStudioWind(),mesh=new Mesh(new BoxGeometry(),new MeshStandardMaterial());
 wind.sway(mesh);const surface={uniforms:{},vertexShader:ShaderLib.standard.vertexShader},shadow={uniforms:{},vertexShader:ShaderLib.depth.vertexShader};
 mesh.material.onBeforeCompile(surface);mesh.customDepthMaterial.onBeforeCompile(shadow);
 assert.equal(surface.uniforms.accordWindTime,shadow.uniforms.accordWindTime);
 wind.update(3000,false);assert.equal(surface.uniforms.accordWindTime.value,3);assert.equal(shadow.uniforms.accordWindStrength.value,1);
 wind.update(4000,true);assert.equal(surface.uniforms.accordWindStrength.value,0);
 assert.match(surface.vertexShader,/instanceMatrix \* windOrigin/);assert.match(shadow.vertexShader,/windWeight \* windWeight/);
});
test('adding wind does not modify shared trunk material or geometry',()=>{
 const material=new MeshStandardMaterial(),mesh=new Mesh(new BoxGeometry(),material),positions=Array.from(mesh.geometry.attributes.position.array);
 createStudioWind().sway(mesh,{amplitude:.24,base:0,height:2.6});
 assert.notEqual(mesh.material,material);assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),positions);
});

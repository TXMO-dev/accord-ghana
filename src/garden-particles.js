import * as THREE from 'three';
import {courtyardPlaces} from './courtyard-layout.js';
export function createGardenParticles(scene){
 const positions=[];
 // Sparse airborne seeds along the planted edges, away from desks and signs.
 for(const p of courtyardPlaces)for(let i=0;i<28;i++)positions.push(p.x+(i%2?1:-1)*(p.id==='lounge'?8.5:5.5)+Math.sin(i*3.1),.3+(i%9)*.23,p.z-4+(i*1.73)%11);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const material=new THREE.PointsMaterial({color:'#f0dfac',size:.035,transparent:true,opacity:.35,depthWrite:false});
 const time={value:0};material.onBeforeCompile=shader=>{shader.uniforms.gardenTime=time;shader.vertexShader='uniform float gardenTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.x += .35*sin(gardenTime*.28+position.z);
 transformed.y += .15*sin(gardenTime*.6+position.x*2.0);
 transformed.z += .25*cos(gardenTime*.22+position.x);`);shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n if(length(gl_PointCoord-vec2(.5))>.5) discard;');};
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
 return {update(t,reduced){time.value=reduced?0:t/1000;points.visible=!reduced;},dispose(){scene.remove(points);geometry.dispose();material.dispose();}};
}

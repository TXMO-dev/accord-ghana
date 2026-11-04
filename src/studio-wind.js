import * as THREE from 'three';

export function windStrength(seconds){
 const swell=(Math.sin(seconds*.19)+1)*.5;
 const gust=Math.pow((Math.sin(seconds*.53+Math.sin(seconds*.13))+1)*.5,4);
 return .28+.28*swell+.9*gust;
}

// One wind field moves all planting together; local variation keeps leaves organic.
export function createStudioWind(){
 const time={value:0},strength={value:0};
 function sway(mesh,{amplitude=.12,base=0,height=2,flutter=.08}={}){
  const patch=material=>{
   material.onBeforeCompile=shader=>{
    shader.uniforms.accordWindTime=time;shader.uniforms.accordWindStrength=strength;
    shader.vertexShader='uniform float accordWindTime;\nuniform float accordWindStrength;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     vec4 windOrigin = vec4(0.0,0.0,0.0,1.0);
     #ifdef USE_INSTANCING
      windOrigin = instanceMatrix * windOrigin;
     #endif
     windOrigin = modelMatrix * windOrigin;
     float windPhase = windOrigin.x * 0.17 + windOrigin.z * 0.11;
     float windGust = 0.55 + 0.25 * sin(accordWindTime * 0.48 - windPhase);
     float windWave = sin(accordWindTime * 1.15 - windPhase) * windGust + 0.2 * sin(accordWindTime * 2.7 + windPhase * 1.7 + position.y);
     float windWeight = smoothstep(${base.toFixed(4)},${(base+height).toFixed(4)},position.y);
     float windBend = windWeight * windWeight * ${amplitude.toFixed(4)} * accordWindStrength;
     transformed.x += windBend * (0.45 + windWave);
     float flutterWave = sin(accordWindTime * 4.3 + position.x * 9.0 + position.z * 7.0 - windPhase);
     transformed.y += windBend * ${flutter.toFixed(4)} * flutterWave;
     transformed.z += windBend * (0.2 + 0.45 * sin(accordWindTime * 0.9 - windPhase));
    `);
   };
   material.customProgramCacheKey=()=>`accord-wind:${amplitude}:${base}:${height}:${flutter}`;
   material.needsUpdate=true;
  };
  mesh.material=mesh.material.clone();patch(mesh.material);
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:mesh.material.side});patch(mesh.customDepthMaterial);
  // The displacement stays small; avoid clipping at an undeformed bound.
  mesh.frustumCulled=false;
 }
 return {sway,update(t,reduced){time.value=t/1000;strength.value=reduced?0:windStrength(t/1000);}};
}

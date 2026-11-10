import * as THREE from 'three';

// Small shared procedural textures: no downloads and no per-frame texture work.
export function surfaceTexture(kind,repeat=1){
 const size=128,data=new Uint8Array(size*size*4);let seed=173;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=seed*16807%2147483647;const noise=(seed%100)/100;
  const grain=Math.sin(x*.52+Math.sin(y*.055)*2)+.4*Math.sin(x*1.8+y*.014);
  const value=kind==='timber'?202+grain*13+noise*17:218+noise*30;
  const i=(y*size+x)*4;data.set([value,value,value,255],i);
 }
 const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(repeat,repeat);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

export function dressStudioSurfaces(materials){
 const timber=surfaceTexture('timber',2),plaster=surfaceTexture('plaster',4);
 for(const name of ['wood','floor']){materials[name].map=timber;materials[name].bumpMap=timber;materials[name].bumpScale=.018;}
 materials.plaster.map=plaster;materials.plaster.bumpMap=plaster;materials.plaster.bumpScale=.025;
 return ()=>{timber.dispose();plaster.dispose();};
}

export function createNeighbourhoodSky(scene){
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  uniforms:{zenith:{value:new THREE.Color('#719da9')},horizon:{value:new THREE.Color('#e7dfc9')}},
  vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform vec3 zenith; uniform vec3 horizon; varying vec3 vDirection;
   void main(){vec3 direction=normalize(vDirection);float height=pow(max(direction.y,0.0),.55);
    vec3 colour=mix(horizon,zenith,height);float glow=pow(max(dot(direction,normalize(vec3(-.55,.5,.65))),0.0),22.0);
    gl_FragColor=vec4(colour+vec3(.16,.10,.035)*glow,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1000,24,12),material);sky.name='Soft coastal daylight';sky.frustumCulled=false;scene.add(sky);
 scene.fog=new THREE.Fog('#d3d9c9',180,800);
 return sky;
}

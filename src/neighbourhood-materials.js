import * as THREE from 'three';
export function neighbourhoodMaterials(){
 const data=new Uint8Array(128*128*4);let seed=81;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){seed=(seed*16807)%2147483647;const grout=x%32<1||y%32<1,n=grout?125:205+(seed%22);const i=(y*128+x)*4;data.set([n,n-8,n-22,255],i);}
 const stone=new THREE.DataTexture(data,128,128);stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.repeat.set(3,3);stone.colorSpace=THREE.SRGBColorSpace;stone.needsUpdate=true;
 return {tile:new THREE.MeshStandardMaterial({map:stone,roughness:.87,bumpMap:stone,bumpScale:.025}),wall:new THREE.MeshStandardMaterial({color:'#c9bda4',map:stone,roughness:.92,bumpMap:stone,bumpScale:.04}),metal:new THREE.MeshStandardMaterial({color:'#355b50',metalness:.65,roughness:.4}),glass:new THREE.MeshPhysicalMaterial({color:'#bbdbce',transparent:true,opacity:.22,roughness:.15,depthWrite:false}),lamp:new THREE.MeshStandardMaterial({color:'#fff0c1',emissive:'#ffcc77',emissiveIntensity:.65}),dispose(){stone.dispose();for(const v of Object.values(this))if(v?.isMaterial)v.dispose();}};
}

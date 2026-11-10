import {surfaceTexture} from './studio-surface.js';
import * as THREE from 'three';
export function neighbourhoodMaterials(){
 const plaster=surfaceTexture('plaster',3);
 const data=new Uint8Array(128*128*4);let seed=81;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){seed=(seed*16807)%2147483647;const grout=x%32<1||y%32<1,n=grout?125:205+(seed%22);const i=(y*128+x)*4;data.set([n,n-8,n-22,255],i);}
 const stone=new THREE.DataTexture(data,128,128);stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.repeat.set(3,3);stone.colorSpace=THREE.SRGBColorSpace;stone.needsUpdate=true;
 const weaveData=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const stripe=Math.floor(x/8)%3,thread=(x+y)%2?12:0,diamond=Math.abs(x%16-8)+Math.abs(y%16-8)<5;const palette=diamond?[185,142,69]:[[27,68,53],[202,183,128],[89,109,66]][stripe];weaveData.set([...palette.map(v=>v+thread),255],(y*64+x)*4);}
 const weave=new THREE.DataTexture(weaveData,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(2,3);weave.colorSpace=THREE.SRGBColorSpace;weave.needsUpdate=true;
 return {textile:new THREE.MeshStandardMaterial({map:weave,bumpMap:weave,bumpScale:.015,roughness:1}),woven:new THREE.MeshStandardMaterial({color:'#c1a175',map:weave,roughness:1,side:THREE.DoubleSide}),leaf:new THREE.MeshStandardMaterial({color:'#5a8147',roughness:.9}),tile:new THREE.MeshStandardMaterial({map:stone,roughness:.87,bumpMap:stone,bumpScale:.025}),wall:new THREE.MeshStandardMaterial({color:'#d7c5a5',map:plaster,roughness:.92,bumpMap:plaster,bumpScale:.025}),metal:new THREE.MeshStandardMaterial({color:'#355b50',metalness:.65,roughness:.4}),glass:new THREE.MeshPhysicalMaterial({color:'#bbdbce',transparent:true,opacity:.22,roughness:.15,depthWrite:false}),lamp:new THREE.MeshStandardMaterial({color:'#fff0c1',emissive:'#ffcc77',emissiveIntensity:.65}),dispose(){stone.dispose();weave.dispose();plaster.dispose();for(const v of Object.values(this))if(v?.isMaterial)v.dispose();}};
}

import * as THREE from 'three';
import {clothingPalettes} from './clothing-palette.js';
export function clothingTexture(style,region){
 if(style==='plain')return null;
 const colors=(clothingPalettes[region]||clothingPalettes.Ashanti).map(hex=>{const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];});
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const stripe=Math.floor(x/16);let index;
  if(style==='striped-smock')index=x%16<3?1:x%16<5?2:0;
  else{index=(stripe+Math.floor(y/24))%3;if(x%16<2||y%24<2)index=1;if((Math.floor(x/4)+Math.floor(y/4))%2===0&&y%24>9&&y%24<17)index=2;}
  const grain=(x+y)%2===0?.93:1,offset=(y*size+x)*4;for(let c=0;c<3;c++)data[offset+c]=Math.round(colors[index][c]*grain);data[offset+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

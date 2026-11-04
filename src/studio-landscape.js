import * as THREE from 'three';

// Distant scenery shares a continuous ground surface; usable stations stay central.
export function landscapeHeight(x,z){
 const distance=Math.hypot(x,z-12);
 const blend=THREE.MathUtils.smoothstep(distance,75,190);
 return -.475+blend*(3+9*Math.sin(x*.013)*Math.cos(z*.011)+5*Math.sin((x+z)*.008));
}
export function createLandscape(scene,{compact=false}={}){
 const group=new THREE.Group();group.name='Accord surrounding landscape';scene.add(group);
 let seed=7919;const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
 const groundGeo=new THREE.PlaneGeometry(2600,2600,128,128);groundGeo.rotateX(-Math.PI/2);
 const positions=groundGeo.attributes.position,colors=[];
 const low=new THREE.Color('#788955'),high=new THREE.Color('#9c9c69'),color=new THREE.Color();
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),height=landscapeHeight(x,z);
  positions.setY(i,height);
  const variation=.42+.18*Math.sin(x*.04)*Math.cos(z*.037)+random()*.12;
  color.copy(low).lerp(high,variation);colors.push(color.r,color.g,color.b);
 }
 groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
 const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
 ground.name='Continuous terrain';ground.receiveShadow=true;group.add(ground);
 const dummy=new THREE.Object3D();
 function instances(name,geometry,material,count,place){
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;
  for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);place(dummy,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);return mesh;
 }
 const trees=[];
 for(let i=0;i<(compact?260:520);i++){
  const angle=random()*Math.PI*2,radius=i%3===0?65+random()*75:95+Math.pow(random(),.7)*420;
  const x=Math.cos(angle)*radius,z=12+Math.sin(angle)*radius;
  // Leave a clear strip beside the two distant approach roads.
  if(Math.abs(x-74)<9||Math.abs(z+65)<8)continue;
  trees.push({x,z,h:3+random()*5,width:1.6+random()*2.3});
 }
 const bark=new THREE.MeshStandardMaterial({color:'#706047',roughness:1});
 const leaf=new THREE.MeshStandardMaterial({color:'#436546',roughness:1});
 instances('Distant tree trunks',new THREE.CylinderGeometry(.14,.23,1,5),bark,trees.length,(o,i)=>{const t=trees[i];o.position.set(t.x,landscapeHeight(t.x,t.z)+t.h/2,t.z);o.scale.y=t.h;});
 const crowns=instances('Distant tree canopy',new THREE.IcosahedronGeometry(1,1),leaf,trees.length,(o,i)=>{const t=trees[i];o.position.set(t.x,landscapeHeight(t.x,t.z)+t.h,t.z);o.scale.set(t.width,t.width*.8,t.width);});
 for(let i=0;i<trees.length;i++){color.setHSL(.24+random()*.08,.2+random()*.16,.22+random()*.12);crowns.setColorAt(i,color);}crowns.instanceColor.needsUpdate=true;
 const houses=[];
 for(let i=0;i<64;i++){
  const side=i%2?-1:1,x=74+side*(18+random()*19),z=-190+i*6.8;
  if(Math.hypot(x,z-12)<85)continue;
  houses.push({x,z,h:2+random()*4,w:4+random()*4,d:4+random()*5});
 }
 instances('Neighbouring homes',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#bba788',roughness:1}),houses.length,(o,i)=>{const h=houses[i];o.position.set(h.x,landscapeHeight(h.x,h.z)+h.h/2,h.z);o.scale.set(h.w,h.h,h.d);});
 instances('Neighbouring roofs',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#815a40',roughness:1}),houses.length,(o,i)=>{const h=houses[i];o.position.set(h.x,landscapeHeight(h.x,h.z)+h.h+.12,h.z);o.scale.set(h.w+.6,.24,h.d+.6);});
 // Sample the terrain so road ribbons follow the landscape rather than float.
 function road(axis,fixed,start,end){
  const vertices=[],indices=[],segments=100,width=3;
  for(let i=0;i<=segments;i++){const along=start+(end-start)*i/segments;for(const side of [-1,1]){const x=axis==='z'?fixed+side*width:along,z=axis==='z'?along:fixed+side*width;vertices.push(x,landscapeHeight(x,z)+.06,z);}if(i<segments){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#ad9674',roughness:1,side:THREE.DoubleSide})));
 }
 road('z',74,-390,440);road('x',-65,-440,420);
 return {group,trees,houses};
}

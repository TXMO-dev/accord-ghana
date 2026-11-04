import * as THREE from 'three';

// Mounted details and flush textiles keep the central working aisle unobstructed.
export function decorateDestination({group,box,place,materials}){
 const cafe=place.id==='lounge',rear=cafe?-4.48:-2.38;
 const ceramic=new THREE.MeshStandardMaterial({color:'#b56b48',roughness:.8});
 const pottery=(x,y,z,size=.18)=>{
  const vase=new THREE.Mesh(new THREE.CylinderGeometry(size*.65,size,size*1.8,12),ceramic);
  vase.position.set(x,y+size*.9,z);group.add(vase);
  for(let i=0;i<3;i++){box(.018,.34,.018,x+(i-1)*.07,y+size*1.8+.12,z,'green',group);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.1,6,4),materials.leaf);leaf.scale.set(.6,.25,1.4);leaf.position.set(x+(i-1)*.09,y+size*1.8+.23,z);leaf.rotation.z=i;group.add(leaf);}
 };
 // Woven runner with a restrained Ghanaian textile-inspired geometry.
 box(cafe?1.5:1.3,.012,cafe?5.8:2,0,cafe?.005:.004,cafe?2:1.7,materials.textile,group);
 for(const x of cafe?[-3,3]:[-2.5,2.5]){
  box(.035,.4,.035,x,2.5,cafe?-1.7:.7,materials.metal,group);
  const shade=new THREE.Mesh(new THREE.ConeGeometry(.24,.22,12,1,true),materials.woven);shade.position.set(x,2.23,cafe?-1.7:.7);group.add(shade);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),materials.lamp);bulb.position.set(x,2.17,cafe?-1.7:.7);group.add(bulb);
 }
 // Framed abstract local craft panels, not oversized labels across the entrance.
 for(const side of [-1,1]){
  const x=side*(cafe?5:3.55);
  box(.58,1.2,.09,x,1.65,rear,'wood',group);
  box(.46,1.08,.025,x,1.65,rear+.06,materials.textile,group);
 }
 if(place.id==='room'){
  box(2.4,.08,.4,0,.65,rear,'wood',group);
  pottery(-.9,.7,rear,.13);
  for(let i=0;i<6;i++)box(.13,.25+i%2*.08,.22,-.4+i*.19,.83,rear,i%2?'gold':'green',group);
  for(const side of [-1,1]){box(.46,.12,.48,side*2.8,.73,-.4,materials.textile,group);box(.38,.12,.48,side*2.8,.73,.6,materials.woven,group);}
 }else if(place.id==='review'){
  // Samples below the existing review boards: paper, colour swatches and models.
  for(const x of [-2.2,2.2]){
   box(1.8,.09,.42,x,.85,rear,'wood',group);
   for(let i=0;i<4;i++)box(.25,.025,.22,x-.55+i*.35,.92,rear,i%2?'paper':'gold',group);
   pottery(x+.58,.92,rear,.12);
  }
  box(.7,.025,.36,.5,.98,0,materials.textile,group);
 }else if(place.id==='archive'){
  // Brass labels and file spines make the existing shelves read as an archive.
  for(const x of [-2.8,2.8])for(const y of [.6,1.3,2]){
   box(.5,.1,.025,x,y,-2.21,'gold',group);
   for(let i=0;i<4;i++)box(.1,.025,.025,x-.45+i*.3,y+.28,-2.29,'green',group);
  }
  box(1.1,.9,.08,0,1.65,rear,'wood',group);box(.93,.74,.02,0,1.65,rear+.06,'paper',group);
  for(let i=0;i<5;i++)box(.64-i*.07,.025,.025,0,1.85-i*.1,rear+.08,'gold',group);
  pottery(.75,.95,0,.13);
 }else{
  for(const [x,z] of [[-3,1],[3,1],[-3,4],[3,4]]){
   box(.85,.012,.52,x,.81,z,materials.textile,group);pottery(x+.35,.82,z-.1,.065);
   box(.22,.018,.3,x-.3,.825,z,'paper',group);
  }
  // Menu board and serving details sit on the back wall and cabinet.
  box(1.3,.9,.08,.4,1.9,-4.55,'wood',group);box(1.16,.76,.025,.4,1.9,-4.49,'green',group);
  for(let i=0;i<5;i++)box(.8-i*.08,.025,.025,.4,2.15-i*.12,-4.47,'paper',group);
  pottery(4,.88,-3.8,.17);
 }
}

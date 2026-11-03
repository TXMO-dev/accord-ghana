import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export function dressStudio({scene,renderer,materials,box,cylinder,sphere,desk,delivery,register,notify}){
 const resources=[];
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');let seed=47;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};ctx.fillStyle=kind==='wood'?'#ad916f':'#c3b8a2';ctx.fillRect(0,0,256,256);for(let i=0;i<4000;i++){const n=80+Math.floor(random()*110);ctx.fillStyle=`rgba(${n},${n},${n},.12)`;const x=random()*256,y=random()*256;ctx.fillRect(x,y,kind==='wood'?1:2,kind==='wood'?10+random()*70:2);}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='wood'?3:2,kind==='wood'?1:2);t.colorSpace=THREE.SRGBColorSpace;resources.push(t);return t;}
 const grain=texture('wood'),plaster=texture('plaster');materials.wood.map=grain;materials.wood.bumpMap=grain;materials.wood.bumpScale=.035;materials.floor.map=grain;materials.plaster.map=plaster;materials.plaster.bumpMap=plaster;materials.plaster.bumpScale=.025;
 const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(room,.06);scene.environment=env.texture;scene.environmentIntensity=.35;room.dispose();pmrem.dispose();resources.push(env);
 const stone=new THREE.MeshStandardMaterial({color:'#a6a18d',roughness:.95,map:plaster});const clay=new THREE.MeshStandardMaterial({color:'#a85d3e',roughness:.9});const foliage=new THREE.MeshStandardMaterial({color:'#375a35',roughness:.85,side:THREE.DoubleSide});const glass=new THREE.MeshPhysicalMaterial({color:'#acc8b9',metalness:.1,roughness:.15,transparent:true,opacity:.28});
 box(70,.15,70,0,-.55,0,stone);box(17,.25,14,0,-.4,0,clay);
 // Shaded courtyard and a paved approach outside the open studio.
 for(let x=-8;x<=8;x+=2)for(let z=6;z<=12;z+=2)box(1.91,.06,1.91,x,-.21,z,stone);
 for(let i=0;i<3;i++)box(4.5,.12,1.2,0,-.25-i*.09,5.5+i*.8,'plaster');
 function palm(x,z,h){const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.25,h,10),materials.wood);trunk.position.set(x,h/2-.3,z);trunk.castShadow=true;scene.add(trunk);for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.55,1.2,0,2.6);shape.quadraticCurveTo(-.55,1.2,0,0);const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape,8),foliage);leaf.position.set(x,h-.3,z);leaf.rotation.set(-.85,a,0);leaf.rotateZ(a);leaf.castShadow=true;scene.add(leaf);}}
 palm(-8,4,4.8);palm(8,-4,5.8);palm(11,9,4.6);palm(-10,-7,5.4);
 for(const x of [-8,8]){box(.22,3.5,.22,x,1.4,-5,'wood');box(.22,3.5,.22,x,1.4,4,'wood');}for(let z=-5;z<5;z+=.8){box(1.4,.12,.15,-7.3,3.1,z,'wood');box(1.4,.12,.15,7.3,3.1,z,'wood');}
 // Distant buildings are atmosphere, not a claim of an exact Ghanaian address.
 for(let i=0;i<7;i++){const h=2+(i%3)*1.3,x=-18+i*6;box(4,h,3,x,h/2-.4,-15,i%2?'plaster':clay);box(4.3,.15,3.3,x,h-.35,-15,'wood');for(let j=0;j<3;j++)box(.55,.7,.04,x-1.2+j*1.2,h*.6,-13.47,glass);}
 // Fabric rug, lounge, shelving, desk tools and display details.
 box(3.1,.02,2.1,-2,.03,1.4,'paper');for(let i=0;i<13;i++)box(.08,.012,2.1,-3.4+i*.23,.047,1.4,i%3===0?'gold':'green');
 box(2,.32,.8,3.6,.28,3.8,'wood');box(2,.24,.75,3.6,.55,3.8,'paper');box(2,.65,.16,3.6,.77,4.12,'green');for(const x of [2.9,4.3]){const cushion=sphere(.3,x,.77,3.8,'gold');cushion.scale.set(1,.5,.8);}
 for(const y of [1,1.7,2.4]){box(.7,.08,2.8,-6,y,-1,'wood');for(let i=0;i<7;i++)box(.36,.35,.12,-5.9,y+.22,-2.1+i*.3,i%2?'paper':'green');}
 function mug(x,y,z,parent){const m=cylinder(.085,.15,x,y,z,'paper',parent);const handle=new THREE.Mesh(new THREE.TorusGeometry(.055,.015,8,16),materials.gold);handle.position.set(x+.09,y,z);parent.add(handle);return m;}
 mug(-.85,1.15,-.2,desk);mug(.8,1.16,.25,delivery);
 for(let i=0;i<3;i++)box(.45,.035,.3,.2+i*.02,1.12+i*.04,.25,i%2?'green':'gold',desk);
 box(.5,.03,.28,.6,1.1,.2,'green',desk);for(let row=0;row<3;row++)for(let col=0;col<7;col++)box(.045,.006,.045,-.27+col*.09,1.123,.19+row*.08,'green',delivery);
 // Desk lamp is an intentional, harmless environmental interaction.
 const lamp=new THREE.Group();lamp.position.set(-1,1.08,-.4);desk.add(lamp);cylinder(.16,.03,0,.015,0,'gold',lamp);cylinder(.025,.6,0,.32,0,'gold',lamp);const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.27,24,1,true),materials.green);shade.position.set(0,.65,0);shade.rotation.z=.2;lamp.add(shade);const light=new THREE.PointLight('#ffcf89',0,5,2);light.position.set(-.05,.51,.02);lamp.add(light);let lampOn=false;const toggleLamp=()=>{lampOn=!lampOn;light.intensity=lampOn?3:0;notify(lampOn?'Desk lamp on. A little warmth for your next agreement.':'Desk lamp off.');};register(lamp,'Desk lamp',toggleLamp);
 const board=new THREE.Group();board.position.set(-6.31,2,2.6);board.rotation.y=Math.PI/2;scene.add(board);box(1.65,1.05,.08,0,0,0,'wood',board);for(let i=0;i<4;i++)box(.3,.5,.02,-.58+i*.38,0,.06,i%2?'gold':'paper',board);register(board,'Studio notes',()=>notify('Agree → Fund → Deliver → Release. These four stages are the same for every milestone.'));
 return {toggleLamp,dispose(){for(const r of resources)r.dispose();}};
}

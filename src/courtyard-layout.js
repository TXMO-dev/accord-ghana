export const courtyardPlaces=[
 {id:'room',title:'PROJECT PAVILION',caption:'Talk with your project partner',x:23,z:8},
 {id:'review',title:'REVIEW TERRACE',caption:'Delivery, feedback and revisions',x:0,z:28},
 {id:'lounge',title:'ACCORD LOUNGE',caption:'Meet people. Find your next collaboration.',x:-23,z:16},
 {id:'archive',title:'RECEIPT GALLERY',caption:'Keep the record of your work',x:23,z:28}
];
export const loungeSeats=[[-3,1],[3,1],[-3,4],[3,4]];
export const courtyardObstacles=courtyardPlaces.flatMap(p=>p.id==='lounge'?[
 {x:p.x,z:p.z,w:2.1,d:.84},
 {x:p.x,z:p.z-4.8,w:12,d:.2},
 ...[-5.8,5.8].flatMap(dx=>[-4.4,4.4].map(dz=>({x:p.x+dx,z:p.z+dz,w:.2,d:.2}))),
 ...loungeSeats.flatMap(([x,z])=>[{x:p.x+x,z:p.z+z,w:1.2,d:.8},...[-1,1].map(side=>({x:p.x+x+side*.95,z:p.z+z,w:.5,d:.55}))])
]:[
 {x:p.x,z:p.z,w:2.1,d:.84},
 {x:p.x,z:p.z-2.8,w:8,d:.2},
 ...[-3.9,3.9].flatMap(dx=>[-2.5,2.5].map(dz=>({x:p.x+dx,z:p.z+dz,w:.18,d:.18}))),
 ...(p.id==='room'?[-1,1].map(side=>({x:p.x+side*2.8,z:p.z+.2,w:.8,d:2})):[])
]);

// Raised planters are solid; openings between them preserve the approaches.
for(const p of courtyardPlaces){const w=p.id==='lounge'?16:10;for(const side of [-1,1])for(const z of [-2,2,5])courtyardObstacles.push({x:p.x+side*(w/2-.45),z:p.z+z,w:.6,d:1.2});}

for(const p of courtyardPlaces){const w=p.id==='lounge'?16:10;for(const side of [-1,1])courtyardObstacles.push({x:p.x+side*(w/2-1.3),z:p.z+6,w:1.5,d:.5});}

// Include crown radius and gust displacement, not only the trunk position.
export function treeClearsPlots(x,z,radius=2.4){
 return courtyardPlaces.every(p=>{
  const halfWidth=p.id==='lounge'?8:5,halfDepth=p.id==='lounge'?7:4;
  const dx=Math.max(Math.abs(x-p.x)-halfWidth,0);
  const dz=Math.max(Math.abs(z-(p.z+1))-halfDepth,0);
  return Math.hypot(dx,dz)>radius;
 });
}
export function gardenTreeSpots(){
 const candidates=[];
 for(let x=-18;x<=18;x+=3)candidates.push({x,z:-19-Math.abs(x)%2});
 for(const x of [-24,24])for(let z=-12;z<=6;z+=3.5)candidates.push({x,z});
 return candidates.filter(p=>treeClearsPlots(p.x,p.z));
}

// Rear display shelves and café cabinet are physical fixtures.
for(const p of courtyardPlaces){
 if(p.id==='lounge')courtyardObstacles.push({x:p.x+3,z:p.z-3.8,w:2.7,d:.8},{x:p.x-3.5,z:p.z-4.6,w:3.8,d:.15});
 else courtyardObstacles.push({x:p.x,z:p.z-2.42,w:7.5,d:.55});
}

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
 ...[-1.65,1.65].flatMap(dx=>[-.9,.9].map(dz=>({x:p.x+dx,z:p.z+dz,w:.16,d:.16})))
]);

// Raised planters are solid; openings between them preserve the approaches.
for(const p of courtyardPlaces){const w=p.id==='lounge'?16:10;for(const side of [-1,1])for(const z of [-2,2,5])courtyardObstacles.push({x:p.x+side*(w/2-.45),z:p.z+z,w:.6,d:1.2});}

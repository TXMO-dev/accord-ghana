export const courtyardPlaces=[
 {id:'room',title:'PROJECT PAVILION',caption:'Talk with your project partner',x:-9,z:8},
 {id:'review',title:'REVIEW TERRACE',caption:'Delivery, feedback and revisions',x:0,z:14},
 {id:'archive',title:'RECEIPT GALLERY',caption:'Keep the record of your work',x:9,z:8}
];
export const courtyardObstacles=courtyardPlaces.flatMap(p=>[
 {x:p.x,z:p.z,w:2.1,d:.7},
 ...(p.id==='room'?[-1.65,1.65].map(dx=>({x:p.x+dx,z:p.z-.9,w:.16,d:.16})):[])
]);

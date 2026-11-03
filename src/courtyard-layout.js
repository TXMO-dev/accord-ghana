export const courtyardPlaces=[
 {id:'room',title:'PROJECT PAVILION',caption:'Talk with your project partner',x:-6,z:8.5},
 {id:'review',title:'REVIEW TERRACE',caption:'Delivery, feedback and revisions',x:0,z:10},
 {id:'archive',title:'RECEIPT GALLERY',caption:'Keep the record of your work',x:6,z:8.5}
];
export const courtyardObstacles=courtyardPlaces.flatMap(p=>[
 {x:p.x,z:p.z,w:2.1,d:.7},
 ...[-1.65,1.65].flatMap(dx=>[-.9,.9].map(dz=>({x:p.x+dx,z:p.z+dz,w:.16,d:.16})))
]);

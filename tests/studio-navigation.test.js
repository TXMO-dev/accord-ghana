import test from 'node:test';
import assert from 'node:assert/strict';
import {walkWithCollisions,blocked,findStudioPath} from '../src/studio-navigation.js';
test('walking cannot tunnel through a wall even after a long frame',()=>{const walls=[{x:0,z:0,w:4,d:.2}];const p=walkWithCollisions({x:0,z:2},{x:0,z:-5},walls);assert.ok(p.z>.3);assert.equal(blocked(p.x,p.z,walls),false);});
test('diagonal movement slides along an obstacle rather than entering it',()=>{const walls=[{x:0,z:0,w:4,d:.2}];const p=walkWithCollisions({x:0,z:1},{x:1,z:-2},walls);assert.ok(p.x>.9);assert.ok(p.z>.3);});
test('open space and the courtyard entrance remain traversable',()=>{const p=walkWithCollisions({x:0,z:4},{x:0,z:3});assert.equal(p.z.toFixed(2),'7.00');});
test('the agreement desk blocks walking',()=>{const p=walkWithCollisions({x:-3,z:3},{x:0,z:-3});assert.ok(p.z>1.8);});

test('Kobi reaches every stop and returns without crossing furniture',()=>{
 let position={x:.1,z:2.9};
 for(const goal of [{x:-2,z:2.1},{x:-2,z:-1.4},{x:2.5,z:-1.2},{x:1,z:2.8},{x:.1,z:2.9}]){
 const path=findStudioPath(position,goal);assert.ok(path.length,'destination must be reachable');
 for(const point of path){const end=walkWithCollisions(position,{x:point.x-position.x,z:point.z-position.z});assert.ok(Math.hypot(end.x-point.x,end.z-point.z)<.001);position=end;}
 assert.ok(Math.hypot(position.x-goal.x,position.z-goal.z)<.001);
 }
});
test('Kobi refuses a destination inside furniture',()=>assert.deepEqual(findStudioPath({x:0,z:3},{x:-3,z:1}),[]));

import {workstationIntent} from '../src/workstation-flow.js';
test('workstations route by verified role and state, and never bypass pending transactions',()=>{
 const client={wallet:'client',role:'client',state:'Draft',verified:true};
 assert.equal(workstationIntent(1,client).action,'fund');
 assert.equal(workstationIntent(1,{...client,role:'freelancer'}).action,undefined);
 assert.equal(workstationIntent(1,{...client,pending:true}).action,undefined);
 assert.equal(workstationIntent(2,{...client,role:'freelancer',state:'Funded'}).target,'studio-proof');
 assert.equal(workstationIntent(3,{...client,state:'Submitted'}).target,'studio-verify-text');
 assert.equal(workstationIntent(3,{...client,state:'Disputed'}).target,'settlement-panel');
 assert.equal(workstationIntent(0,{}).target,'studio-connect');
 assert.equal(workstationIntent(1,{...client,verified:false}).target,'studio-refresh');
});
import {avatarHome,greetingPath,advanceAvatar} from '../src/avatar-motion.js';
test('participant greetings approach each workstation without crossing furniture',()=>{
 const positions=[[-3,0,1],[-3,0,-2.5],[2.5,0,-2.4],[3,0,1.6]];
 for(const start of positions)for(const end of positions){const p=avatarHome(start,true),partner=avatarHome(end,false);assert.equal(blocked(p.x,p.z),false);const path=greetingPath(p,partner);assert.ok(path.length);let n=0;while(advanceAvatar(p,path,.05)&&n++<1000)assert.equal(blocked(p.x,p.z),false);assert.ok(n<1000);assert.ok(Math.hypot(p.x-partner.x,p.z-partner.z)<1);}
});

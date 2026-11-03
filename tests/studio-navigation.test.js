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

import {createAvatar} from '../src/avatar-character.js';
test('avatar bow pivots the upper body while feet stay planted, and walking articulates legs',()=>{
 const avatar=createAvatar({hair:'bun'});try{avatar.update(1000);avatar.react('thanks');avatar.update(2600);const upper=avatar.group.getObjectByName('upper-body'),leg=avatar.group.getObjectByName('left-leg');assert.ok(upper.rotation.x>.25);assert.equal(leg.rotation.x,0);assert.equal(avatar.group.position.y,0);avatar.walk(2700,true);assert.ok(Math.abs(leg.rotation.x)>.01);avatar.update(5000);assert.equal(upper.rotation.x,0);avatar.react('release');avatar.update(5100,true);assert.equal(avatar.group.position.y,0);}finally{avatar.dispose();}
});

test('review handoff displays a document only during the gesture and respects reduced motion',()=>{
 const avatar=createAvatar({});try{
  avatar.update(1000);avatar.react('submit');avatar.update(1100);
  const document=avatar.group.getObjectByName('delivery-document');assert.equal(document.visible,true);
  avatar.update(1200,true);assert.equal(document.visible,false);
  avatar.update(5000);assert.equal(document.visible,false);
  avatar.react('revision');avatar.update(5100);assert.equal(document.visible,true);
  avatar.react('receive');avatar.update(5200);assert.equal(document.visible,false);
  avatar.react('review');avatar.update(5300);assert.equal(document.visible,false);
 }finally{avatar.dispose();}
});

import {participantObstacles,returnPath} from '../src/avatar-motion.js';
test('handoff approach and return keep clear of the other participant',()=>{
 const partner={x:0,z:6},p={x:-2,z:6},home={x:2,z:6};
 for(const path of [greetingPath(p,partner),returnPath(p,home,partner)]){
  assert.ok(path.length);let frames=0;
  while(advanceAvatar(p,path,.05,partner)&&frames++<2000){assert.equal(blocked(p.x,p.z,participantObstacles(partner)),false);}
  assert.ok(frames<2000);
 }
 assert.ok(Math.hypot(p.x-home.x,p.z-home.z)<.08);
});

test('station journeys advance smoothly and end at each reachable workstation',()=>{
 const stations=[[-3,0,1],[-3,0,-2.5],[2.5,0,-2.4],[3,0,1.6]];
 for(const role of [false,true])for(const origin of stations)for(const target of stations){
  const position=avatarHome(origin,role),home=avatarHome(target,role),path=returnPath(position,home);
  assert.ok(path.length);let frames=0;
  while(path.length&&frames++<2000){const before={...position};advanceAvatar(position,path,.05);assert.ok(Math.hypot(position.x-before.x,position.z-before.z)<=.063);assert.equal(blocked(position.x,position.z),false);}
  assert.ok(frames<2000);assert.ok(Math.hypot(position.x-home.x,position.z-home.z)<.08);
 }
});

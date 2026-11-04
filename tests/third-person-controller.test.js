import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,PerspectiveCamera} from 'three';
import {createThirdPerson} from '../src/studio-third-person.js';
import {createAvatar} from '../src/avatar-character.js';

class Element extends EventTarget{
 constructor(){super();this.children=[];this.classList={add(){},remove(){}};this.dataset={};this.open=false;}
 append(...children){this.children.push(...children);}
 insertBefore(child){this.children.push(child);}
 setAttribute(){} focus(){} remove(){} replaceChildren(){this.children=[];}
 show(){this.open=true;}
 close(){if(this.open){this.open=false;this.dispatchEvent(new Event('close'));}}
}
test('walking reentry keeps Kobi visible; wallet switching controls the real avatar; dialogue types without moving',()=>{
 const saved={document:globalThis.document,addEventListener:globalThis.addEventListener,removeEventListener:globalThis.removeEventListener};
 const bus=new EventTarget();globalThis.document={createElement:()=>new Element()};globalThis.addEventListener=bus.addEventListener.bind(bus);globalThis.removeEventListener=bus.removeEventListener.bind(bus);
 const scene=new Scene(),mascot=new Group(),clientGuide=new Group(),freelancerGuide=new Group(),host=new Element(),held=new Set();clientGuide.position.set(0,0,4);freelancerGuide.position.set(8,0,8);scene.add(mascot,clientGuide,freelancerGuide);let self=null;
 const controller=createThirdPerson({scene,camera:new PerspectiveCamera(),host,canvas:new Element(),avatars:{getSelf:()=>self,getPeers:()=>[],setControlled(){}},mascot,clientGuide,freelancerGuide,citizens:[],stations:[],held,obstacles:()=>[],wake(){},paused:()=>false,useStation(){},openProjectRoom(){},tour(){},key:()=> 'e'});
 try{
  controller.start();const visitor=scene.children.at(-1);assert.equal(visitor.visible,true);assert.equal(mascot.visible,false);
  controller.stop();assert.equal(visitor.visible,false);assert.equal(mascot.visible,true);
  controller.start();assert.equal(visitor.visible,true);
  const before=controller.position();held.add('forward');controller.update(.05,0,0);assert.ok(controller.position().z<before.z);
  self=createAvatar();scene.add(self.group);bus.dispatchEvent(new Event('accord-wallet'));controller.update(.05,0,0);assert.equal(visitor.visible,false);assert.equal(mascot.visible,true);
  held.add('right');controller.update(.05,0,0);assert.ok(self.group.position.x>0);
  controller.interact();const dialog=host.children.find(e=>e.dataset.worldConversation);assert.equal(dialog.open,true);
  const p=controller.position();held.add('forward');controller.update(.05,0,0);assert.deepEqual(controller.position(),p);assert.ok(dialog.children[1].textContent.length>0);assert.ok(dialog.children[1].textContent.length<20);
  assert.equal(clientGuide.userData.conversing,true);dialog.close();assert.equal(clientGuide.userData.conversing,false);
  self.group.position.set(0,0,6);mascot.position.set(0,0,9);assert.equal(controller.followGuide(true),true);for(let i=0;i<40;i++)controller.update(.05,0,0);assert.ok(self.group.position.z>6.5);assert.ok(self.group.position.z<8);
  held.add('left');const x=self.group.position.x;controller.update(.05,0,0);assert.ok(self.group.position.x<x);
 }finally{controller.dispose();Object.assign(globalThis,saved);}
});

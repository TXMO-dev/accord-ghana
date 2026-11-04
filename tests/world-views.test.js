import test from 'node:test';
import assert from 'node:assert/strict';
import {readViews,saveView,validView} from '../src/world-views.js';
const view={name:'Garden',position:[8,7,11],target:[0,1,0]};
test('stored viewpoints reject malformed and non-finite coordinates',()=>{for(const v of [null,{}, {...view,position:[Infinity,1,0]}, {...view,target:[999,0,0]}, {...view,position:[0,0,0]}, {...view,name:''}])assert.equal(validView(v),false);assert.deepEqual(readViews('{bad'),[]);assert.deepEqual(readViews(JSON.stringify([{},view])),[view]);});
test('saved views are bounded to three and names replace earlier views',()=>{let views=[];for(const name of ['one','two','three','four'])views=saveView(views,{...view,name});assert.deepEqual(views.map(v=>v.name),['four','three','two']);views=saveView(views,{...view,name:'three'});assert.deepEqual(views.map(v=>v.name),['three','four','two']);});

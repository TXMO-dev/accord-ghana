import test from 'node:test';
import assert from 'node:assert/strict';
import {highlifeStep,beatSeconds} from '../src/highlife-score.js';
test('eight-bar highlife loop has bounded voices and lead-free space',()=>{
 const voices=new Set();let leadSteps=0;for(let i=0;i<128;i++){const events=highlifeStep(i);assert.ok(events.length<=5);for(const e of events){voices.add(e.voice);assert.ok(Number.isFinite(e.midi));assert.ok(e.duration>0&&e.duration<beatSeconds);assert.ok(e.gain>0&&e.gain<=.13);}if(events.some(e=>['sax','flute'].includes(e.voice)))leadSteps++;}
 assert.deepEqual([...voices].sort(),['bass','flute','guitar','rim','sax','shaker']);assert.equal(leadSteps,6);assert.deepEqual(highlifeStep(128),highlifeStep(0));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioAudio} from '../src/studio-audio.js';
test('one output mutes existing music and effects, including rapid toggles',()=>{
 const values=[],gain={value:1,cancelScheduledValues(){},setValueAtTime(v){values.push(v);this.value=v;}},output={gain,connect(){},disconnect(){}},context={currentTime:1,destination:{},createGain(){return output;},close(){}};
 const bus=createStudioAudio(()=>context);bus.setEnabled(false);assert.equal(bus.destination().gain.value,0);bus.setEnabled(true);bus.setEnabled(false);bus.setEnabled(true);assert.deepEqual(values,[1,0,1]);assert.equal(bus.destination(),output);bus.dispose();
});

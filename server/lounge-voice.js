import {createHash} from 'node:crypto';
import {VOICE_RATE,VOICE_MAX_BYTES} from '../src/voice-format.js';
export function inspectVoice(encoded){
 if(typeof encoded!=='string'||encoded.length>Math.ceil(VOICE_MAX_BYTES/3)*4||! /^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Invalid voice recording.');
 const b=Buffer.from(encoded,'base64');
 if(b.length<46||b.length>VOICE_MAX_BYTES||b.length%2||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,16)!=='WAVEfmt '||b.readUInt32LE(4)!==b.length-8||b.readUInt32LE(16)!==16||b.readUInt16LE(20)!==1||b.readUInt16LE(22)!==1||b.readUInt32LE(24)!==VOICE_RATE||b.readUInt32LE(28)!==VOICE_RATE*2||b.readUInt16LE(32)!==2||b.readUInt16LE(34)!==16||b.toString('ascii',36,40)!=='data'||b.readUInt32LE(40)!==b.length-44)throw Error('Use an Accord recording of up to 30 seconds.');
 return {bytes:b,hash:createHash('sha256').update(b).digest('hex'),seconds:(b.length-44)/(VOICE_RATE*2)};
}
export function voiceManifest({hash,seconds,caption}){
 if(!/^[a-f0-9]{64}$/.test(hash)||!Number.isFinite(seconds)||seconds<=0||seconds>30||typeof caption!=='string'||!caption.trim()||caption.trim().length>200)throw Error('Add a short description and a recording of up to 30 seconds.');
 return JSON.stringify({hash,seconds,caption:caption.trim()});
}

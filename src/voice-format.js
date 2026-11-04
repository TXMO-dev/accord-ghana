export const VOICE_RATE=16000,VOICE_SECONDS=30,VOICE_MAX_BYTES=44+VOICE_RATE*VOICE_SECONDS*2;
export function encodeVoice(samples){
 if(!samples.length||samples.length>VOICE_RATE*VOICE_SECONDS)throw Error('Record between a moment and 30 seconds.');
 const bytes=new Uint8Array(44+samples.length*2),v=new DataView(bytes.buffer);
 const text=(offset,s)=>{for(let i=0;i<s.length;i++)bytes[offset+i]=s.charCodeAt(i);};
 text(0,'RIFF');v.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,VOICE_RATE,true);v.setUint32(28,VOICE_RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,Number.isFinite(samples[i])?samples[i]:0));v.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true);}return bytes;
}

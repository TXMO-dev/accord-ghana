import {beatSeconds,highlifeStep} from './highlife-score.js';
export function createStudioSoundtrack(getAudio,getDestination=null){
 let audio,master,timer=null,next=0,step=0,enabled=false,volume=.25,disposed=false;const sources=new Set();
 const level=()=>enabled&&!document.hidden?volume*.65:0;
 function gainTo(value,seconds=.2){if(!master)return;master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(value,audio.currentTime,seconds);}
 function note(n,time){
  const gain=audio.createGain();gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(n.gain,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+n.duration);gain.connect(master);
  let source,filter;const frequency=440*2**((n.midi-69)/12);
  if(n.voice==='shaker'||n.voice==='rim'){
   const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*n.duration),audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   source=audio.createBufferSource();source.buffer=buffer;filter=audio.createBiquadFilter();filter.type=n.voice==='shaker'?'highpass':'bandpass';filter.frequency.value=n.voice==='shaker'?6000:1700;filter.Q.value=.8;
  }else{
   source=audio.createOscillator();source.type=n.voice==='bass'||n.voice==='flute'?'sine':n.voice==='sax'?'sawtooth':'triangle';source.frequency.setValueAtTime(frequency,time);
   if(n.voice==='sax')source.frequency.linearRampToValueAtTime(frequency*1.004,time+n.duration*.6);
   filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=n.voice==='bass'?300:n.voice==='sax'?950:n.voice==='flute'?2200:1800;
  }
  source.connect(filter);filter.connect(gain);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(time);source.stop(time+n.duration+.03);
 }
 function tick(){if(!enabled||document.hidden||audio.state!=='running')return;if(next<audio.currentTime-.1)next=audio.currentTime+.03;while(next<audio.currentTime+.15){for(const n of highlifeStep(step))note(n,next);step=(step+1)%128;next+=beatSeconds/4;}}
 function pause(){clearInterval(timer);timer=null;gainTo(0,.06);for(const source of sources){try{source.stop(audio.currentTime+.08);}catch{}}}
 function start(){if(disposed||!enabled||document.hidden||timer&&audio?.state==='running')return;try{audio=getAudio();if(!master){master=audio.createGain();master.gain.value=0;master.connect(getDestination?getDestination():audio.destination);}audio.resume().then(()=>{if(disposed||!enabled||document.hidden)return;gainTo(level());if(!timer){next=audio.currentTime+.04;timer=setInterval(tick,70);tick();}}).catch(()=>{});}catch{}}
 const visibility=()=>document.hidden?pause():start();document.addEventListener('visibilitychange',visibility);
 return {enable(value){enabled=value;if(value)start();else pause();},start,setVolume(value){volume=Math.max(0,Math.min(1,value));gainTo(level());},duck(){if(!master||!enabled)return;const now=audio.currentTime;master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(level()*.3,now,.03);master.gain.setTargetAtTime(level(),now+1.1,.35);},dispose(){disposed=true;enabled=false;pause();document.removeEventListener('visibilitychange',visibility);master?.disconnect();}};
}

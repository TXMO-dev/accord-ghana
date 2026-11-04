import {encodeVoice,VOICE_RATE} from './voice-format.js';
export function mountLoungeVoice(panel,onPosted){
 panel.querySelector('[data-voice-composer]')?.remove();
 const root=document.createElement('section');root.dataset.voiceComposer='';root.innerHTML=`<h3>Say hello with a voice note</h3><p>Record up to 30 seconds. Preview before publishing to the public Lounge. A short description helps people who cannot listen.</p><label>Public name<input data-name maxlength="60" autocomplete="nickname"></label><label>Short description<input data-caption maxlength="200" placeholder="What is your recording about?"></label><div><button type="button" data-record disabled>Record voice note</button><button type="button" data-stop hidden>Stop recording</button><button type="button" data-cancel hidden>Discard recording</button></div><p data-status role="status">Checking voice availability…</p><audio data-preview controls preload="none" hidden aria-label="Preview your voice note"></audio><button type="button" data-send hidden>Review & sign voice note</button><p>Public for 24 hours. No autoplay. Stored audio is removed by a daily cleanup after expiry; other people may keep copies. No payment is requested.</p>`;
 panel.querySelector('[data-result]').before(root);
 const q=s=>root.querySelector(s),status=q('[data-status]'),record=q('[data-record]'),stop=q('[data-stop]'),cancel=q('[data-cancel]'),send=q('[data-send]'),preview=q('audio');
 let available=false,closed=false,busy=false,connecting=false,epoch=0,recorder=null,stream=null,timer=null,clock=null,bytes=null,url=null,duration=0;
 const release=()=>{clearTimeout(timer);clearInterval(clock);stream?.getTracks().forEach(t=>t.stop());stream=null;};
 const clear=()=>{epoch++;if(recorder?.state==='recording')recorder.stop();recorder=null;release();preview.pause();preview.removeAttribute('src');preview.load();if(url)URL.revokeObjectURL(url);url=null;bytes=null;preview.hidden=true;send.hidden=true;stop.hidden=true;cancel.hidden=true;record.disabled=!available;};
 async function request(body){const r=await fetch('/api/lounge-voice',{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Voice notes unavailable.');return d;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder||!window.AudioContext||!window.OfflineAudioContext){status.textContent='Voice recording is not supported in this browser. You can still post text.';}else request().then(d=>{if(closed)return;available=!!d.available;record.disabled=!available;status.textContent=d.available?'Ready when you are. Recording starts only after microphone permission.':'Voice notes are being prepared. Text chat remains available.';}).catch(e=>{if(!closed)status.textContent=e.message;});
 record.onclick=async()=>{
  if(busy||closed)return;clear();busy=true;record.disabled=true;cancel.hidden=false;const version=epoch;
  try{
   const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},video:false});if(closed||version!==epoch){mic.getTracks().forEach(t=>t.stop());return;}stream=mic;
   const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);const chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{clear();status.textContent='Recording failed. Please try again.';};
   recorder.onstop=async()=>{release();if(closed||version!==epoch)return;stop.hidden=true;status.textContent='Preparing your preview…';
    let context;try{
     context=new AudioContext();const decoded=await context.decodeAudioData(await new Blob(chunks,{type:type||chunks[0]?.type}).arrayBuffer());
     if(closed||version!==epoch)return;
     const frames=Math.min(VOICE_RATE*30,Math.floor(decoded.duration*VOICE_RATE));if(frames<1600)throw Error('Record at least a short phrase.');
     const offline=new OfflineAudioContext(1,frames,VOICE_RATE),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();
     if(closed||version!==epoch)return;bytes=encodeVoice(rendered.getChannelData(0));duration=frames/VOICE_RATE;url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));preview.src=url;preview.hidden=false;send.hidden=false;status.textContent=`${duration.toFixed(1)} seconds recorded. Listen, add a description, then sign to publish.`;
    }catch(e){if(!closed&&version===epoch){clear();status.textContent=e.message||'Could not prepare recording.';}}finally{context?.close();if(!closed&&version===epoch){busy=false;record.disabled=!available;}}
   };
   recorder.start();stop.hidden=false;const started=performance.now();status.textContent='Recording · 0 / 30 seconds';clock=setInterval(()=>{status.textContent=`Recording · ${Math.min(30,Math.floor((performance.now()-started)/1000))} / 30 seconds`;},250);timer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},30000);
  }catch(e){if(!closed&&version===epoch){clear();status.textContent=e.name==='NotAllowedError'?'Microphone permission was not granted. You can still use text chat.':e.message;}}finally{busy=false;}
 };
 stop.onclick=()=>{if(recorder?.state==='recording'){busy=true;recorder.stop();}};
 cancel.onclick=()=>{clear();busy=false;status.textContent='Recording discarded.';};
 send.onclick=async()=>{
  if(busy||!bytes)return;busy=true;send.disabled=true;record.disabled=true;const recording=bytes;let version=epoch;
  try{
   const name=q('[data-name]').value.trim(),caption=q('[data-caption]').value.trim();if(!name||!caption)throw Error('Add your public name and a short description.');
   const stellar=await import('./stellar.js');if(!stellar.account){connecting=true;try{await stellar.connect();}finally{connecting=false;}}if(closed||bytes!==recording)throw Error('Recording cancelled.');version=epoch;const wallet=stellar.account;await stellar.assertWallet(wallet);
   const digest=await crypto.subtle.digest('SHA-256',recording),hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
   const proof=await request({action:'challenge',wallet,name,caption,hash,seconds:duration});if(closed||version!==epoch)throw Error('Recording changed. Please review again.');
   status.textContent='Review your voice note approval in your wallet. No payment is requested.';const {signMessage}=await import('./wallet-kit.js');const signed=await signMessage(proof.message,{address:wallet,networkPassphrase:stellar.NETWORK});await stellar.assertWallet(wallet);
   if(closed||version!==epoch)throw Error('Posting cancelled.');if(signed.error||!signed.signedMessage||signed.signerAddress!==wallet)throw Error('Signature cancelled. Your preview is still here.');
   const signature=typeof signed.signedMessage==='string'?signed.signedMessage:btoa(String.fromCharCode(...signed.signedMessage));let binary='';for(let i=0;i<recording.length;i+=8192)binary+=String.fromCharCode(...recording.subarray(i,i+8192));
   await request({action:'post',token:proof.token,signature,audio:btoa(binary)});if(closed)return;clear();status.textContent='Voice note published for 24 hours.';onPosted();
  }catch(e){if(!closed)status.textContent=e.message;}finally{busy=false;send.disabled=false;if(!closed)record.disabled=!available;}
 };
 const changed=()=>{if(connecting)return;clear();busy=false;if(!closed)status.textContent='Wallet changed. Record a new note before publishing.';};
 const hidden=()=>{if(document.hidden&&recorder?.state==='recording'){clear();busy=false;status.textContent='Recording stopped and discarded when you left the page.';}};
 addEventListener('accord-wallet',changed);document.addEventListener('visibilitychange',hidden);
 return()=>{closed=true;clear();removeEventListener('accord-wallet',changed);document.removeEventListener('visibilitychange',hidden);};
}
export function voicePlayback(row){
 const wrap=document.createElement('div'),button=document.createElement('button'),audio=document.createElement('audio'),note=document.createElement('small');button.type='button';button.textContent=`Load voice note · ${Math.ceil(row.voice_seconds)}s`;audio.controls=true;audio.preload='none';audio.hidden=true;audio.setAttribute('aria-label','Voice note from '+row.display_name);note.setAttribute('role','status');wrap.append(button,audio,note);
 button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/api/lounge-voice?id='+encodeURIComponent(row.id),{signal:AbortSignal.timeout(20000)}),d=await r.json();if(!r.ok)throw Error(d.error||'Playback unavailable.');if(!wrap.isConnected)return;audio.src=d.url;audio.hidden=false;button.textContent='Reload audio';note.textContent='Press play to listen.';}catch(e){note.textContent=e.message;}finally{button.disabled=false;}};return wrap;
}


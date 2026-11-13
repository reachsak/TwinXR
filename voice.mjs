// Local speech only. Groq receives text via the existing assistant after Send.
let worker=null,sequence=0,pending=new Map(),context=null,source=null,capture=null,stream=null,timer=null,frames=[],samples=0,player=null,playbackDone=null,epoch=0,transcriptHandler=null,warming=null;
const state={ready:false,busy:false,recording:false,autoSpeak:true,status:'Local voice off · English',revision:0,transcript:'',transcriptId:0};
const $=id=>document.getElementById(id);
function update(values={}){Object.assign(state,values);state.revision++;$('voice-status').textContent=state.status;$('voice-enable').disabled=state.busy||state.recording||state.ready;$('voice-talk').disabled=!state.ready||state.busy;$('voice-talk').textContent=state.recording?'Finish recording':'Talk';$('voice-auto').checked=state.autoSpeak;}
function getWorker(){if(worker)return worker;worker=new Worker(new URL('./voice-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data:d})=>{const p=pending.get(d.id);if(!p)return;if(d.progress){update({status:d.progress});return;}clearTimeout(p.timeout);pending.delete(d.id);d.error?p.reject(Error(d.error)):p.resolve(d.result);};worker.onerror=()=>{for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('Speech worker failed. Try Enable voice again.'));}pending.clear();worker?.terminate();worker=null;update({ready:false,busy:false,status:'Speech engine failed; text chat remains available.'});};return worker;}
function run(op,extra={}){return new Promise((resolve,reject)=>{const id=++sequence;const w=getWorker();const timeout=setTimeout(()=>{stop();update({status:'Speech timed out. Try again or use text chat.'});},300000);pending.set(id,{resolve,reject,timeout});w.postMessage({id,op,...extra},extra.audio?[extra.audio.buffer]:[]);});}
async function audioContext(){context??=new AudioContext();await context.resume();return context;}
function closeMic(){clearTimeout(timer);timer=null;if(capture){capture.port.onmessage=null;capture.disconnect();capture=null;}source?.disconnect();source=null;stream?.getTracks().forEach(t=>t.stop());stream=null;}
function silence(){playbackDone?.();playbackDone=null;if(player){player.onended=null;try{player.stop();}catch{}player=null;}}
function cancelTurn(){
 if(warming)return;
 transcriptHandler=null;epoch++;closeMic();silence();frames=[];samples=0;
 update({busy:false,recording:false,status:state.ready?'Ready to listen':'Voice is starting'});
}
function stop(){transcriptHandler=null;epoch++;closeMic();silence();frames=[];samples=0;worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timeout);p.reject(new DOMException('Stopped','AbortError'));}pending.clear();update({ready:false,busy:false,recording:false,status:'Stopped · Enable voice to resume (cached models reused)'});}
function prewarm(){
 if(state.ready)return Promise.resolve();
 if(warming)return warming;
 const token=epoch;
 update({busy:true,status:'Preparing speech models…'});
 warming=run('load').then(()=>{
  if(token===epoch)update({ready:true,busy:false,status:'Ready to listen'});
 }).catch(e=>{
  if(token===epoch)update({busy:false,ready:false,status:'Voice unavailable. Trigger the robot to retry.'});
 }).finally(()=>{warming=null;});
 return warming;
}
async function enable(){if(state.busy||state.ready)return;const token=++epoch;update({busy:true,status:'Preparing local speech…'});try{await audioContext();const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});mic.getTracks().forEach(t=>t.stop());if(token!==epoch)return;await prewarm();}catch(e){if(token===epoch)update({busy:false,ready:false,status:'Voice unavailable: '+e.message});}}
async function toggle(onTranscript,{automatic=false}={}){if(state.recording){if(!automatic)return finish();return;}if(!state.ready||state.busy)return;transcriptHandler=typeof onTranscript==='function'?onTranscript:null;const token=++epoch;silence();update({busy:true,status:'Opening microphone…'});try{const ctx=await audioContext();await ctx.audioWorklet.addModule(new URL('./voice-capture.js',import.meta.url));const mic=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});if(token!==epoch){mic.getTracks().forEach(t=>t.stop());return;}stream=mic;frames=[];samples=0;source=ctx.createMediaStreamSource(stream);capture=new AudioWorkletNode(ctx,'voice-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});let voiced=0,lastVoice=0,windowEnergy=0,windowSamples=0;
 capture.port.onmessage=({data})=>{
  if(!state.recording)return;
  frames.push(data);samples+=data.length;
  if(!automatic)return;
  for(const value of data)windowEnergy+=value*value;
  windowSamples+=data.length;
  if(windowSamples<ctx.sampleRate*.025)return;
  if(Math.sqrt(windowEnergy/windowSamples)>=.009){
   voiced+=windowSamples;
   lastVoice=samples;
  }
  windowSamples=windowEnergy=0;
  if(voiced>=ctx.sampleRate*.12&&samples-lastVoice>=ctx.sampleRate*.85)void finish();
  else if(voiced<ctx.sampleRate*.12&&samples>=ctx.sampleRate*7){
   closeMic();frames=[];samples=0;transcriptHandler=null;
   update({recording:false,status:'No speech heard. Trigger the robot to try again.'});
  }
 };source.connect(capture);capture.connect(ctx.destination);update({recording:true,busy:false,status:automatic?'Listening…':'Listening locally · tap Finish when done'});timer=setTimeout(finish,20000);}catch(e){closeMic();if(token===epoch)update({busy:false,recording:false,status:'Microphone error: '+e.message});}}
async function finish(){if(!state.recording)return;const token=epoch;const handler=transcriptHandler;transcriptHandler=null;closeMic();update({recording:false,busy:true,status:'Transcribing locally…'});try{if(samples<context.sampleRate*.25)throw Error('Recording too short. Please try again.');const pcm=new Float32Array(samples);let off=0;for(const f of frames){pcm.set(f,off);off+=f.length;}frames=[];let energy=0;for(const f of pcm)energy+=f*f;if(Math.sqrt(energy/pcm.length)<.001)throw Error('No speech detected. Please try again.');const offline=new OfflineAudioContext(1,Math.ceil(samples*16000/context.sampleRate),16000);const b=offline.createBuffer(1,samples,context.sampleRate);b.copyToChannel(pcm,0);const s=offline.createBufferSource();s.buffer=b;s.connect(offline.destination);s.start();const rendered=await offline.startRendering();if(token!==epoch)return;const result=await run('transcribe',{audio:new Float32Array(rendered.getChannelData(0))});if(token!==epoch)return;const text=result.text?.trim();if(!text)throw Error('No words recognized. Please try again.');if(handler){update({busy:false,status:'Thinking…'});await handler(text);}else{$('ai-input').value=text;update({busy:false,transcript:text,transcriptId:state.transcriptId+1,status:'Review the transcript, then press Send.'});}}catch(e){if(token===epoch)update({busy:false,status:e.message});}}
async function speak(text){if(!state.ready||state.busy||state.recording||!text)return;const token=++epoch;silence();update({busy:true,status:'Preparing spoken reply…'});try{await audioContext();const clean=String(text).replace(/[`#*_]/g,'').slice(0,1600);const chunks=clean.match(/[^.!?]+[.!?]*\s*/g)||[clean];for(const part of chunks){for(let i=0;i<part.length;i+=240){if(token!==epoch)return;const clip=await run('speak',{text:part.slice(i,i+240)});if(token!==epoch)return;const buffer=context.createBuffer(1,clip.audio.length,clip.sampleRate);buffer.copyToChannel(clip.audio,0);player=context.createBufferSource();player.buffer=buffer;player.connect(context.destination);update({status:'Speaking locally…'});await new Promise(resolve=>{playbackDone=resolve;player.onended=()=>{playbackDone=null;resolve();};player.start();});}}if(token===epoch)update({busy:false,status:'Ready to listen'});}catch(e){if(token===epoch)update({busy:false,status:'Speech error: '+e.message});}}
function latest(){const messages=window.CognitiveAssistant?.state().messages||[];return [...messages].reverse().find(m=>m.role==='assistant')?.text||'';}
function toggleAuto(){state.autoSpeak=!state.autoSpeak;update();}
window.CognitiveVoice={state:()=>({...state}),enable,prewarm,cancelTurn,toggle,stop,speak,speakLatest:()=>speak(latest()),toggleAuto,onAnswer:text=>{if(state.autoSpeak&&state.ready&&!state.busy)speak(text);}};
$('voice-enable').onclick=enable;$('voice-talk').onclick=toggle;$('voice-stop').onclick=stop;$('voice-read').onclick=()=>speak(latest());$('voice-auto').onchange=()=>{state.autoSpeak=$('voice-auto').checked;update();};
window.addEventListener('pagehide',stop);
window.addEventListener('message',e=>{if(e.source===$('viewer').contentWindow&&e.origin===location.origin&&e.data?.type==='viewer-loaded'&&(state.recording||(state.busy&&!warming)))stop();});
update();

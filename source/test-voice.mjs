import assert from 'node:assert/strict';
const nodes=new Map();globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:true,textContent:''});return nodes.get(id);}};
let tracksStopped=0,lastCapture=null,asked=0;
globalThis.window={addEventListener(){},CognitiveAssistant:{state:()=>({messages:[]}),ask(){asked++;}}};
Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){tracksStopped++}}]})}},configurable:true});
class AC{sampleRate=48000;destination={};audioWorklet={addModule:async()=>{}};async resume(){}createMediaStreamSource(){return {connect(){},disconnect(){}};}}
globalThis.AudioContext=AC;globalThis.AudioWorkletNode=class{constructor(){lastCapture=this;this.port={}}connect(){}disconnect(){}};
globalThis.OfflineAudioContext=class{createBuffer(){return {copyToChannel(){}}}createBufferSource(){return {connect(){},start(){}}}async startRendering(){return {getChannelData:()=>new Float32Array(8000)}}};
globalThis.Worker=class{postMessage({id,op}){queueMicrotask(()=>this.onmessage?.({data:{id,result:op==='transcribe'?{text:'How many doors?'}:{}}}));}terminate(){}};
await import('./dist/voice.mjs');const v=window.CognitiveVoice;
await v.enable();assert(v.state().ready);assert.equal(tracksStopped,1);
await v.toggle();assert(v.state().recording);lastCapture.port.onmessage({data:new Float32Array(24000).fill(.1)});await v.toggle();assert.equal(v.state().transcript,'How many doors?');assert.equal(document.getElementById('ai-input').value,'How many doors?');assert.equal(asked,0,'speech must not auto-send to Groq');assert.equal(tracksStopped,2);assert(!v.state().busy);
await v.toggle();v.stop();assert(!v.state().recording);assert(!v.state().ready);assert.equal(tracksStopped,3);
console.log('PASS enable, capture cleanup, transcription review, no auto-send, stop/reset');

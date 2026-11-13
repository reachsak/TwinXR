import {pipeline,env} from '@huggingface/transformers';
import {KokoroTTS} from 'kokoro-js';
env.allowLocalModels=true;
env.allowRemoteModels=false;
env.localModelPath=new URL('./models/',self.location.href).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths=new URL('./vendor/voice/',self.location.href).href;
let stt,tts;
self.onmessage=async({data:{id,op,audio,text}})=>{
 const progress=p=>{if(p.status==='progress')self.postMessage({id,progress:`Loading ${p.file||'model'} ${Math.round(p.progress||0)}%`});};
 try{
  if(op==='load'||op==='transcribe')stt??=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny.en',{device:'wasm',dtype:'q8',progress_callback:progress});
  let result={};
  if(op==='transcribe')result={text:(await stt(audio,{chunk_length_s:20,stride_length_s:3,max_new_tokens:128})).text};
  if(op==='load'||op==='speak'){
   tts??=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{device:'wasm',dtype:'q8',progress_callback:progress});
   const clip=await tts.generate(op==='load'?'Ready.':text,{voice:'af_heart'});const pcm=new Float32Array(clip.audio);
   if(op==='speak'){self.postMessage({id,result:{audio:pcm,sampleRate:clip.sampling_rate}},[pcm.buffer]);return;}
  }
  self.postMessage({id,result});
 }catch(e){self.postMessage({id,error:e.message||String(e)});}
};

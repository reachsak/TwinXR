import {pipeline,env} from '@huggingface/transformers';
env.allowLocalModels=true;
env.allowRemoteModels=false;
env.localModelPath=new URL('./models/',self.location.href).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths=new URL('./vendor/voice/',self.location.href).href;
let recognizer;
self.onmessage=async({data:{id,op,audio}})=>{
 const progress=p=>{if(p.status==='progress')self.postMessage({id,progress:`Loading ${p.file||'model'} ${Math.round(p.progress||0)}%`});};
 try{
  recognizer??=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny.en',{device:'wasm',dtype:'q8',progress_callback:progress});
  const result=op==='transcribe'?{text:(await recognizer(audio,{chunk_length_s:20,stride_length_s:3,max_new_tokens:128})).text}:{};
  self.postMessage({id,result});
 }catch(e){self.postMessage({id,error:e.message||String(e)});}
};

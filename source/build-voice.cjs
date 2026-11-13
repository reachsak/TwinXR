const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
fs.mkdirSync('dist/vendor/voice',{recursive:true});
const dir=path.dirname(path.dirname(require.resolve('onnxruntime-web')));
for(const n of ['ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm'])fs.copyFileSync(path.join(dir,'dist',n),path.join('dist/vendor/voice',n));
esbuild.build({entryPoints:['voice-worker.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/voice-worker.mjs',minify:true,target:['es2022'],plugins:[{name:'local-kokoro-voice',setup(build){
 build.onLoad({filter:/kokoro\.js$/},({path})=>{
  const code=fs.readFileSync(path,'utf8');
  const remote='https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/';
  if(!code.includes(remote))throw Error('Kokoro voice path changed');
  return {contents:code.replace(remote,'./models/onnx-community/Kokoro-82M-v1.0-ONNX/voices/')};
 });
}}]}).catch(()=>{process.exitCode=1;});

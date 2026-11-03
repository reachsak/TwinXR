const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
fs.mkdirSync('dist/vendor/voice',{recursive:true});
const dir=path.dirname(path.dirname(require.resolve('onnxruntime-web')));
for(const n of ['ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm'])fs.copyFileSync(path.join(dir,'dist',n),path.join('dist/vendor/voice',n));
esbuild.buildSync({entryPoints:['voice-worker.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/voice-worker.mjs',minify:true,target:['es2022']});

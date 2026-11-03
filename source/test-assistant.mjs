import assert from 'node:assert/strict';
const nodes=new Map();
function node(){return {value:'',hidden:false,disabled:false,children:[],textContent:'',append(...v){this.children.push(...v);},replaceChildren(){this.children=[];}};}
globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,querySelectorAll:()=>[]};
globalThis.window={COGNITIVE_SYSTEM_PROMPT:'You help building managers.',COGNITIVE_GROQ_KEY:'TEST',addEventListener(){}};
const snapshot={name:'Test model',floors:[],elements:[],readings:[],timestamp:Date.now()};
document.getElementById('viewer').contentWindow={cognitiveTwin:{snapshot:()=>snapshot}};
document.getElementById('ai-model').value='test-model';
let requests=[];
globalThis.fetch=async(url,options)=>{const b=JSON.parse(options.body);requests.push(b);return {ok:true,json:async()=>({choices:[{message:requests.length%2?{role:'assistant',tool_calls:[{id:'tool1',type:'function',function:{name:'query_building',arguments:'{"operation":"overview"}'}}]}:{role:'assistant',content:'No exported floors in this test model.'}}]})};};
await import('./dist/assistant.mjs');
assert.equal(document.getElementById('ai-prompt').value,'You help building managers.');
document.getElementById('ai-prompt').value='Custom manager instructions';
const answer=await window.CognitiveAssistant.ask('List floors');
assert.equal(requests[0].messages[0].content,'Custom manager instructions');
assert(requests[1].messages.some(m=>m.role==='tool'));
assert.match(answer,/No exported/);assert.equal(window.CognitiveAssistant.state().messages.length,2);assert.equal(window.CognitiveAssistant.state().busy,false);
document.getElementById('ai-prompt-reset').onclick();assert.equal(document.getElementById('ai-prompt').value,'You help building managers.');
console.log('PASS editable prompt, shared AR/web API, tool execution, answer transcript, reset');

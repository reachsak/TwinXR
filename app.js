import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { installSpaceTools } from './room-tools.js';
import { classifySurface, createMaterialPair } from './materials.js';

const $=id=>document.getElementById(id);
function boot(data){
data.spaces=data.elements.filter(e=>e.type==='IfcSpace');data.elements=data.elements.filter(e=>e.type!=='IfcSpace');let spaceTools=null;
let frameDirty=true;function invalidate(){frameDirty=true;}
const renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;
renderer.setClearColor(0xcbd9e5);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;renderer.transmissionResolutionScale=.65;
const scene=new THREE.Scene();
const hemi=new THREE.HemisphereLight(0xd9ebff,0x6c6254,.55);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff3dc,3.0);sun.castShadow=true;scene.add(sun);scene.add(sun.target);
const fill=new THREE.DirectionalLight(0xdceaff,.18);fill.position.set(-30,20,-30);scene.add(fill);
// Analytic sky supplies both the background and reflection lighting, entirely offline.
const sky=new Sky();sky.scale.setScalar(4000);scene.add(sky);
const skyUniforms=sky.material.uniforms;
skyUniforms.turbidity.value=4;skyUniforms.rayleigh.value=1.4;
skyUniforms.mieCoefficient.value=.003;skyUniforms.mieDirectionalG.value=.8;
const environmentScene=new THREE.Scene();
const reflectionSky=new Sky();reflectionSky.scale.setScalar(4000);environmentScene.add(reflectionSky);
const pmrem=new THREE.PMREMGenerator(renderer);let environmentTarget=null;
scene.environmentIntensity=.42;
let camera=new THREE.PerspectiveCamera(42,1,.01,10000);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
controls.screenSpacePanning=true;controls.maxPolarAngle=Math.PI*.99;
const root=new THREE.Group();scene.add(root);
const geom=new Map(),materialCache=new Map(),entries=new Map(),meshes=[];
const clipping=new THREE.Plane(new THREE.Vector3(0,-1,0),10000);
const lineMaterial=new THREE.LineBasicMaterial({color:0x304354,transparent:true,opacity:.28,clippingPlanes:[]});
function decode(base64,Type){if(base64 instanceof Type)return base64;const str=atob(base64),arr=new Uint8Array(str.length);for(let i=0;i<str.length;i++)arr[i]=str.charCodeAt(i);return new Type(arr.buffer);}
for(const [id,raw]of Object.entries(data.geometries)){
 const geometry=new THREE.BufferGeometry(),v=decode(raw.vertices,Float32Array),inter=new THREE.InterleavedBuffer(v,6);
 geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(inter,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(inter,3,3));geometry.setIndex(new THREE.BufferAttribute(decode(raw.indices,Uint32Array),1));geometry.computeBoundingBox();geometry.computeBoundingSphere();geom.set(Number(id),geometry);
}
for(const el of data.elements){
 const group=new THREE.Group();group.userData.element=el;root.add(group);
 for(const p of el.parts){
  const kind=classifySurface(el,p),key=kind+':'+p.color.join(',');
  if(!materialCache.has(key))materialCache.set(key,createMaterialPair(el,p));
  const pair=materialCache.get(key);
  const mesh=new THREE.Mesh(geom.get(p.geometry),pair.realistic);mesh.applyMatrix4(new THREE.Matrix4().fromArray(p.matrix));
  mesh.castShadow=pair.kind!=='glass';mesh.receiveShadow=true;
  mesh.userData={element:el,materialPair:pair,originalMaterial:mesh.material};group.add(mesh);meshes.push(mesh);
 }
 entries.set(el.id,{el,group,box:new THREE.Box3()});
}
root.updateMatrixWorld(true);const originalBounds=new THREE.Box3().setFromObject(root);const center=originalBounds.getCenter(new THREE.Vector3());root.position.set(-center.x,-originalBounds.min.y,-center.z);root.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z),maxHeight=size.y;
for(const entry of entries.values())entry.box.setFromObject(entry.group);
const grid=new THREE.GridHelper(Math.ceil(span/5)*10,20,0x8897a6,0xb8c3cc);grid.position.y=-.02;grid.visible=false;scene.add(grid);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(span*100,span*100),new THREE.MeshStandardMaterial({color:0xc9cac3,roughness:.96,metalness:0}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;scene.add(ground);
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-span*.85;sun.shadow.camera.right=span*.85;
sun.shadow.camera.top=span*.85;sun.shadow.camera.bottom=-span*.85;sun.shadow.camera.near=.1;sun.shadow.camera.far=span*7;
sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;sun.shadow.camera.updateProjectionMatrix();
let presentation='realistic';
function allMaterials(){return [...materialCache.values()].flatMap(p=>[p.original,p.realistic]);}
function refreshShadows(){renderer.shadowMap.needsUpdate=true;invalidate();}
function rebuildEnvironment(){
  for(const key of ['turbidity','rayleigh','mieCoefficient','mieDirectionalG'])reflectionSky.material.uniforms[key].value=skyUniforms[key].value;
  reflectionSky.material.uniforms.sunPosition.value.copy(skyUniforms.sunPosition.value);
  const target=pmrem.fromScene(environmentScene,.035,.1,10000);
  const previous=environmentTarget;environmentTarget=target;scene.environment=target.texture;if(previous)previous.dispose();
}
function updateSun(rebuild=false){
  const elevation=Number($('sun-elevation').value),azimuth=Number($('sun-angle').value);
  const direction=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-elevation),THREE.MathUtils.degToRad(azimuth));
  sun.target.position.set(0,maxHeight*.48,0);sun.position.copy(sun.target.position).addScaledVector(direction,span*3);
  skyUniforms.sunPosition.value.copy(direction);$('sun-value').textContent=`${elevation}°`;
  $('direction-value').textContent=`${azimuth}°`;
  refreshShadows();if(rebuild)rebuildEnvironment();
}
function lightingPreset(){
 const setting=$('lighting').value;
 if(setting==='warm'){$('sun-elevation').value=22;$('sun-angle').value=235;sun.color.set('#ffd4a0');sun.intensity=2.8;hemi.intensity=.46;scene.environmentIntensity=.38;skyUniforms.turbidity.value=7;}
 else if(setting==='soft'){$('sun-elevation').value=55;$('sun-angle').value=135;sun.color.set('#f0f5ff');sun.intensity=.8;hemi.intensity=.85;scene.environmentIntensity=.58;skyUniforms.turbidity.value=10;}
 else{$('sun-elevation').value=38;$('sun-angle').value=135;sun.color.set('#fff3dc');sun.intensity=3.0;hemi.intensity=.55;scene.environmentIntensity=.42;skyUniforms.turbidity.value=4;}
 updateSun(true);
}
$('lighting').onchange=lightingPreset;
for(const id of ['sun-elevation','sun-angle']){$(id).oninput=()=>updateSun(false);$(id).onchange=()=>updateSun(true);}
$('exposure').oninput=()=>{renderer.toneMappingExposure=Number($('exposure').value);$('exposure-value').textContent=renderer.toneMappingExposure.toFixed(2);invalidate();};
$('ground').onchange=()=>{ground.visible=$('ground').checked;refreshShadows();};
$('grid').onchange=()=>{grid.visible=$('grid').checked;invalidate();};
$('shadows').onchange=()=>{renderer.shadowMap.enabled=$('shadows').checked;for(const m of allMaterials())m.needsUpdate=true;ground.material.needsUpdate=true;refreshShadows();};
$('presentation').onchange=()=>{presentation=$('presentation').value;updateMaterials();};

let floor='all',category='all',query='',selected=null,isolated=null,view='iso';const hidden=new Set();let edgesBuilt=false;
const floorIndex=new Map(data.floors.map((f,i)=>[f.id,i]));
const floors=[{id:'all',name:'Entire building'},...data.floors,...(data.elements.some(e=>!e.floor)?[{id:0,name:'Unassigned'}]:[])];
for(const f of floors){const b=document.createElement('button');b.dataset.floor=f.id;const text=document.createElement('span');text.textContent=f.name;const n=document.createElement('span');n.className='count';n.textContent=f.id==='all'?data.elements.length:data.elements.filter(e=>e.floor===f.id).length;b.append(text,n);b.onclick=()=>{floor=f.id;isolated=null;$('section').checked=false;updateSection();select(null);applyFilters();fit();};$('floors').append(b);}
for(const type of [...new Set(data.elements.map(e=>e.type))].sort()){const op=document.createElement('option');op.value=type;op.textContent=type.replace(/^IFC/i,'');$('category').append(op);}
function floorMatches(el){return floor==='all'||el.floor===floor||($('cumulative').checked&&floorIndex.has(floor)&&floorIndex.has(el.floor)&&floorIndex.get(el.floor)<=floorIndex.get(floor));}
function applyFilters(){let n=0;$('view-caption').textContent=floors.find(f=>f.id===floor)?.name||'Entire building';for(const {el,group}of entries.values()){group.visible=floorMatches(el)&&(category==='all'||el.type===category)&&(!query||`${el.name} ${el.type} ${el.id} ${el.guid}`.toLowerCase().includes(query))&&!hidden.has(el.id)&&(isolated===null||isolated===el.id);if(group.visible)n++;}if(selected&&!entries.get(selected).group.visible)select(null);$('visible-count').textContent=`${n.toLocaleString()} / ${data.elements.length.toLocaleString()} elements`;for(const b of $('floors').children){const active=b.dataset.floor===String(floor);b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);}updateResults();spaceTools?.paint();refreshShadows();}
function visibleBounds(){const box=new THREE.Box3();for(const e of entries.values())if(e.group.visible)box.union(e.box);return box.isEmpty()?bounds.clone():box;}
function fit(){const b=visibleBounds(),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());controls.target.copy(c);const aspect=renderer.domElement.clientWidth/renderer.domElement.clientHeight;
 if(view==='top'){const half=Math.max(s.z/2,s.x/(2*aspect),.5)*1.14;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.zoom=1;camera.position.copy(c).add(new THREE.Vector3(0,span*3,0));camera.up.set(0,0,-1);}
 else{const radius=Math.max(s.length()/2,.2);const limiting=Math.min(THREE.MathUtils.degToRad(camera.fov)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*aspect));const dist=radius/Math.sin(limiting)*1.1;camera.position.copy(c).add(new THREE.Vector3(1,.72,1).normalize().multiplyScalar(dist));camera.up.set(0,1,0);camera.near=Math.max(.001,span/10000);camera.far=Math.max(10000,dist*10);}
 camera.updateProjectionMatrix();camera.lookAt(c);controls.update();invalidate();}
function setView(next){view=next;camera=next==='top'?new THREE.OrthographicCamera(-10,10,10,-10,.01,10000):new THREE.PerspectiveCamera(42,renderer.domElement.clientWidth/renderer.domElement.clientHeight,.01,10000);controls.object=camera;controls.enableRotate=next!=='top';$('iso').classList.toggle('active',next==='iso');$('top').classList.toggle('active',next==='top');fit();}
const highlight=new THREE.MeshStandardMaterial({color:0x19cfa5,emissive:0x064c3b,roughness:.55,side:THREE.DoubleSide,clipShadows:true});
function addProperty(label,value){if(value===null||value===undefined||value==='')return;const p=document.createElement('div');p.className='property';const name=document.createElement('span'),v=document.createElement('div');name.textContent=label;v.textContent=String(value);p.append(name,v);$('properties').append(p);}
function select(id){spaceTools?.clear();$('overview').hidden=id!==null;$('element-actions').hidden=false;invalidate();if(selected)for(const mesh of entries.get(selected).group.children)if(mesh.isMesh)mesh.material=mesh.userData.originalMaterial;selected=id;$('properties').replaceChildren();$('details').classList.toggle('empty',id===null);for(const key of ['hide','isolate','clear'])$(key).disabled=id===null;
 if(id===null){$('selection-title').textContent='Building overview';return;}const e=entries.get(id).el;$('selection-title').textContent=e.name;for(const mesh of entries.get(id).group.children)if(mesh.isMesh)mesh.material=highlight;
 addProperty('IFC entity',e.type);addProperty('Visual finishes (approximate)',[...new Set(e.parts.map(p=>classifySurface(e,p)))].join(', '));addProperty('Floor',data.floors.find(f=>f.id===e.floor)?.name||'Unassigned');addProperty('Express ID',e.id);addProperty('Global ID',e.guid);for(const [k,v]of e.properties)addProperty(k,v);
}
function updateResults(){$('results').replaceChildren();if(!query)return;const matches=[...entries.values()].filter(e=>e.group.visible);for(const {el}of matches.slice(0,35)){const b=document.createElement('button');b.textContent=`#${el.id} · ${el.name}`;b.title=b.textContent;b.onclick=()=>{select(el.id);controls.target.copy(entries.get(el.id).box.getCenter(new THREE.Vector3()));};$('results').append(b);}if(matches.length>35){const note=document.createElement('p');note.className='muted';note.textContent='Showing first 35 matches. Refine your search.';$('results').append(note);}}
$('category').onchange=e=>{category=e.target.value;applyFilters();};$('search').oninput=e=>{query=e.target.value.trim().toLowerCase();applyFilters();};$('cumulative').onchange=()=>{applyFilters();fit();};
$('hide').onclick=()=>{if(selected)hidden.add(selected);select(null);applyFilters();};$('isolate').onclick=()=>{isolated=selected;applyFilters();fit();};$('clear').onclick=()=>select(null);
$('reset').onclick=()=>{hidden.clear();isolated=null;floor='all';category='all';query='';$('search').value='';$('category').value='all';$('cumulative').checked=false;$('section').checked=false;$('ghost').checked=false;updateSection();updateMaterials();select(null);applyFilters();fit();};
function updateMaterials(){
 for(const m of allMaterials()){
  m.opacity=$('ghost').checked?Math.min(m.userData.baseOpacity,.22):m.userData.baseOpacity;
  if(m.isMeshPhysicalMaterial)m.transmission=$('ghost').checked?0:m.userData.baseTransmission;
  m.transparent=m.opacity<.99;m.depthWrite=!m.transparent;m.needsUpdate=true;
 }
 for(const mesh of meshes){
  const m=mesh.userData.materialPair[presentation];mesh.userData.originalMaterial=m;
  if(mesh.userData.element.id!==selected)mesh.material=m;
  mesh.castShadow=mesh.userData.materialPair.kind!=='glass'&&!$('ghost').checked;
 }
 refreshShadows();
}
$('ghost').onchange=updateMaterials;
$('edges').onchange=()=>{if(!edgesBuilt){const cache=new Map();for(const mesh of meshes){if(!cache.has(mesh.geometry.uuid))cache.set(mesh.geometry.uuid,new THREE.EdgesGeometry(mesh.geometry,25));const edges=new THREE.LineSegments(cache.get(mesh.geometry.uuid),lineMaterial);mesh.add(edges);}edgesBuilt=true;}for(const mesh of meshes)for(const line of mesh.children)line.visible=$('edges').checked;invalidate();};
function updateSection(){const enabled=$('section').checked,h=maxHeight*Number($('height').value)/1000;clipping.constant=h;$('height').disabled=!enabled;$('cut-value').textContent=enabled?`· ${h.toFixed(2)} m`:'';const planes=enabled?[clipping]:[];for(const m of [...allMaterials(),highlight,lineMaterial,...(spaceTools?.materials||[])]){m.clippingPlanes=planes;m.needsUpdate=true;}spaceTools?.paint();refreshShadows();}
$('section').onchange=updateSection;$('height').oninput=updateSection;
$('iso').onclick=()=>setView('iso');$('top').onclick=()=>setView('top');$('fit').onclick=fit;
$('snapshot').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='Digital-Twin-view.png';a.href=renderer.domElement.toDataURL('image/png');a.click();};
const raycaster=new THREE.Raycaster();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||down.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hits=raycaster.intersectObjects([...meshes.filter(m=>m.parent.visible),...(spaceTools?.picks.filter(m=>m.parent.visible)||[])],false);const hit=hits.find(h=>!$('section').checked||clipping.distanceToPoint(h.point)>=0);if(hit?.object.userData.space)spaceTools.open(hit.object.userData.space);else select(hit?.object.userData.element?.id??null);});
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key.toLowerCase()==='f')fit();if(e.key==='Escape')select(null);});
function resize(){const width=renderer.domElement.parentElement.clientWidth,height=renderer.domElement.parentElement.clientHeight;renderer.setSize(width,height,false);if(camera.isPerspectiveCamera)camera.aspect=width/height;else{const half=camera.top;camera.left=-half*width/height;camera.right=half*width/height;}camera.updateProjectionMatrix();invalidate();}

spaceTools=installSpaceTools({data,root,geom,clipping,invalidate,getFloor:()=>floor,addProperty,openRoom:r=>{select(null);floor=r.el.floor||'all';category='all';query='';hidden.clear();isolated=null;$('category').value='all';$('search').value='';$('cumulative').checked=false;$('section').checked=true;const cut=Math.min(maxHeight,r.box.min.y+1.5);$('height').value=cut/maxHeight*1000;updateSection();applyFilters();fit();}});
document.title=data.name+' · IFC Twin Studio';$('building-name').textContent=data.name;$('overview-levels').textContent=data.floors.length;$('overview-spaces').textContent=data.spaces.length;$('source-summary').textContent=data.name+' · '+data.floors.length+' levels · '+data.elements.length.toLocaleString()+' elements · '+data.spaces.length+' spaces';
$('about-open').onclick=()=>$('about').showModal();
new ResizeObserver(resize).observe(renderer.domElement.parentElement);resize();lightingPreset();applyFilters();fit();$('model-summary').textContent=`${data.floors.length} levels · ${data.elements.length.toLocaleString()} elements`;$('loading').remove();parent.postMessage({type:'viewer-loaded'},location.origin);renderer.setAnimationLoop(now=>{spaceTools.step(now);const changed=controls.update();if(changed||frameDirty){renderer.render(scene,camera);frameDirty=false;}});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('visible-count').textContent='Graphics context lost. Reload this file to resume.';});
}
let opened=false;
window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='load-model'||opened)return;opened=true;try{boot(event.data.data);}catch(error){console.error(error);const loading=$('loading');if(loading)loading.textContent='Unable to open this model: '+error.message;parent.postMessage({type:'viewer-error',message:error.message},location.origin);}});
parent.postMessage({type:'viewer-ready'},location.origin);

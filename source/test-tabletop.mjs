import assert from 'node:assert/strict';
import {createEquipmentState} from '../equipment-state.mjs';
import * as T from 'three';
import {installTabletop} from './tabletop.js';
const elements=new Map();globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);},createElement:()=>({getContext:()=>({save(){},restore(){},rect(){},clip(){},fillRect(){},strokeRect(){},fillText(){},clearRect(){},beginPath(){},roundRect(){},fill(){},arc(){},measureText(t){return {width:t.length*12}}})})};
let asked='',rev=0;globalThis.window={parent:{CognitiveAssistant:{state:()=>({busy:false,revision:rev,messages:asked?[{role:'assistant',text:'There are 12 doors.'}]:[]}),ask:async q=>{asked=q;rev++;return 'There are 12 doors.';},stop(){},clear(){asked='';rev++;}}}};
let voiceAction='',voiceState={ready:true,revision:0,status:'Ready'};
window.parent.CognitiveVoice={state:()=>({...voiceState}),prewarm(){voiceAction='warm';},cancelTurn(){},async toggle(callback,options){assert(options.automatic);await callback('List the floors');},async speak(text){voiceAction=text;}};
const scene=new T.Scene(),root=new T.Group(),sky=new T.Group(),ground=new T.Group(),grid=new T.Group();scene.add(root,sky,ground,grid);root.position.set(-30,2,-20);const camera=new T.PerspectiveCamera();camera.position.set(50,50,50);const controls={enabled:true};let end,selected;
const session={addEventListener:(k,fn)=>end=fn,requestReferenceSpace:async()=>({}),requestHitTestSource:async()=>{throw Error('unavailable');},end:async()=>end()};
Object.defineProperty(globalThis,'navigator',{value:{xr:{isSessionSupported:async()=>true,requestSession:async()=>session}},configurable:true});
const controllers=[new T.Group(),new T.Group()];const renderer={shadowMap:{enabled:true},getClearColor:c=>c.set(0xffffff),getClearAlpha:()=>1,setClearColor(){},xr:{getController:i=>controllers[i],setReferenceSpaceType(){},setSession:async()=>{},getReferenceSpace:()=>({})}};
let pickedDevice=null;const deviceMesh=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshBasicMaterial());deviceMesh.userData.equipment='purifier';deviceMesh.position.set(10,1,-1);scene.add(deviceMesh);const eqPicker={picks:[deviceMesh],choose:id=>pickedDevice=id};
const xr=installTabletop({equipment:eqPicker,renderer,scene,root,sky,ground,grid,controls,getCamera:()=>camera,span:40,floors:[{id:'all',name:'Entire building'},{id:1,name:'Level 1'}],setFloor:id=>selected=id,heatmap:{options:[{textContent:"No heatmap"},{textContent:"Temperature"}],selectedIndex:0,dispatchEvent(){}},prepare(){},restore(){}});
await elements.get('enter-ar').onclick();assert(xr.active);assert.equal(sky.visible,false);assert.equal(controls.enabled,false);assert(Math.abs(root.parent.scale.x*40-.85)<1e-9);assert.deepEqual(root.position.toArray(),[-30,2,-20]);
xr.step({getViewerPose:()=>({transform:{position:{x:0,y:1.6,z:0},orientation:{x:0,y:0,z:0,w:1}}})});
const panel=scene.children.find(c=>c.children.some(b=>b.userData.action));assert.equal(panel?.visible,true,'panel opens alongside model at startup');function click(title){const m=panel.children.find(m=>m.userData.title===title);assert(m,title);scene.updateMatrixWorld(true);const target=m.getWorldPosition(new T.Vector3());controllers[0].position.copy(target).add(new T.Vector3(0,0,1).applyQuaternion(panel.quaternion));controllers[0].quaternion.copy(panel.quaternion);controllers[0].dispatchEvent({type:'selectstart'});controllers[0].dispatchEvent({type:'selectend'});}
click('Level 1');assert.equal(selected,1);click('Model');click('− Smaller');assert(root.parent.scale.x*40<.85);click('Sensors');click('Temperature');click('Floors');assert(panel.children.some(m=>m.userData.title==='Level 1'));
const equipment=createEquipmentState();window.cognitiveTwin={getEquipment:equipment.snapshot,controlEquipment:equipment.control,focusEquipment(){}};click('Devices');click('Light bulb · 0');assert.equal(equipment.levels.light,5);click('+');assert.equal(equipment.levels.light,6);click('All off');assert(Object.values(equipment.levels).every(v=>v===0));assert.equal(voiceAction,'warm');click('AI chat');
assert.deepEqual(panel.children.filter(m=>m.userData.action).map(m=>m.userData.title),['Building controls']);
const robot=panel.children.find(m=>m.isGroup).children[0].children[0];
scene.updateMatrixWorld(true);
controllers[0].position.copy(robot.getWorldPosition(new T.Vector3())).add(new T.Vector3(0,0,1).applyQuaternion(panel.quaternion));
controllers[0].quaternion.copy(panel.quaternion);
controllers[0].dispatchEvent({type:'selectstart'});
await new Promise(r=>setTimeout(r,0));
assert.equal(asked,'List the floors');assert.equal(voiceAction,'There are 12 doors.');
click('Building controls');
// Grip the panel, translate and rotate it without moving the building.
scene.updateMatrixWorld(true);const panelAim=panel.children.find(m=>m.userData.title==='Floors').getWorldPosition(new T.Vector3());controllers[0].position.copy(panelAim).add(new T.Vector3(0,0,1).applyQuaternion(panel.quaternion));controllers[0].quaternion.copy(panel.quaternion);
const modelBefore=root.parent.position.clone(),panelBefore=panel.position.clone();controllers[0].dispatchEvent({type:'squeezestart'});controllers[0].position.x+=.2;xr.step({getViewerPose:()=>({transform:{position:{x:0,y:1.6,z:0},orientation:{x:0,y:0,z:0,w:1}}})});assert(Math.abs(panel.position.x-panelBefore.x-.2)<1e-8,'controller grip moves panel');assert.deepEqual(root.parent.position.toArray(),modelBefore.toArray(),'panel grip leaves model stationary');
const panelQ=panel.quaternion.clone();controllers[0].quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.25));xr.step({getViewerPose:()=>({transform:{position:{x:0,y:1.6,z:0},orientation:{x:0,y:0,z:0,w:1}}})});assert(panel.quaternion.angleTo(panelQ)>.2,'controller grip rotates panel');controllers[0].dispatchEvent({type:'squeezeend'});
// Synthetic tracked palms and fingertip poses exercise touch and follow/pin.
let clock=1000;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
let head={x:0,y:1.6,z:0},tip=null,up=true;
const left={handedness:'left',hand:new Map([['middle-finger-metacarpal','palm']])},right={handedness:'right',hand:new Map([['index-finger-tip','tip']])};session.inputSources=[left,right];
const frame={getViewerPose:()=>({transform:{position:head,orientation:{x:0,y:0,z:0,w:1}}}),getJointPose:key=>key==='palm'?{transform:{position:{x:-.2,y:1.2,z:-.4},orientation:up?{x:1,y:0,z:0,w:0}:{x:0,y:0,z:0,w:1}}}:tip?{transform:{position:tip}}:null};
function tick(){clock+=600;xr.step(frame);}
const launcher=scene.getObjectByName('left-palm-menu');panel.children.find(m=>m.userData.title==='Hide').userData.action();tick();assert(launcher.visible);assert(!panel.visible);
scene.updateMatrixWorld(true);tip=launcher.getWorldPosition(new T.Vector3());tick();assert(panel.visible,'right fingertip opens palm menu');
tip=null;tick();const before=panel.position.clone();head={x:.6,y:1.6,z:0};tick();assert.deepEqual(panel.position.toArray(),before.toArray(),'panel stationary by default');panel.children.find(m=>m.userData.title==='Move panel').userData.action();tick();assert(panel.position.distanceTo(before)>.01,'explicit move mode');
panel.children.find(m=>m.userData.title==='Lock panel').userData.action();const pinned=panel.position.clone();head={x:1.2,y:1.6,z:0};tick();assert.deepEqual(panel.position.toArray(),pinned.toArray());
scene.updateMatrixWorld(true);tip=panel.children.find(m=>m.userData.title==='Level 1').getWorldPosition(new T.Vector3());selected=null;tick();assert.equal(selected,1,'touch selects floor');tip=null;tick();
up=false;tick();assert(!launcher.visible,'palm-down hides launcher');
// Controller grips exercise the same transform engine as tracked-hand pinches.
tip=null;session.inputSources=[];clock+=1000;
controllers[0].position.set(-.2,1,-1);controllers[1].position.set(.2,1,-1);
controllers[0].dispatchEvent({type:'squeezestart'});tick();
const grabPosition=root.parent.position.clone();controllers[0].position.x+=.1;tick();
assert(Math.abs(root.parent.position.x-grabPosition.x-.1)<1e-8,'one hand translates model');
controllers[0].quaternion.setFromAxisAngle(new T.Vector3(0,1,0),.3);tick();
assert(root.parent.quaternion.angleTo(new T.Quaternion())>0,'one hand rotates model');
controllers[1].dispatchEvent({type:'squeezestart'});tick();const oldScale=root.parent.scale.x;
controllers[0].position.x-=.1;controllers[1].position.x+=.1;tick();
assert(root.parent.scale.x>oldScale,'two hands enlarge model');
const beforeTurn=root.parent.quaternion.clone();controllers[1].position.z+=.2;tick();assert(root.parent.quaternion.angleTo(beforeTurn)>.01,'two hands rotate model');
controllers[0].dispatchEvent({type:'squeezeend'});controllers[1].dispatchEvent({type:'squeezeend'});
// Point directly at a device: open its in-world settings, without grabbing.
panel.visible=false;scene.getObjectByName('left-palm-menu').visible=false;controllers[0].position.set(10,1,0);controllers[0].quaternion.identity();scene.updateMatrixWorld(true);clock+=1000;controllers[0].dispatchEvent({type:'selectstart'});assert.equal(pickedDevice,'purifier');assert(panel.visible);assert(panel.children.some(m=>m.userData.title?.includes('● Air purifier')));controllers[0].dispatchEvent({type:'selectend'});

await session.end();assert(!xr.active);assert.equal(root.parent,scene);assert.deepEqual(root.position.toArray(),[-30,2,-20]);assert.equal(controls.enabled,true);assert.equal(sky.visible,true);
await elements.get('enter-ar').onclick();assert(xr.active);assert(panel.visible,'panel opens again on reentry');await session.end();console.log('PASS automatic panel startup, controller panel movement/rotation, palm-up launcher, right-finger touch, floor selection, stationary default, explicit move/lock, palm-down, controller selection, session restore and reentry');

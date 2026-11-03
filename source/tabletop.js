import * as T from 'three';
export function installTabletop({renderer,scene,root,sky,ground,grid,controls,getCamera,span,floors,setFloor,heatmap,prepare,restore}){
 const button=document.getElementById('enter-ar'), pivot=new T.Group(),panel=new T.Group(),buttons=[],inputs=[];scene.add(pivot,panel);panel.visible=false;
 let session=null,first=false,saved=null,drag=null,hitSource=null,placing=false;const ray=new T.Raycaster(),reticle=new T.Mesh(new T.RingGeometry(.07,.085,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x44ffcc}));scene.add(reticle);reticle.visible=false;reticle.matrixAutoUpdate=false;
 let tab='floors',activeFloor='all',floorPage=0,movingPanel=false,follow=false,menuOpen=false,snapPanel=true,palmUp=false,touchLatch=false,lastTouch=-Infinity,lastTime=0;
 let panelPlaced=false;
 let voiceRevision=-1,voiceTranscript=0;
 function voice(){try{return window.parent.CognitiveVoice;}catch{return null;}}
 let chatDraft='',chatPage=0,chatRevision=-1,chatBusy=false,chatError='',caps=false;
 function assistant(){try{return window.parent.CognitiveAssistant;}catch{return null;}}
 async function sendChat(){if(chatBusy||!chatDraft.trim())return;const q=chatDraft;const api=assistant();if(!api){chatError='Assistant unavailable. Open the app from index.html.';renderPanel();return;}chatDraft='';chatBusy=true;chatError='';chatPage=0;renderPanel();try{await api.ask(q);}catch(e){chatError=e.message;}finally{chatBusy=false;chatPage=0;renderPanel();}}
 function textBlock(text,y,h){
  const cv=document.createElement('canvas');cv.width=1100;cv.height=Math.round(h*1900);const c=cv.getContext('2d');c.fillStyle='#ffffff';rounded(c,0,0,cv.width,cv.height,20);c.fillStyle='#193543';c.font='26px sans-serif';
  let lines=[];for(const para of String(text).split('\n')){let line='';for(const ch of para){if(c.measureText(line+ch).width>1036){lines.push(line);line='';}line+=ch;}lines.push(line);}
  lines.slice(0,Math.floor((cv.height-24)/33)).forEach((l,i)=>c.fillText(l,26,35+i*33));const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(.58,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}));m.position.set(0,y,.006);panel.add(m);return lines;
 }
 let headPosition=new T.Vector3(),headOrientation=new T.Quaternion();
 function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function card(text,action,x,y,w=.27,h=.065,{active=false,muted=false,danger=false,subtitle=''}={}){
  const canvas=document.createElement('canvas');canvas.width=Math.round(w*1500);canvas.height=Math.round(h*1500);const c=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide,toneMapped:false}));m.position.set(x,y,.006);m.userData.action=action;m.userData.title=text;
  m.userData.draw=(hover=false)=>{c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle=danger?(hover?'#ffe0dc':'#fff0ed'):active?'#155f57':hover?'#dceeea':muted?'#e8eef2':'#ffffff';rounded(c,0,0,canvas.width,canvas.height,16);c.fillStyle=active?'#ffffff':danger?'#a13e39':'#193543';c.textAlign='center';c.font='600 '+Math.min(26,canvas.height*.32)+'px sans-serif';let line=text;while(c.measureText(line).width>canvas.width-26&&line.length>3)line=line.slice(0,-2)+'…';c.fillText(line,canvas.width/2,canvas.height*(subtitle?.43:.61));if(subtitle){c.font='18px sans-serif';c.fillStyle=active?'#c6e7dc':'#6a7d86';c.fillText(subtitle,canvas.width/2,canvas.height*.78);}tex.needsUpdate=true;};m.userData.draw();panel.add(m);if(action)buttons.push(m);return m;
 }
 function clearPanel(){buttons.length=0;for(const m of [...panel.children]){m.geometry.dispose();m.material.map?.dispose();m.material.dispose();panel.remove(m);}}
 function renderPanel(){clearPanel();
  const cv=document.createElement('canvas');cv.width=960;cv.height=tab==='ai'?1650:1120;const c=cv.getContext('2d');c.fillStyle='#edf2f4';rounded(c,0,0,960,cv.height,44);c.fillStyle='#13313d';c.textAlign='left';c.font='bold 45px sans-serif';c.font='bold 36px sans-serif';c.fillText('CognitiveTwinXR',52,78);c.font='23px sans-serif';c.fillStyle='#617986';c.fillText('BUILDING EXPLORER',52,115);c.fillStyle='#218876';c.beginPath();c.arc(875,74,9,0,Math.PI*2);c.fill();c.font='21px sans-serif';c.fillStyle='#627b85';c.fillText('Touch a card or point + pinch',52,cv.height-60);c.fillText('Move panel: look to position, tap to lock',52,cv.height-30);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const bg=new T.Mesh(new T.PlaneGeometry(.64,tab==='ai'?1.10:.747),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide,toneMapped:false}));bg.position.y=tab==='ai'?-.497:-.32;panel.add(bg);
  ['floors','model','data','equipment','ai'].forEach((t,i)=>card(t==='floors'?'Floors':t==='model'?'Model':t==='data'?'Sensors':t==='equipment'?'Devices':'AI chat',()=>{tab=t;renderPanel();},(i-2)*.12,-.07,.114,.048,{active:tab===t}));
  if(tab==='floors'){
   card('Choose a level',null,0,-.132,.56,.047,{muted:true});
   const list=floors.slice(floorPage*8,floorPage*8+8);list.forEach((f,i)=>card(f.name,()=>{activeFloor=f.id;setFloor(f.id);renderPanel();},i%2? .147:-.147,-.211-Math.floor(i/2)*.085,.278,.073,{active:activeFloor===f.id,subtitle:f.id==='all'?'Complete model':'Isolate level'}));
   if(floors.length>8){card('Previous',()=>{floorPage=Math.max(0,floorPage-1);renderPanel();},-.147,-.54,.278,.05);card('Next',()=>{floorPage=Math.min(Math.ceil(floors.length/8)-1,floorPage+1);renderPanel();},.147,-.54,.278,.05);}
  }else if(tab==='model'){
   const actions=[['− Smaller',()=>scale(.85)],['+ Larger',()=>scale(1.15)],['↶ Rotate left',()=>pivot.rotation.y-=.25],['↷ Rotate right',()=>pivot.rotation.y+=.25],['↑ Raise',()=>pivot.position.y+=.1],['↓ Lower',()=>pivot.position.y-=.1],['Recenter',()=>first=true],['Place on surface',()=>{placing=!placing;renderPanel();}]];
   actions.forEach(([t,f],i)=>card(t,f,i%2?.147:-.147,-.174-Math.floor(i/2)*.083,.278,.068,{active:t==='Place on surface'&&placing}));
   card('Tabletop size · 85 cm',()=>pivot.scale.setScalar(.85/span),0,-.522,.572,.055);
  }else if(tab==='data'){
   card('Simulated room readings',null,0,-.132,.56,.047,{muted:true});
   Array.from(heatmap.options).forEach((o,i)=>card(o.textContent,()=>{heatmap.selectedIndex=i;heatmap.dispatchEvent(new Event('change'));renderPanel();},0,-.201-i*.07,.572,.059,{active:heatmap.selectedIndex===i}));
  }
  if(tab==='equipment'){
   const eq=window.cognitiveTwin?.getEquipment();
   card('Room 110 · SIMULATED',()=>window.cognitiveTwin?.focusEquipment(),0,-.14,.57,.055,{subtitle:'Tap to show Lab1'});
   if(eq?.available)eq.devices.forEach((d,i)=>{const y=-.222-i*.073;
    card(d.name+' · '+d.level,()=>{window.cognitiveTwin.controlEquipment({room:'110',device:d.id,action:d.on?'off':'on'});renderPanel();},-.08,y,.40,.06,{active:d.on});
    card('−',()=>{window.cognitiveTwin.controlEquipment({room:'110',device:d.id,action:'set',level:Math.max(0,d.level-1)});renderPanel();},.163,y,.065,.06);
    card('+',()=>{window.cognitiveTwin.controlEquipment({room:'110',device:d.id,action:'set',level:Math.min(10,d.level+1)});renderPanel();},.244,y,.065,.06);
   });
   else card('Original BFH model required',null,0,-.25,.57,.07);
   card('All off',()=>{window.cognitiveTwin?.controlEquipment({room:'110',device:'all',action:'off'});renderPanel();},0,-.53,.57,.05);
  }
  if(tab==='ai'){
   const state=assistant()?.state(),messages=state?.messages||[];
   const latest=messages.slice(-2).map(m=>(m.role==='user'?'You: ':'AI: ')+m.text).join('\n\n');
   const content=chatError||latest||'Ask about floors, rooms, components or sensor readings. Use the keyboard below.';
   // Paginate without discarding long answers or IDs.
   const measure=document.createElement('canvas').getContext('2d');measure.font='26px sans-serif';const lines=[];for(const para of content.split('\n')){let line='';for(const ch of para){if(measure.measureText(line+ch).width>1000){lines.push(line);line='';}line+=ch;}lines.push(line);}const chunks=[];for(let i=0;i<lines.length;i+=10)chunks.push(lines.slice(i,i+10).join('\n'));if(!chunks.length)chunks.push('');chatPage=Math.min(chatPage,chunks.length-1);
   textBlock(chunks[chatPage],-.215,.218);
   card('Back',()=>{chatPage=Math.max(0,chatPage-1);renderPanel();},-.215,-.35,.14,.044);
   card((state?.busy||chatBusy?'Thinking · ':'Page ')+(chatPage+1)+' / '+chunks.length,null,0,-.35,.27,.044,{muted:true});
   card('Next',()=>{chatPage=Math.min(chunks.length-1,chatPage+1);renderPanel();},.215,-.35,.14,.044);
   textBlock(chatDraft.slice(-110)||'Type your question…',-.41,.063);
   ['1234567890','qwertyuiop','asdfghjkl','zxcvbnm?.-'].forEach((row,r)=>Array.from(row).forEach((key,i)=>card(caps?key.toUpperCase():key,()=>{if(chatDraft.length<1000)chatDraft+=caps?key.toUpperCase():key;renderPanel();},(i-(row.length-1)/2)*.058,-.476-r*.052,.053,.046)));
   card('Shift',()=>{caps=!caps;renderPanel();},-.232,-.695,.11,.05,{active:caps});
   card('Space',()=>{if(chatDraft.length<1000)chatDraft+=' ';renderPanel();},-.067,-.695,.21,.05);
   card('Delete',()=>{chatDraft=chatDraft.slice(0,-1);renderPanel();},.109,-.695,.12,.05);
   card(state?.busy||chatBusy?'Stop':'Send',()=>{if(state?.busy||chatBusy)assistant()?.stop();else sendChat();},.239,-.695,.11,.05,{active:true});
   card('Clear chat',()=>{if(!chatBusy&&!state?.busy){assistant()?.clear();chatDraft='';chatError='';chatPage=0;renderPanel();}},-.145,-.751,.28,.042);
   card('Ask about this floor',()=>{chatDraft=activeFloor==='all'?'List all floors and room counts.':'How many doors and windows are on floor '+(floors.find(f=>f.id===activeFloor)?.name||activeFloor)+'?';renderPanel();},.145,-.751,.28,.042);
  }
  if(tab==='ai'){
   const v=voice()?.state();
   card(v?.ready?'Voice ready':'Enable voice',()=>voice()?.enable(),-.222,-.816,.14,.05,{active:v?.ready});
   card(v?.recording?'Finish':'Talk',()=>voice()?.toggle(),-.074,-.816,.14,.05,{active:v?.recording});
   card('Read reply',()=>voice()?.speakLatest(),.074,-.816,.14,.05);
   card('Stop voice',()=>voice()?.stop(),.222,-.816,.14,.05,{danger:true});
   card(v?.autoSpeak?'Auto: on':'Auto: off',()=>voice()?.toggleAuto(),-.222,-.875,.14,.044,{active:v?.autoSpeak});
   card(v?.status||'Enable voice on webpage first',null,.075,-.875,.43,.044,{muted:true});
  }
  const footer=tab==='ai'?-.95:-.605;
  card(movingPanel?'Lock panel':'Move panel',()=>{movingPanel=!movingPanel;snapPanel=movingPanel;drag=null;renderPanel();},-.195,footer,.181,.053,{active:movingPanel});card('Hide',()=>toggleMenu(false),0,footer,.181,.053);card('Exit AR',()=>session?.end(),.195,footer,.181,.053,{danger:true});
 }
 renderPanel();
 const wristButton=card('MENU',()=>toggleMenu(),0,0,.085,.048,{active:true});buttons.splice(buttons.indexOf(wristButton),1);scene.add(wristButton);wristButton.name='left-palm-menu';wristButton.visible=false;
 function toggleMenu(value=!menuOpen){menuOpen=value;panel.visible=value;if(value&&!panelPlaced)snapPanel=true;drag=null;}
 function targets(){return [...(menuOpen?buttons:[]),...(wristButton.visible?[wristButton]:[])];}
 function scale(f){pivot.scale.setScalar(T.MathUtils.clamp(pivot.scale.x*f,.3/span,2/span));}
 function cast(controller){controller.updateWorldMatrix(true,false);ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);panel.updateMatrixWorld(true);return ray.intersectObjects(targets(),false)[0];}
 function start(input){if(!session||touchLatch||performance.now()-lastTouch<450)return;const h=cast(input.c);if(h){h.object.userData.action();return;}if(placing&&reticle.visible){pivot.position.setFromMatrixPosition(reticle.matrix);placing=false;reticle.visible=false;renderPanel();return;}drag={input,origin:input.c.getWorldPosition(new T.Vector3()),position:pivot.position.clone()};}
 for(let i=0;i<2;i++){const c=renderer.xr.getController(i),input={c,source:null};scene.add(c);const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-3)]),new T.LineBasicMaterial({color:0x4de6c5}));c.add(line);c.addEventListener('connected',e=>input.source=e.data);c.addEventListener('disconnected',()=>{input.source=null;if(drag?.input===input)drag=null;});c.addEventListener('selectstart',()=>start(input));c.addEventListener('selectend',()=>{if(drag?.input===input)drag=null;});c.addEventListener('squeezestart',()=>{if(session)drag={input,origin:c.getWorldPosition(new T.Vector3()),position:pivot.position.clone()};});c.addEventListener('squeezeend',()=>{if(drag?.input===input)drag=null;});inputs.push(input);}
 function reset(){if(voice()?.state().recording)voice()?.stop();hitSource?.cancel();hitSource=null;drag=null;placing=false;reticle.visible=false;panel.visible=false;menuOpen=false;follow=false;wristButton.visible=false;palmUp=false;touchLatch=false;lastTouch=-Infinity;scene.add(root);root.position.copy(saved.rootPosition);root.quaternion.copy(saved.rootQuaternion);root.scale.copy(saved.rootScale);pivot.position.set(0,0,0);pivot.rotation.set(0,0,0);pivot.scale.setScalar(1);sky.visible=saved.sky;ground.visible=saved.ground;grid.visible=saved.grid;controls.enabled=saved.controls;getCamera().position.copy(saved.cameraPosition);getCamera().quaternion.copy(saved.cameraQuaternion);renderer.setClearColor(saved.color,saved.alpha);renderer.shadowMap.enabled=saved.shadows;session=null;restore();button.textContent='Tabletop AR';button.disabled=false;}
 button.onclick=async()=>{if(session){await session.end();return;}button.disabled=true;try{const s=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking','hit-test']});session=s;saved={rootPosition:root.position.clone(),rootQuaternion:root.quaternion.clone(),rootScale:root.scale.clone(),sky:sky.visible,ground:ground.visible,grid:grid.visible,controls:controls.enabled,cameraPosition:getCamera().position.clone(),cameraQuaternion:getCamera().quaternion.clone(),color:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),shadows:renderer.shadowMap.enabled};prepare();pivot.add(root);pivot.scale.setScalar(.85/span);sky.visible=ground.visible=grid.visible=false;controls.enabled=false;renderer.shadowMap.enabled=false;renderer.setClearColor(0,0);getCamera().position.set(0,0,0);getCamera().quaternion.identity();renderer.xr.setReferenceSpaceType('local-floor');s.addEventListener('end',reset,{once:true});await renderer.xr.setSession(s);first=true;menuOpen=false;follow=false;movingPanel=false;panelPlaced=false;snapPanel=true;panel.visible=false;renderPanel();button.textContent='Exit AR';button.disabled=false;try{const viewer=await s.requestReferenceSpace('viewer');hitSource=await s.requestHitTestSource({space:viewer});}catch{} }catch(e){if(session){await session.end();}button.disabled=false;button.title=e.message;document.getElementById('notice').hidden=false;document.getElementById('notice').textContent='AR could not start: '+e.message;}};
 if(navigator.xr)navigator.xr.isSessionSupported('immersive-ar').then(ok=>{button.disabled=!ok;}).catch(()=>{});
 function step(frame){if(!session||!frame)return;const vs=voice()?.state();if(tab==='ai'&&vs&&voiceRevision!==vs.revision){voiceRevision=vs.revision;if(vs.transcriptId!==voiceTranscript){voiceTranscript=vs.transcriptId;if(vs.transcriptId)chatDraft=vs.transcript;}renderPanel();}const aiState=assistant()?.state();if(tab==='ai'&&aiState&&chatRevision!==aiState.revision){chatRevision=aiState.revision;chatPage=0;renderPanel();}const ref=renderer.xr.getReferenceSpace(),pose=frame.getViewerPose(ref);if(first&&pose){const p=pose.transform.position,q=pose.transform.orientation;const dir=new T.Vector3(0,0,-1).applyQuaternion(new T.Quaternion(q.x,q.y,q.z,q.w));dir.y=0;dir.normalize();pivot.position.set(p.x+dir.x*1.35,p.y-.9,p.z+dir.z*1.35);pivot.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI+.65;const right=new T.Vector3(-dir.z,0,dir.x);panel.position.copy(pivot.position).addScaledVector(right,.85);panel.position.y=p.y+.1;panel.lookAt(p.x,panel.position.y,p.z);first=false;}
 if(drag&&drag.input.source?.targetRaySpace&&frame.getPose(drag.input.source.targetRaySpace,ref)){const p=drag.input.c.getWorldPosition(new T.Vector3());pivot.position.copy(drag.position).add(p.sub(drag.origin));}
 updateHandMenu(frame,ref,pose);
 const hovered=new Set();for(const input of inputs){if(input.source){const h=cast(input.c);if(h)hovered.add(h.object);}}for(const m of targets()){const h=hovered.has(m);if(m.userData.hover!==h){m.userData.hover=h;m.userData.draw(h);}}
 for(const input of inputs){const axes=input.source?.gamepad?.axes;if(axes?.length>=4){if(Math.abs(axes[2])>.18)pivot.rotation.y-=axes[2]*.025;if(Math.abs(axes[3])>.18)scale(Math.exp(-axes[3]*.018));}}
 reticle.visible=false;if(placing&&hitSource){const h=frame.getHitTestResults(hitSource)[0],p=h?.getPose(ref);if(p){reticle.matrix.fromArray(p.transform.matrix);reticle.visible=true;}}
 }

 function joint(frame,ref,source,name){const space=source?.hand?.get(name);return space&&frame.getJointPose?frame.getJointPose(space,ref):null;}
 function updateHandMenu(frame,ref,pose){
  if(!pose)return;headPosition.copy(pose.transform.position);headOrientation.copy(pose.transform.orientation);
  const now=performance.now(),dt=Math.min(.1,(now-lastTime)/1000||.016);lastTime=now;
  const sources=Array.from(session.inputSources||inputs.map(i=>i.source).filter(Boolean));
  const left=sources.find(s=>s.handedness==='left');
  const palm=joint(frame,ref,left,'middle-finger-metacarpal')||joint(frame,ref,left,'wrist');
  wristButton.visible=false;
  if(palm){const normal=new T.Vector3(0,-1,0).applyQuaternion(new T.Quaternion().copy(palm.transform.orientation));palmUp=normal.y>(palmUp?.15:.4);if(palmUp){wristButton.position.copy(palm.transform.position).addScaledVector(normal,.055);wristButton.lookAt(headPosition);wristButton.visible=true;}}
  else {palmUp=false;if(left&&!left.hand){const p=left.gripSpace&&frame.getPose(left.gripSpace,ref);if(p){wristButton.position.copy(p.transform.position).add(new T.Vector3(0,.085,0));wristButton.lookAt(headPosition);wristButton.visible=true;}}}
  // A small fallback launcher remains available when no left input is tracked.
  if(!left){wristButton.position.copy(headPosition).add(new T.Vector3(-.28,-.24,-.6).applyQuaternion(headOrientation));wristButton.lookAt(headPosition);wristButton.visible=true;}
  const tips=sources.filter(s=>s.handedness==='right').map(s=>joint(frame,ref,s,'index-finger-tip')).filter(Boolean).map(p=>new T.Vector3().copy(p.transform.position));
  let nearPanel=false,contact=null;scene.updateMatrixWorld(true);
  for(const tip of tips){if(menuOpen){const v=panel.worldToLocal(tip.clone());nearPanel ||= Math.abs(v.x)<.4&&v.y<.12&&v.y>(tab==='ai'?-1.05:-.74)&&Math.abs(v.z)<.16;}
   for(const m of targets()){const v=m.worldToLocal(tip.clone()),g=m.geometry.parameters;if(Math.abs(v.x)<g.width/2&&Math.abs(v.y)<g.height/2&&v.z>-.018&&v.z<.018){contact=m;break;}}
  }
  if(!contact)touchLatch=false;
  if(contact&&!touchLatch&&now-lastTouch>450){touchLatch=true;lastTouch=now;drag=null;contact.userData.action();}
  if(menuOpen&&(snapPanel||(movingPanel&&!nearPanel&&!touchLatch))){const dir=new T.Vector3(0,0,-1).applyQuaternion(headOrientation);dir.y=0;if(dir.lengthSq()<.01)dir.set(0,0,-1);dir.normalize();const right=new T.Vector3(-dir.z,0,dir.x);const target=headPosition.clone().addScaledVector(dir,.67).addScaledVector(right,-.34);target.y=headPosition.y+.08;
   panel.position.lerp(target,snapPanel?1:1-Math.exp(-dt*5));panel.lookAt(headPosition.x,panel.position.y,headPosition.z);snapPanel=false;panelPlaced=true;
  }
  for(const input of inputs){const pressed=!!input.source?.gamepad?.buttons?.[4]?.pressed;if(input.source?.handedness==='left'&&pressed&&!input.menuPressed)toggleMenu();input.menuPressed=pressed;}
 }
 return {step,get active(){return !!session;}};
}

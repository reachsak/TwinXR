import * as T from 'three';
import {createEquipmentState,deviceNames,ROOM_GUID} from '../equipment-state.mjs';
export function installEquipment({root,rooms,invalidate,getFloor,focusRoom,isXR}){
 const room=rooms.get(ROOM_GUID),group=new T.Group();group.name='Room 110 simulated equipment';root.add(group);
 const ui=document.getElementById('equipment-panel'),launch=document.getElementById('equipment-open');
 const state=createEquipmentState(!!room,changed);let demoOpen=false,lastTime=0;
 const readings={temperature:24.5,lux:80,pm25:28,humidity:36};
 const visual={},localBox=room?.box.clone().translate(root.position.clone().negate());
 const mat=(color,other={})=>new T.MeshStandardMaterial({color,roughness:.4,metalness:.15,...other});
 function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
 function box(parent,w,h,d,material,x=0,y=0,z=0){return mesh(parent,new T.BoxGeometry(w,h,d),material,x,y,z);}
 function label(parent,text,y){const cv=document.createElement('canvas');cv.width=512;cv.height=112;const c=cv.getContext('2d');c.fillStyle='#112b39';c.beginPath();c.roundRect(0,0,512,112,24);c.fill();c.fillStyle='white';c.font='600 37px sans-serif';c.textAlign='center';c.fillText(text,256,69);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));s.scale.set(1.65,.36,1);s.position.y=y;s.renderOrder=9;parent.add(s);}
 if(room){
  const b=localBox,w=b.max.x-b.min.x,d=b.max.z-b.min.z;
  const positions=[[.26,.30],[.72,.30],[.26,.72],[.72,.72]];
  Object.keys(deviceNames).forEach((id,i)=>{
   const g=new T.Group();g.position.set(b.min.x+w*positions[i][0],b.min.y+.12,b.min.z+d*positions[i][1]);group.add(g);
   const body=mat(0xe3ebef),dark=mat(0x243744),metal=mat(0x82909d),signal=mat(0x111820,{emissive:0x000000});
   const base=mesh(g,new T.CylinderGeometry(.64,.7,.08,40),dark,0,.04,0);
   const ring=mesh(g,new T.TorusGeometry(.64,.035,8,48),signal,0,.10,0);ring.rotation.x=Math.PI/2;
   const effects=new T.Group();g.add(effects);let bulb,fan,light,pool;
   if(id==='light'){
    mesh(g,new T.CylinderGeometry(.2,.3,.17,24),metal,0,.17,0);mesh(g,new T.CylinderGeometry(.05,.05,.9,16),metal,0,.67,0);
    mesh(g,new T.CylinderGeometry(.17,.11,.24,24),dark,0,1.2,0);
    bulb=mesh(g,new T.SphereGeometry(.27,24,16),mat(0xb7c0c7,{emissive:0xffd479,emissiveIntensity:0}),0,1.48,0);
    light=new T.PointLight(0xffd99a,0,Math.max(w,d)*1.5,2);light.position.set(0,2.1,0);g.add(light);
    pool=mesh(g,new T.CircleGeometry(Math.min(w,d)*.4,48),new T.MeshBasicMaterial({color:0xffdc8d,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),0,.11,0);pool.rotation.x=-Math.PI/2;
   }else if(id==='ac'){
    box(g,1.25,.57,.43,body,0,1.15,0);box(g,1.13,.2,.035,dark,0,1.01,.23);
    for(let k=0;k<5;k++)box(g,1.08,.017,.05,metal,0,.94+k*.035,.26);
    box(g,.07,.06,.02,signal,.48,1.24,.23);box(g,.12,.72,.12,metal,0,.48,0);
   }else if(id==='purifier'){
    mesh(g,new T.CylinderGeometry(.34,.4,1.05,32),body,0,.67,0);
    for(let k=0;k<11;k++)mesh(g,new T.TorusGeometry(.36,.014,6,32),dark,0,.28+k*.064,0).rotation.x=Math.PI/2;
    fan=new T.Group();fan.position.y=1.21;g.add(fan);for(let k=0;k<4;k++){const blade=box(fan,.43,.025,.09,metal,.12,0,0);blade.rotation.y=k*Math.PI/2;blade.position.set(Math.cos(k*Math.PI/2)*.13,0,Math.sin(k*Math.PI/2)*.13);}
    mesh(g,new T.SphereGeometry(.05,12,8),signal,0,1,.35);
   }else{
    mesh(g,new T.CylinderGeometry(.34,.43,.55,32),body,0,.4,0);
    mesh(g,new T.CylinderGeometry(.3,.34,.4,32),mat(0x70c9db,{transparent:true,opacity:.62}),0,.85,0);
    mesh(g,new T.CylinderGeometry(.12,.25,.2,24),dark,0,1.12,0);mesh(g,new T.SphereGeometry(.06,12,8),signal,0,.5,.4);
   }
   if(id!=='light')for(let n=0;n<18;n++){
    const p=mesh(effects,id==='ac'?new T.BoxGeometry(.025,.025,.22):new T.SphereGeometry(id==='purifier'?.045:.075,8,6),new T.MeshBasicMaterial({color:id==='ac'?0x55ccff:id==='purifier'?0x7af5c8:0xd6f6ff,transparent:true,opacity:.55,depthWrite:false}));p.userData.phase=n/18;
   }
   label(g,deviceNames[id],id==='light'?2.15:1.8);visual[id]={g,signal,effects,bulb,fan,light,pool,lightRange:light?.distance};
  });
  launch.onclick=focus;
 }else{launch.disabled=true;launch.title='Available with the original BFH Room 110 only';}
 const cards=document.getElementById('equipment-cards');
 for(const [id,name] of Object.entries(deviceNames)){
  const card=document.createElement('div');card.className='equipment-card';card.innerHTML=`<div><strong>${name}</strong><output id="eq-${id}-value">Off · 0</output></div><input id="eq-${id}" aria-label="${name} level" type="range" min="0" max="10" step="1" value="0"><button id="eq-${id}-toggle" type="button">Turn on</button>`;cards.append(card);
  card.querySelector('input').oninput=e=>state.control({room:'110',device:id,action:'set',level:Number(e.target.value)});
  card.querySelector('button').onclick=()=>state.control({room:'110',device:id,action:state.levels[id]?'off':'on'});
 }
 document.getElementById('equipment-all-off').onclick=()=>state.control({room:'110',device:'all',action:'off'});
 document.getElementById('equipment-demo').onclick=()=>state.control({room:'110',device:'all',action:'set',level:7});
 document.getElementById('equipment-close').onclick=()=>{demoOpen=false;ui.hidden=true;room&&(room.mat.opacity=.36);invalidate();};
 function focus(){if(!room)return;demoOpen=true;focusRoom(room);ui.hidden=false;document.getElementById('details').scrollTop=0;room.mat.opacity=.045;changed();}
 function changed(){
  for(const [id,v]of Object.entries(visual)){const level=state.levels[id],on=level>0;v.signal.color.set(on?0x43dba4:0x141a20);v.signal.emissive.set(on?0x14bd7d:0);v.signal.emissiveIntensity=on?.6:0;v.effects.visible=on;
   if(v.bulb){v.bulb.material.color.set(on?0xffe4ad:0x778089);v.bulb.material.emissiveIntensity=level*.24;v.light.intensity=level*12;v.pool.material.opacity=level*.022;}
   const out=document.getElementById('eq-'+id+'-value');out.textContent=on?'On · '+level+'/10':'Off · 0';document.getElementById('eq-'+id).value=level;document.getElementById('eq-'+id+'-toggle').textContent=on?'Turn off':'Turn on';
  }
  const event=state.snapshot().events.at(-1);document.getElementById('equipment-event').textContent=event?event.devices.map(d=>deviceNames[d.id]+': '+(d.level?d.level+'/10':'off')).join(' · '):'Ready. Choose a device or ask the AI.';invalidate();
 }
 function step(now){const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;group.visible=!!room&&(getFloor()==='all'||getFloor()===room.el.floor);
  const levels=state.levels;
  const targets={temperature:24.5-levels.ac*.55,lux:80+levels.light*72,pm25:28-levels.purifier*2.3,humidity:36+levels.humidifier*2.1};
  for(const k of Object.keys(readings))readings[k]+=(targets[k]-readings[k])*(1-Math.exp(-dt/(k==='lux'?.6:16)));
  if(room&&demoOpen)room.mat.opacity=.045;
  for(const [id,v] of Object.entries(visual)){if(v.light){const scale=root.getWorldScale(new T.Vector3()).x;v.light.intensity=levels[id]*12*scale*scale;v.light.distance=v.lightRange*scale;}if(!levels[id])continue;if(v.fan)v.fan.rotation.y+=dt*levels[id]*2;
   for(const p of v.effects.children){const t=(now*.00012*(1+levels[id]*.3)+p.userData.phase)%1,a=p.userData.phase*Math.PI*8;
    p.position.set(Math.sin(a)*.28*(1+t),id==='ac'?1.02-.22*t:1.22+t*1.35,id==='ac'?.3+t*1.5:Math.cos(a)*.28*t);p.material.opacity=(1-t)*(.16+levels[id]*.055);p.scale.setScalar(id==='humidifier'?.5+t*2:1);}
  }
  document.getElementById('equipment-readings').textContent=`${readings.temperature.toFixed(1)} °C · ${Math.round(readings.lux)} lx · PM2.5 ${readings.pm25.toFixed(1)} µg/m³ · RH ${readings.humidity.toFixed(1)}%`;
  if(group.visible&&Object.values(levels).some(Boolean))invalidate();
 }
 changed();
 return {focus,step,get:()=>({...state.snapshot(),demoReadings:{...readings,source:'equipment simulation',note:'Illustrative response, not measured performance or real telemetry.'}}),control:a=>{const result=state.control(a);if(!demoOpen||getFloor()!==room.el.floor)focus();return {...result,demoReadings:{...readings}};}};
}

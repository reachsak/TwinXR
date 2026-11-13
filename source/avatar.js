import * as T from 'three';

export function createAvatar(panel, voice, assistant) {
  const group = new T.Group();
  group.position.set(-.41, -.06, .025);
  panel.add(group);
  const robot = new T.Group();
  group.add(robot);
  function part(geometry, color, x, y, z, glow = false) {
    const material = glow ? new T.MeshBasicMaterial({color}) :
      new T.MeshStandardMaterial({color, roughness: .34, metalness: .18});
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x,y,z);
    robot.add(mesh);
    return mesh;
  }
  part(new T.SphereGeometry(.085,32,20),0xd6dfff,0,0,0);
  part(new T.SphereGeometry(.072,32,20),0x102042,0,.008,.045).scale.set(1,.72,.58);
  for (const x of [-.027,.027]) {
    const eye=part(new T.TorusGeometry(.015,.0035,10,24,Math.PI),0x68edff,x,.01,.083,true);
    eye.rotation.z=0;
  }
  const ring=part(new T.TorusGeometry(.108,.003,8,48),0x78dcff,0,0,0,true);
  ring.rotation.x=1.1;
  const canvas=document.createElement('canvas');
  canvas.width=900;
  canvas.height=520;
  const context=canvas.getContext('2d');
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  const bubble=new T.Mesh(new T.PlaneGeometry(.48,.277),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,toneMapped:false}));
  bubble.position.set(-.09,-.218,0);
  group.add(bubble);
  let messages=[], error='', signature='', generation=0, asking=false;
  function reset() {
    generation++;
    if(asking)assistant()?.stop();
    asking=false;
    messages=[];
    error=signature='';
  }
  function focus(active) {
    group.position.set(active ? .09:-.41,-.06,.025);
    group.scale.setScalar(active?1.28:1);
  }
  async function talk() {
    const v=voice();
    if(!v||v.state().recording||assistant()?.state().busy)return;
    if(v.state().speaking)v.cancelTurn();
    if(v.state().busy)return;
    const current=++generation;
    error='';
    if(!v.state().ready)await v.enable();
    if(current!==generation||!v.state().ready)return;
    await v.toggle(async text=>{
      if(current!==generation)return;
      messages.push({role:'user',text});
      try {
        const api=assistant();
        if(!api)throw Error('Open the app from index.html to connect to Groq.');
        asking=true;
        const answer=await api.ask(text,{speak:false,onEquipment:confirmation=>{
          if(current===generation)messages.push({role:'equipment',text:confirmation});
        }});
        if(current!==generation)return;
        asking=false;
        messages.push({role:'assistant',text:answer});
        await v.speak(answer);
      }catch(e){
        if(current===generation)error=e.message;
      }finally{
        if(current===generation)asking=false;
      }
    },{automatic:true});
  }
  function step(now) {
    robot.position.y=Math.sin(now*.002)*.008;
    ring.rotation.z=now*.0007;
    const state=voice()?.state();
    const status=error||(asking?'Thinking…':state?.recording?'Listening…':state?.speaking?'Speaking · trigger to interrupt':state?.busy||!state?.ready?state?.status:(state?.status?.startsWith('Ready')?'Trigger robot to talk':state?.status))||'Voice assistant';
    const next=JSON.stringify([messages,status]);
    if(next===signature)return;
    signature=next;
    context.clearRect(0,0,900,520);
    function fill(x,y,w,h,color){
      context.fillStyle=color;
      context.beginPath();
      context.roundRect(x,y,w,h,24);
      context.fill();
    }
    fill(0,0,900,520,'#102039');
    context.font='bold 34px sans-serif';
    context.fillStyle='#ecf6ff';
    context.fillText('Building AI',32,48);
    context.font='25px sans-serif';
    context.fillStyle='#9de8ff';
    context.fillText(status,32,87,836);
    context.save();
    context.beginPath();
    context.rect(0,106,900,399);
    context.clip();
    context.font='30px sans-serif';
    const conversation=messages.length?messages.slice(-10):[{role:'assistant',text:'Try “Turn on the Room 110 air purifier” or “List the building floors.”'}];
    let bottom=500;
    for(const message of conversation.slice().reverse()){
      const content=message.text.replace(/[`*_#]/g,'');
      const lines=[];
      let row='';
      for(const word of content.split(/\s+/)){
        const next=row?row+' '+word:word;
        if(row&&context.measureText(next).width>630){lines.push(row);row=word;}
        else row=next;
      }
      if(row)lines.push(row);
      const visible=lines.slice(0,message.role==='assistant'?6:3);
      if(visible.length<lines.length)visible[visible.length-1]+=' …';
      const width=Math.min(680,Math.max(150,...visible.map(line=>context.measureText(line).width+40)));
      const height=visible.length*36+24;
      const left=message.role==='user'?868-width:32;
      const top=bottom-height;
      if(top<106)break;
      fill(left,top,width,height,message.role==='user'?'#1761bb':message.role==='equipment'?'#155747':'#29415d');
      context.fillStyle='#ffffff';
      visible.forEach((line,i)=>context.fillText(line,left+20,top+36+i*36,width-40));
      bottom=top-12;
    }
    context.restore();
    texture.needsUpdate=true;
  }
  return {targets:[...robot.children,bubble],talk,step,reset,focus};
}

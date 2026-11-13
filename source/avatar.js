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
  let submitted='', reply='', error='', busy=false, signature='', generation=0;
  function reset() {
    generation++;
    submitted=reply=error=signature='';
    busy=false;
  }
  async function talk() {
    const v=voice();
    if (!v||busy||v.state().busy||assistant()?.state().busy) return;
    const current=generation;
    try {
      error='';
      if (!v.state().ready) await v.enable();
      if (current!==generation||!v.state().ready) return;
      await v.toggle(async text=>{
        if (current!==generation) return;
        submitted=text;
        reply='';
        busy=true;
        try {
          const api=assistant();
          if (!api) throw Error('Open the app from index.html to connect to Groq.');
          const answer=await api.ask(text,{speak:false});
          if (current!==generation) return;
          reply=answer;
          await v.speak(answer);
        } catch (e) {
          if (current===generation) error=e.message;
        } finally {
          if (current===generation) busy=false;
        }
      });
    } catch (e) {
      if (current===generation) error=e.message;
    }
  }
  function step(now) {
    robot.position.y=Math.sin(now*.002)*.008;
    ring.rotation.z=now*.0007;
    const state=voice()?.state();
    const action=state?.recording?'Finish speaking':busy||state?.busy?'Please wait':'Trigger robot to talk';
    const status=error||state?.status||'Voice assistant';
    const next=JSON.stringify([submitted,reply,action,status]);
    if (next===signature) return;
    signature=next;
    context.clearRect(0,0,900,520);
    context.fillStyle='#142a49';
    context.beginPath();
    context.roundRect(0,0,900,520,40);
    context.fill();
    function lines(value,y,size,color,limit) {
      context.font=size+'px sans-serif';
      context.fillStyle=color;
      let row='';
      const rows=[];
      for(const word of value.split(/\s+/)) {
        if(row&&context.measureText(row+' '+word).width>820) {rows.push(row);row='';}
        row+=(row?' ':'')+word;
      }
      if(row) rows.push(row);
      rows.slice(0,limit).forEach((line,index)=>context.fillText(line+(index===limit-1&&rows.length>limit?' …':''),40,y+index*(size+10)));
    }
    lines('Building AI Assistant',60,40,'#78edff',1);
    lines(action,110,31,'#ffffff',1);
    lines(status,151,25,'#b4d4ef',1);
    if(submitted) lines('You: '+submitted,205,31,'#b4d4ef',2);
    lines(reply||'Try “Turn on the Room 110 air purifier” or “List the building floors.”',submitted?305:220,34,'#ffffff',submitted?4:5);
    texture.needsUpdate=true;
  }
  return {targets:[...robot.children,bubble],talk,step,reset};
}

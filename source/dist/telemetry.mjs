export const metrics={occupancy:'Occupancy (people)',temperature:'Temperature (°C)',co2:'CO₂ (ppm)',humidity:'Humidity (%)',power:'HVAC power (kW)',energy:'Interval energy (kWh)',lux:'Brightness (lux)',pm25:'PM₂.₅ (µg/m³)'};
export const scenarios={
 after_hours:'After-hours HVAC', ventilation:'Occupied CO₂ buildup', humidity:'High humidity', peak:'Morning demand spike',
 daylight:'Daylight and lighting', particulate:'Particulate spike', comfort:'Afternoon overheating', gaps:'Missing telemetry',
 flatline:'Temperature sensor flatline', efficient:'Occupied-only HVAC schedule', weekend:'Weekend schedule mismatch', cycling:'Frequent HVAC cycling'
};
const names=Object.keys(metrics);
export function parseHistory(csv){
 const [header,...lines]=csv.trim().split(/\r?\n/);
 if(header!=='timestamp,'+names.join(','))throw Error('Unexpected telemetry CSV header.');
 let last=-Infinity;
 return lines.filter(Boolean).map(line=>{
  const [stamp,...values]=line.split(',');
  const time=Date.parse(stamp);
  if(!Number.isFinite(time)||time<=last||values.length!==names.length)throw Error('Invalid telemetry CSV row.');
  last=time;
  return {time,...Object.fromEntries(names.map((key,i)=>[key,values[i].trim()===''||!Number.isFinite(Number(values[i]))?null:Number(values[i])]))};
 });
}
export function summarize(rows, keys){
 const result={samples:rows.length, metrics:{}};
 for(const key of keys){
  const valid=rows.filter(r=>Number.isFinite(r[key]));
  if(!valid.length){result.metrics[key]={samples:0,missing:rows.length};continue;}
  const peak=valid.reduce((a,b)=>a[key]>=b[key]?a:b);
  const total=valid.reduce((sum,row)=>sum+row[key],0);
  result.metrics[key]={samples:valid.length,missing:rows.length-valid.length,min:Math.min(...valid.map(r=>r[key])),max:peak[key],peakAt:new Date(peak.time).toISOString(),average:+(total/valid.length).toFixed(2),...(key==='energy'?{total:+total.toFixed(3)}:{})};
 }
 const vacant=[];
 for(const row of rows){
  if(row.occupancy!==0)continue;
  let last=vacant.at(-1);
  if(!last||last.end!==row.time){last={start:row.time,end:row.time,energy:0,samples:0,energySamples:0};vacant.push(last);}
  last.end=row.time+900000;last.samples++;
  if(Number.isFinite(row.energy)){last.energy+=row.energy;last.energySamples++;}
 }
 result.vacancy=vacant.map(({start,end,energy,samples,energySamples})=>({start:new Date(start).toISOString(),end:new Date(end).toISOString(),energyKWh:+energy.toFixed(3),energySamples,samples}));
 result.occupiedEnergyKWh=+rows.filter(r=>r.occupancy>0&&Number.isFinite(r.energy)).reduce((sum,r)=>sum+r.energy,0).toFixed(3);
 const intervals=(predicate)=>{
  const runs=[];
  for(const row of rows){
   if(!predicate(row))continue;
   const last=runs.at(-1);
   if(last?.end===row.time)last.end+=900000;
   else runs.push({start:row.time,end:row.time+900000});
  }
  return runs.map(({start,end})=>({start:new Date(start).toISOString(),end:new Date(end).toISOString()}));
 };
 result.screening={
  occupiedCO2Above1000:intervals(r=>r.occupancy>0&&r.co2>1000),
  humidityAbove60:intervals(r=>r.humidity>60),
  occupiedTemperatureAbove25:intervals(r=>r.occupancy>0&&r.temperature>25),
  particulateAbove35:intervals(r=>r.pm25>35),
  brightOccupiedPeriods:intervals(r=>r.occupancy>0&&r.lux>800),
  largeAdjacentPowerChanges:rows.filter((r,i)=>i>0&&r.time-rows[i-1].time===900000&&Number.isFinite(r.power)&&Number.isFinite(rows[i-1].power)&&Math.abs(r.power-rows[i-1].power)>=2).length
 };
 result.expectedSamples=96;result.missingIntervals=Math.max(0,96-rows.length);
 return result;
}
const scenariosList=Object.keys(scenarios);
let selected='after_hours', rows=[], mode='live', keys=['occupancy','power'], live=null, connection='', liveError='', sequence=0;
const date=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'});
const timeLabel=t=>date.format(t);
const cache=new Map();
async function history(id){
 if(!scenariosList.includes(id))throw Error('Choose a Room 110 scenario.');
 if(!cache.has(id)){
  const response=await fetch(new URL('telemetry-data/'+id+'.csv',import.meta.url));
  if(!response.ok)throw Error('Room 110 history unavailable.');
  cache.set(id,parseHistory(await response.text()));
 }
 return cache.get(id);
}
function readings(){
 if(connection)return {source:'External Room 110 feed',timestamp:live?.timestamp??null,stale:!live||Date.now()-Date.parse(live.timestamp)>60000,values:live?.values??{},error:liveError||undefined};
 const row=rows.at(Math.floor(Date.now()/5000)%rows.length);
 return {source:'Room 110 demo feed',timestamp:new Date(Math.floor(Date.now()/5000)*5000).toISOString(),stale:false,values:Object.fromEntries(names.map(key=>[key,row?.[key]??null]))};
}
async function refresh(){
 const url=connection,token=sequence;
 if(!url)return;
 try{
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error('Feed unavailable.');
  const data=await response.json();
  if(!Number.isFinite(Date.parse(data.timestamp))||!data.values||typeof data.values!=='object')throw Error('Feed format invalid.');
  const values=Object.fromEntries(names.map(key=>[key,Number.isFinite(data.values[key])?data.values[key]:null]));
  if(token===sequence){live={timestamp:new Date(data.timestamp).toISOString(),values};liveError='';}
 }catch(error){if(token===sequence)liveError=error.message;}
}
function schema(name,description,properties={}){
 return {type:'function',function:{name,description,parameters:{type:'object',properties:{room:{type:'string',enum:['110']},...properties},required:[],additionalProperties:false}}};
}
const scenario={type:'string',enum:scenariosList};
const variables={type:'array',items:{type:'string',enum:names},minItems:1,maxItems:4};
export const telemetryTools=[
 schema('show_live_dashboard','Open the Room 110 dashboard and return latest readings, source and staleness. Room 110 is the only configured room.'),
 schema('close_telemetry_dashboard','Close the floating telemetry dashboard.'),
 schema('get_live_telemetry','Read the current Room 110 telemetry without opening the dashboard.'),
 schema('list_telemetry_scenarios','List available 24-hour Room 110 demo CSV scenarios.'),
 schema('analyze_room_history','Calculate statistics, peak times, vacancy periods and energy from the selected 24-hour Room 110 demo CSV.',{scenario,variables}),
 schema('plot_room_history','Open charts for up to four variables in the selected 24-hour Room 110 demo CSV.',{scenario,variables})
];
export async function executeTelemetry(name,args={}){
 if(args.room!==undefined&&args.room!=='110')throw Error('Telemetry is configured for Room 110 only.');
 if(name==='close_telemetry_dashboard'){close();return {closed:true};}
 if(name==='list_telemetry_scenarios')return scenarios;
 if(name==='show_live_dashboard'||name==='get_live_telemetry'){
  if(!rows.length)rows=await history(selected);
  if(name==='show_live_dashboard'){mode='live';open();}
  const current=readings();
 return {room:'110',units:metrics,...current};
 }
 if(!['analyze_room_history','plot_room_history'].includes(name))throw Error('Unknown telemetry tool.');
 const id=args.scenario??selected;
 const fields=args.variables??(name==='plot_room_history'?['occupancy','power']:names);
 if(!Array.isArray(fields)||!fields.length||(args.variables&&fields.length>4)||fields.some(key=>!names.includes(key)))throw Error('Choose valid telemetry variables.');
 const data=await history(id);
 if(name==='plot_room_history'){selected=id;rows=data;keys=[...new Set(fields)];mode='history';open();}
 return {room:'110',source:'Room 110 demo CSV',scenario:scenarios[id],timeZone:'America/Chicago',intervalMinutes:15,units:metrics,...summarize(data,fields)};
}

let dashboard, canvas, select, input, status, visible=false, revision=0;
function open(){visible=true;dashboard.hidden=false;select.value=selected;paint();revision++;}
function close(){visible=false;dashboard.hidden=true;revision++;}
function paint(){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.fillStyle='#10263c';c.fillRect(0,0,w,h);
 const label=(text,x,y,size=24,color='#e7f4ff')=>{c.font=size+'px sans-serif';c.fillStyle=color;c.fillText(text,x,y);};
 label('Room 110  ·  '+(mode==='live'?'Live readings':scenarios[selected]),34,55,38);
 if(mode==='live'){
  const latest=readings();
  label(latest.source+'  ·  '+(latest.timestamp?timeLabel(Date.parse(latest.timestamp))+' CT':'Awaiting data')+(latest.stale?'  ·  Stale':''),34,94,23,'#9ed7ec');
  if(latest.error)label(latest.error,34,124,20,'#ffd3ab');
  names.forEach((key,i)=>{
   const x=34+(i%2)*460,y=160+Math.floor(i/2)*104;
   c.fillStyle='#203c55';c.fillRect(x,y,424,86);
   label(metrics[key],x+16,y+27,23);
   label(latest.values[key]??'Unavailable',x+16,y+65,32,'#77e4ce');
  });
 }else{
  label('24-hour demo CSV  ·  Central Time',34,94,23,'#9ed7ec');
  const height=420/keys.length;
  keys.forEach((key,i)=>{
   const y=126+i*height, top=y+30, bottom=y+height-13, start=Date.UTC(2026,10,12,6), end=start+86400000;
   const values=rows.map(r=>r[key]).filter(Number.isFinite);
   const min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):0;
   label(metrics[key]+'  ·  '+min+' to '+max,34,y+18,20);
   c.strokeStyle='#4bdac5';c.lineWidth=3;c.beginPath();
   let previous;
   for(const row of rows){
    const value=row[key];
    if(!Number.isFinite(value)){previous=undefined;continue;}
    const x=52+(row.time-start)/(end-start)*856,py=bottom-(value-min)/(max-min||1)*(bottom-top);
    if(previous!==undefined&&row.time-previous===900000)c.lineTo(x,py);else c.moveTo(x,py);
    previous=row.time;
   }
   c.stroke();
  });
  for(const [i,t] of ['12 AM','6 AM','12 PM','6 PM','12 AM'].entries())label(t,34+i*213,583,19);
 }
}
export function initTelemetry(){
 dashboard=document.createElement('section');dashboard.hidden=true;dashboard.id='telemetry-dashboard';
 dashboard.innerHTML='<div><button type="button" data-action="live">Live</button> <button type="button" data-action="history">History</button> <select aria-label="Demo scenario"></select> <button type="button" data-action="close">Close</button></div><canvas width="960" height="600" aria-label="Room 110 telemetry dashboard"></canvas><div><label>Live feed URL <input type="url" placeholder="https://…"></label> <button type="button" data-action="connect">Apply feed</button> <span role="status"></span></div>';
 dashboard.style.cssText='position:fixed;z-index:1000;inset:auto 16px 16px auto;width:min(690px,calc(100vw - 32px));max-height:90vh;overflow:auto;padding:12px;background:#10263c;color:white;border-radius:12px;box-shadow:0 4px 25px #0008';
 document.body.append(dashboard);canvas=dashboard.querySelector('canvas');canvas.style.width='100%';select=dashboard.querySelector('select');input=dashboard.querySelector('input');status=dashboard.querySelector('[role=status]');
 for(const [id,title] of Object.entries(scenarios)){const option=document.createElement('option');option.value=id;option.textContent=title;select.append(option);}
 const act=(name,fn)=>dashboard.querySelector('[data-action='+name+']').onclick=()=>Promise.resolve().then(fn).catch(e=>status.textContent=e.message);
 act('live',()=>executeTelemetry('show_live_dashboard'));act('history',()=>executeTelemetry('plot_room_history',{scenario:select.value}));act('close',close);
 select.onchange=()=>executeTelemetry('plot_room_history',{scenario:select.value}).catch(e=>status.textContent=e.message);
 act('connect',async()=>{
  const value=input.value.trim(),url=value?new URL(value,location.href):null;
  if(url&&url.protocol!=='https:'&&url.origin!==location.origin)throw Error('Use an HTTPS feed URL.');
  connection=url?.href||'';sequence++;live=null;liveError='';await refresh();
  status.textContent=connection?(liveError||'External feed selected'):'Demo feed selected';
  await executeTelemetry('show_live_dashboard');
 });
 window.CognitiveTelemetry={open:()=>executeTelemetry('show_live_dashboard'),close,state:()=>({visible,revision,canvas})};
 window.setInterval(async()=>{await refresh();if(visible&&mode==='live'){paint();revision++;}},5000);
}

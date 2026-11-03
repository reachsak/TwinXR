export const ROOM_GUID='1HDi68K_f8gwn3MDKYIP$L';
export const deviceNames={light:'Light bulb',ac:'Air conditioner',purifier:'Air purifier',humidifier:'Humidifier'};
export function createEquipmentState(available=true,onChange=()=>{}){
 const levels={light:0,ac:0,purifier:0,humidifier:0},previous={light:5,ac:5,purifier:5,humidifier:5};let revision=0,events=[];
 const snapshot=()=>({available,room:'110',spaceId:ROOM_GUID,source:'simulation',connectedToBuilding:false,revision,devices:Object.entries(levels).map(([id,level])=>({id,name:deviceNames[id],level,on:level>0})),events:events.slice(-8)});
 function control(a){
  if(!available)throw Error('Room 110 equipment is available only in the original BFH model.');
  if(!a||a.room!=='110')throw Error('Only Room 110 is supported.');
  if(!['on','off','set'].includes(a.action))throw Error('Action must be on, off or set.');
  if(![...Object.keys(levels),'all'].includes(a.device))throw Error('Unknown equipment. Choose light, ac, purifier, humidifier or all.');
  if(a.action==='set'&&(!Number.isInteger(a.level)||a.level<0||a.level>10))throw Error('Level must be an integer from 0 to 10.');
  if(a.action!=='set'&&a.level!==undefined)throw Error('Use action set when specifying a level.');
  const ids=a.device==='all'?Object.keys(levels):[a.device];
  for(const id of ids){levels[id]=a.action==='off'?0:a.action==='on'?(levels[id]||previous[id]):a.level;if(levels[id]>0)previous[id]=levels[id];}
  revision++;events.push({time:new Date().toISOString(),action:a.action,devices:ids.map(id=>({id,level:levels[id]}))});events=events.slice(-20);onChange(snapshot());return {ok:true,...snapshot()};
 }
 return {snapshot,control,levels};
}
export const equipmentTools=[
 {type:'function',function:{name:'get_equipment',description:'Read actual in-browser simulated equipment state and demonstration readings for BFH Room 110. No real devices are connected.',parameters:{type:'object',properties:{},additionalProperties:false}}},
 {type:'function',function:{name:'control_equipment',description:'Operate simulated devices in Room 110 only. Use only when the user requests a change. Level 0 is off; levels 1–10 are performance/intensity. On restores the previous nonzero level or defaults to 5. All targets all four devices. Returns applied state; never claim a change without success.',parameters:{type:'object',properties:{room:{type:'string',enum:['110']},device:{type:'string',enum:['light','ac','purifier','humidifier','all']},action:{type:'string',enum:['on','off','set']},level:{type:'integer',minimum:0,maximum:10}},required:['room','device','action'],additionalProperties:false}}}
];
export function executeEquipmentTool(twin,name,args){if(name==='get_equipment')return twin.getEquipment();if(name==='control_equipment')return twin.controlEquipment(args);throw Error('Unknown equipment tool');}

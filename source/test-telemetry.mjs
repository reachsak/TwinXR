import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHistory,summarize,metrics,scenarios,executeTelemetry} from '../telemetry.mjs';
globalThis.fetch=async url=>new Response(await readFile(url));
for(const id of Object.keys(scenarios)){
 const rows=parseHistory(await readFile(new URL('../telemetry-data/'+id+'.csv',import.meta.url),'utf8'));
 const result=await executeTelemetry('analyze_room_history',{scenario:id});
 assert.equal(result.samples,rows.length);
 assert.equal(result.missingIntervals,id==='gaps'?8:0);
 assert(Number.isFinite(result.metrics.energy.total));
 if(id==='after_hours')assert.equal(result.vacancy.at(-1).energyKWh,7.2);
 if(id==='ventilation')assert(result.screening.occupiedCO2Above1000.length);
 if(id==='flatline')assert.equal(result.metrics.temperature.min,result.metrics.temperature.max);
 if(id==='cycling')assert(result.screening.largeAdjacentPowerChanges>20);
 if(id==='gaps')assert(result.metrics.co2.missing>0);
 if(id==='weekend')assert.equal(result.metrics.occupancy.max,0);
 assert.deepEqual(summarize(rows,Object.keys(metrics)).metrics,result.metrics);
}
assert.equal((await executeTelemetry('get_live_telemetry')).source,'Room 110 demo feed');
await assert.rejects(executeTelemetry('analyze_room_history',{room:'999'}));
console.log('PASS all 12 telemetry datasets, historical metrics, live demo and invalid room');

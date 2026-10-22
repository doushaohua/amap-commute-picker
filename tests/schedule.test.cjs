const test=require('node:test');
const assert=require('node:assert/strict');
const {nextDeparture,fetchPlans}=require('../future-data.js');
for(const [now,expected] of [
  ['2026-10-19T07:00:00+08:00','2026-10-20'],
  ['2026-10-20T14:00:00+08:00','2026-10-21'],
  ['2026-10-21T08:00:00+08:00','2026-10-22'],
  ['2026-10-22T23:59:59+08:00','2026-10-23'],
  ['2026-10-23T00:00:00+08:00','2026-10-26'],
  ['2026-10-24T14:00:00+08:00','2026-10-26'],
  ['2026-10-25T14:00:00+08:00','2026-10-26'],
  ['2026-10-25T23:59:59+08:00','2026-10-26'],
  ['2026-10-26T00:00:00+08:00','2026-10-27'],
  ['2026-10-19T15:59:59Z','2026-10-20'],
  ['2026-10-19T16:00:00Z','2026-10-21'],
  ['2026-10-30T14:00:00+08:00','2026-11-02'],
  ['2026-12-31T14:00:00+08:00','2027-01-01'],
  ['2028-02-28T14:00:00+08:00','2028-02-29'],
]) test(`next weekday: ${now} -> ${expected} 08:00 Shanghai`,()=>{
  const result=nextDeparture(Date.parse(now));
  assert.equal(result.departure,expected+'T08:00:00+08:00');
  assert.match(result.departureLabel,/（周[一二三四五]）08:00$/);
});
test('all route preferences request the computed date and select its 08:00 forecast',async()=>{
  const config=nextDeparture(Date.parse('2026-10-23T14:00:00+08:00'));
  const day=Date.parse('2026-10-26T00:00:00+08:00')/1000,starts=[];
  const plans=await fetchPlans(config,0,0,undefined,async url=>{
    const start=Number(url.searchParams.get('firsttime'));starts.push(start);
    return {ok:true,json:async()=>({errcode:0,data:{paths:[{distance:8000,steps:[]}],
      time_infos:Array.from({length:48},(_,i)=>({starttime:start+i*900,elements:[{pathindex:0,duration:20+i}]}))}})};
  });
  assert.deepEqual(starts.sort(),[day,day,day,day+43200,day+43200,day+43200].sort());
  for(const {forecast} of plans){assert.equal(forecast.minutes,52);assert.equal(forecast.series[32].timestamp,day+8*3600);}
});

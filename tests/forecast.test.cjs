const test=require('node:test');
const assert=require('node:assert/strict');
const {parseDay,fetchPlans}=require('../future-data.js');
const {trafficSegments,parsePolyline,COLORS}=require('../route-renderer.js');
const {formatDuration,formatTime}=require('../future-chart.js');
const day=Date.parse('2026-10-20T00:00:00+08:00')/1000;
const departure=day+8*3600;
function batch(start,values,path={distance:9409,steps:[],traffic_lights:6}) {
  return {errcode:0,data:{paths:[path],time_infos:values.map((duration,index)=>({starttime:start+index*900,elements:[{duration,pathindex:0}]}))}};
}
test('combines both half days in chronological order and selects 08:00 path from its own batch',()=>{
  const am=batch(day,Array(48).fill(28)),pm=batch(day+43200,Array(48).fill(44),{distance:12345,steps:[]});
  am.data.time_infos[31].elements[0].duration=24;
  const result=parseDay([pm,am],departure,day);
  assert.equal(result.minutes,28);assert.equal(result.path.distance,9409);
  assert.equal(result.series.length,96);assert.equal(result.series[31].minutes,24);
  assert.equal(result.series[95].minutes,44);assert.equal(result.series[32].timestamp,departure);
});
test('missing and invalid slots remain unknown instead of becoming zero or estimates',()=>{
  const am=batch(day,Array(48).fill(28));am.data.time_infos[0].elements[0].duration=null;
  am.data.time_infos[1].elements[0].duration='';am.data.time_infos[2].elements=[];
  const result=parseDay([am],departure,day);
  for(const i of [0,1,2,48,95])assert.equal(result.series[i].minutes,null);
});
test('missing 08:00 path or upstream failure cannot produce a valid forecast',()=>{
  const am=batch(day,Array(48).fill(28));am.data.time_infos[32].elements[0].pathindex=99;
  assert.throws(()=>parseDay([am],departure,day),/08:00/);
  assert.throws(()=>parseDay([{errcode:1}],departure,day),/未返回有效/);
});
test('chart labels preserve hours/minutes and Shanghai time independent of local timezone',()=>{
  assert.equal(formatDuration(76),'1小时\n16分');assert.equal(formatDuration(28),'28分');
  assert.equal(formatDuration(60),'1小时');
  assert.equal(formatDuration(null),'—');assert.equal(formatTime(departure),'08:00');
  assert.equal(formatTime(day+95*900),'23:45');
});
test('traffic and tolls belong to 08:00 element, never the shared path or other departure times',()=>{
  const am=batch(day,Array(48).fill(28)),pm=batch(day+43200,Array(48).fill(40));
  const traffic=[{polyline:'121.1,31.1;121.2,31.2',status:'拥堵'}];
  am.data.time_infos[32].elements[0].tmcs=traffic;am.data.time_infos[32].elements[0].tolls=6;
  am.data.time_infos[33].elements[0].tmcs=[{status:'畅通'}];
  const result=parseDay([pm,am],departure,day);
  assert.deepEqual(result.tmcs,traffic);assert.equal(result.tolls,6);
  delete am.data.time_infos[32].elements[0].tmcs;delete am.data.time_infos[32].elements[0].tolls;
  const missing=parseDay([am],departure,day);
  assert.deepEqual(missing.tmcs,[]);assert.equal(missing.tolls,null);
});
test('all three strategies request both half days and keep distinct forecasts after out-of-order responses',async()=>{
  const requests=[];
  const plans=await fetchPlans({departure:'2026-10-20T08:00:00+08:00',lng:121.3,lat:31.2,destinationId:'test'},121.1,31.1,undefined,async url=>{
    const strategy=url.searchParams.get('strategy'),start=Number(url.searchParams.get('firsttime'));requests.push({strategy,start});
    await new Promise(resolve=>setTimeout(resolve,strategy==='1'?5:0));
    return {ok:true,json:async()=>batch(start,Array(48).fill(20+Number(strategy)))};
  });
  assert.equal(requests.length,6);
  for(const strategy of ['1','2','3'])assert.deepEqual(requests.filter(r=>r.strategy===strategy).map(r=>r.start),[day,day+43200]);
  assert.deepEqual(plans.map(p=>[p.id,p.label,p.forecast.minutes]),[['1','躲避拥堵',21],['2','不走高速',22],['3','少收费',23]]);
});
test('one failed strategy retains other routes and does not copy their times into the failure',async()=>{
  const plans=await fetchPlans({departure:'2026-10-20T08:00:00+08:00'},0,0,undefined,async url=>{
    if(url.searchParams.get('strategy')==='2')throw new Error('此方案暂无路线');
    return {ok:true,json:async()=>batch(Number(url.searchParams.get('firsttime')),Array(48).fill(30))};
  });
  assert.equal(plans[0].forecast.minutes,30);assert.equal(plans[1].forecast,undefined);
  assert.match(plans[1].error,/暂无路线/);assert.equal(plans[2].forecast.minutes,30);
});
test('traffic colors match observed Amap levels, missing or unrecognized status stays unknown',()=>{
  const polyline='121.1,31.1;121.2,31.2';
  const segments=trafficSegments(['畅通','缓行','拥堵','严重拥堵','其他',undefined].map(status=>({polyline,status})));
  assert.deepEqual(segments.map(s=>s.color),['#00C86E','#F5B13F','#CA2A1F','#871B13','#4983FB','#4983FB']);
  assert.equal(segments[4].status,'未知');assert.deepEqual(trafficSegments(undefined),[]);
  assert.equal(COLORS['未知'].color,'#4983FB');
});
test('invalid traffic geometry cannot create a fabricated segment across invalid coordinates',()=>{
  for(const line of ['',null,'121,31','121,31;bad;122,32','121,31;,32','181,31;122,32'])assert.deepEqual(parsePolyline(line),[]);
  assert.equal(trafficSegments([{status:'拥堵',polyline:'bad'},{status:'缓行',polyline:'121,31;122,32'}]).length,1);
});
test('adjacent valid TMC sections share their boundary like Amap, without bridging invalid sections',()=>{
  const segments=trafficSegments([{status:'畅通',polyline:'121,31;121.1,31.1'},
    {status:'拥堵',polyline:'121.2,31.2;121.3,31.3'},{polyline:'bad'},
    {status:'缓行',polyline:'121.4,31.4;121.5,31.5'}]);
  assert.deepEqual(segments[1].points[0],[121.1,31.1]);
  assert.deepEqual(segments[2].points[0],[121.4,31.4]);
});

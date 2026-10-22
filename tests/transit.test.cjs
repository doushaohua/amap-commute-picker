const test=require('node:test');
const assert=require('node:assert/strict');
const {parseResponse,fetchRoutes,parseCoords,formatDuration,formatDistance}=require('../transit-data.js');
const {draw}=require('../transit-renderer.js');
const departure='2026-10-22T08:00:00+08:00';
const makeRoute=(seconds,index)=>({expensetime:String(seconds),allLength:'9759',allfootlength:'1029',expense:'4',
  segmentlist:[{bus_key_name:`线路${index}`,busname:`线路${index}(起站--终站)`,startname:'起站',endname:'终站',
    passdepotcount:'4',color:'69C7F4',footlength:'680',walk:{infolist:[{coord:'121.3,31.1,121.31,31.11'}]},
    drivercoord:'121.31,31.11,121.4,31.2'}],endwalk:{infolist:[{coord:'121.4,31.2,121.41,31.21'}]}});
const response=routes=>({code:1,data:{code:'1',routing_date:'2026-10-22',buslist:routes}});
test('all five native transit alternatives keep original order, seconds, fare, walking and geometry',()=>{
  const result=parseResponse(response([2084,4700,4659,4922,4811].map(makeRoute)),departure);
  assert.equal(result.routes.length,5);assert.equal(result.departure,departure);
  assert.deepEqual(result.routes.map(r=>formatDuration(r.seconds)),['35分钟','1小时18分钟','1小时17分钟','1小时22分钟','1小时20分钟']);
  assert.deepEqual(result.routes.map(r=>r.legs[0].name),['线路0','线路1','线路2','线路3','线路4']);
  assert.equal(result.routes[0].fare,4);assert.equal(result.routes[0].walkMeters,1029);assert.equal(result.routes[0].legs[0].stops,5);
  assert.deepEqual(result.routes[0].geometry.map(s=>s.kind),['walk','transit','walk']);
});
test('unknown fields remain unknown; no result is distinct from upstream error or wrong date',()=>{
  assert.deepEqual(parseResponse(response([]),departure).routes,[]);
  const r=parseResponse(response([{segmentlist:[]}]),departure).routes[0];
  for(const key of ['seconds','distance','walkMeters','fare'])assert.equal(r[key],null);
  assert.equal(formatDuration(r.seconds),'用时未知');assert.equal(formatDistance(null),'距离未知');
  assert.throws(()=>parseResponse({code:0},departure),/未返回有效/);
  assert.throws(()=>parseResponse(response([]),'2026-10-23T08:00:00+08:00'),/日期/);
});
test('malformed coordinate sections are omitted rather than drawing a fabricated bridge',()=>{
  for(const value of [null,'','121,31','121,31,122','121,31,,32','121,31,bad,32','181,31,122,32'])assert.deepEqual(parseCoords(value),[]);
  const raw=makeRoute(200,0);raw.segmentlist[0].drivercoord='bad';
  assert.deepEqual(parseResponse(response([raw]),departure).routes[0].geometry.map(s=>s.kind),['walk','walk']);
});
test('transit request uses exact clicked coordinates and same next-weekday departure with the configured destination',async()=>{
  const controller=new AbortController();let request;
  await fetchRoutes({departure,transitDestination:{name:"自选大厦",lng:121.45,lat:31.3,id:"selected-poi"}},121.25,31.15,controller.signal,async(url,options)=>{
    request={url,options};return {ok:true,json:async()=>response([])};
  });
  assert.equal(request.url.pathname,'/ssr/api/getBusRoutePlan');
  assert.deepEqual(Object.fromEntries(request.url.searchParams),{x1:'121.25',y1:'31.15',x2:'121.45',y2:'31.3',poiid1:'',poiid2:'selected-poi',type:'0',dateTime:'2026-10-22|08-00'});
  assert.equal(request.options.signal,controller.signal);assert.equal(request.options.credentials,'include');
});
test('selected transit geometry renders independently without altering drive overlays; walking is dashed',()=>{
  const previous=global.AMap;const created=[];
  global.AMap={Polyline:class{constructor(options){created.push(options);}}};
  try {
    const route=parseResponse(response([makeRoute(200,0)]),departure).routes[0];
    assert.equal(draw({},route).length,3);assert.deepEqual(created.map(p=>p.strokeStyle),['dashed','solid','dashed']);
    assert.ok(created.every(p=>p.extData.mode==='transit'&&p.extData.routeId==='0'));assert.equal(created[1].strokeColor,'#69C7F4');
    assert.deepEqual(draw({},null),[]);
  } finally {global.AMap=previous;}
});

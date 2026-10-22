const test=require('node:test');
const assert=require('node:assert/strict');
const data=require('../future-data.js');
const transit=require('../transit-data.js');
const now=Date.parse('2026-10-21T22:00:00+08:00');
test('manual date validates calendar dates, native 15-minute slots, and seven-day forecast bounds in Shanghai',()=>{
  assert.deepEqual(data.departureBounds(now),{min:'2026-10-21',max:'2026-10-28'});
  assert.equal(data.validateDeparture('2026-10-24T14:30',now).departureLabel,'2026年10月24日（周六）14:30');
  assert.equal(data.validateDeparture('2026-10-28T23:45',now).departure,'2026-10-28T23:45:00+08:00');
  for(const value of ['2026-02-30T08:00','2026-10-22T24:00','2026-10-22T08:10','bad'])assert.throws(()=>data.validateDeparture(value,now));
  assert.throws(()=>data.validateDeparture('2026-10-21T21:45',now),/当前时间/);
  assert.throws(()=>data.validateDeparture('2026-10-29T08:00',now),/7天/);
});
test('afternoon driving forecast selects its own route traffic and tolls; transit receives the identical custom minute',async()=>{
  const config={departure:'2026-10-23T14:30:00+08:00',lng:121.3,lat:31.2,destinationId:'test',strategy:'1',transitDestination:{name:'终点',lng:121.4,lat:31.3,id:'bus-test'}};
  const departure=Date.parse(config.departure)/1000,tmcs=[{status:'拥堵',polyline:'121.1,31.1;121.2,31.2'}];
  const result=await data.fetchDay(config,121.1,31.1,null,async url=>{
    const start=Number(url.searchParams.get('firsttime'));
    return {ok:true,json:async()=>({errcode:0,data:{paths:[{distance:1100,steps:[]}],time_infos:Array.from({length:48},(_,i)=>({starttime:start+i*900,elements:[{duration:start+i*900===departure?41:99,pathindex:0,tmcs:start+i*900===departure?tmcs:[],tolls:8}]}))}})};
  });
  assert.equal(result.minutes,41);assert.deepEqual(result.tmcs,tmcs);assert.equal(result.tolls,8);
  let request;
  await transit.fetchRoutes(config,121.1,31.1,null,async url=>{request=url;return {ok:true,json:async()=>({code:1,data:{code:1,routing_date:'2026-10-23',buslist:[]}})};});
  assert.equal(request.searchParams.get('dateTime'),'2026-10-23|14-30');
});

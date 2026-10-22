const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const data=require('../destination-data.js');
const poi={name:'公司',id:'company',lng:121.3,lat:31.2,address:'上海市长宁区某路1号'};
test('settings require a concrete finite coordinate and drop arbitrary fields; missing configuration starts empty',()=>{
  assert.deepEqual(data.normalizeSettings(),{schema:3,destination:null});
  for(const lng of [null,undefined,'',NaN,Infinity,181])assert.equal(data.normalize({...poi,lng}),null);
  assert.equal(data.normalize({...poi,lat:91}),null);assert.equal(data.normalize({...poi,name:''}),null);
  assert.deepEqual(data.normalize({...poi,secret:'ignored'}),poi);
  assert.equal(data.signature({destination:poi,unused:true}),data.signature({destination:poi}));
  assert.notEqual(data.signature({destination:poi}),data.signature({destination:{...poi,lng:121.4}}));
});
test('native detail must match the selected POI and never replaces its exact coordinate with an entrance',async()=>{
  const native={id:'company',name:poi.name,address:poi.address};
  assert.deepEqual(await data.detail(poi,undefined,()=>native),poi);
  const mapPoint={name:'地图选点',lng:121.5,lat:31.4,id:'',address:''};
  assert.deepEqual(await data.detail(mapPoint,undefined,()=>native),mapPoint);
});
test('a canceled native detail wait never resolves a different same-name POI',async()=>{
  const controller=new AbortController(),pending=data.detail(poi,controller.signal,()=>({id:'another-company',name:poi.name,address:'错误地址'}));
  controller.abort();await assert.rejects(pending,{name:'AbortError'});
});
test('legacy dual settings migrate to one driving destination, with transit as fallback only',()=>{
  const other={...poi,name:'备用地点',lng:121.4};
  assert.deepEqual(data.normalizeSettings({schema:1,driving:poi,transit:other}).destination,poi);
  assert.deepEqual(data.normalizeSettings({schema:1,driving:null,transit:other}).destination,other);
});
test('saved destinations remain explicit user choices while a fresh installation starts empty',()=>{
  assert.deepEqual(data.normalizeSettings(),{schema:3,destination:null});
  assert.deepEqual(data.normalizeSettings({schema:3,destination:poi}).destination,poi);
  assert.deepEqual(data.normalizeSettings({schema:2,destination:poi}).destination,poi);
});
test('isolated bridge accepts only same-window whitelisted requests and persists normalized local settings',async()=>{
  let receive;const replies=[],values={};
  const window={addEventListener:(_,fn)=>receive=fn,postMessage:message=>replies.push(message)};
  const chrome={storage:{local:{get:async()=>values,set:async value=>Object.assign(values,value)}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../settings-bridge.js'),'utf8'),{window,location:{origin:'https://www.amap.com'},chrome,__amapCommuteDestinations:data});
  const send=(action,value,source=window)=>receive({source,origin:'https://www.amap.com',data:{channel:'amap-commute-settings-v3-request',id:'a',action,value}});
  send('save',{driving:poi,secret:'ignored'},{});send('delete');await new Promise(setImmediate);assert.equal(replies.length,0);
  send('save',{driving:poi,secret:'ignored'});send('load');await new Promise(setImmediate);
  assert.equal(replies.length,2);assert.deepEqual(replies[1].value,data.normalizeSettings({destination:poi}));assert.equal(values[data.SETTINGS_KEY].secret,undefined);
});
test('native navigation changing URL before its heading cannot copy the previous place name or address',async()=>{
  let reads=0;
  const result=await data.detail(poi,undefined,()=>++reads===1?{id:poi.id,name:'上一地点',address:'上一地址'}:{id:poi.id,name:poi.name,address:poi.address});
  assert.equal(result.name,poi.name);assert.equal(result.address,poi.address);assert.ok(reads>=2);
});

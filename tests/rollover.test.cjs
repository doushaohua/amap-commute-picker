const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const data=require('../future-data.js');
const places=require('../place-links.js');
const destinations=require('../destination-data.js');
// 在受控时钟和延迟网络下运行真实控制器；不修改电脑时间，不发送模拟请求到高德。
function setup(busFetch=async()=>({routes:[]}),initialSettings={schema:3,destination:{name:"测试公司",lng:121.35,lat:31.23,id:"test-company"}}){
  let now=Date.parse('2026-10-19T23:59:59+08:00'),tick,id=0;
  const nodes=new Map(),timers=new Map(),requests=[],events=new Map(),chart={value:null,departure:null,
    render(value){this.value=value;},clear(){this.value=null;},setDeparture(value){this.departure=value;this.clear();}};
  class Element {
    constructor(){this.style={};this.classList={toggle(){},remove(){}};this.children=[];this.hidden=false;this.events=new Map();this.attrs={};}
    querySelector(key){if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);}
    attachShadow(){return this;} append(...items){this.children.push(...items);} replaceChildren(...items){this.children=items;}
    setAttribute(key,value){this.attrs[key]=value;} removeAttribute(key){delete this.attrs[key];if(key==='href')delete this.href;} remove(){} addEventListener(name,fn){this.events.set(name,fn);} removeEventListener(name){this.events.delete(name);}
  }
  const map={getAllOverlays:()=>[],getStatus:()=>({isHotspot:true}),setStatus(){},on(){},off(){},setCenter(){}};
  const container=new Element();container.amap=map;
  const window={AMap:{},addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),
    __amapCommuteData:{...data,nextDeparture:()=>data.nextDeparture(now),validateDeparture:value=>data.validateDeparture(value,now),fetchPlans:(config,lng,lat,signal)=>new Promise(resolve=>requests.push({config,signal,resolve}))},
    __amapCommuteDeparturePicker:{create:()=>({close(){},destroy(){}})},
    __amapCommuteDestinations:{...destinations,detail:async value=>destinations.normalize(value),loadSettings:async()=>initialSettings,saveSettings:async value=>destinations.normalizeSettings(value)},
    __amapCommutePanelScrollbar:{create:()=>({destroy(){}})},
    __amapCommuteChart:{create:(_,departure)=>{chart.departure=departure;return chart;}},
    __amapCommuteRoutes:{draw:()=>[],trafficSegments:()=>[]},__amapCommutePlaces:places,
    __amapCommuteTransit:{...require('../transit-data.js'),fetchRoutes:busFetch},__amapCommuteTransitView:{create:()=>({render(){}})},__amapCommuteTransitRenderer:{draw:()=>[]}};
  const document={hidden:false,body:new Element(),createElement:()=>new Element(),getElementById:()=>container,
    addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../destination-view.js'),'utf8'),{window,AbortController});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../commute-picker.js'),'utf8'),{
    location:{hostname:'www.amap.com'},window,document,Date,AbortController,
    AMap:{Marker:class{setMap(){}}},setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:key=>timers.delete(key),
    setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;}});
  const runQuery=async()=>{for(const [key,value] of [...timers])if(value.delay===250){timers.delete(key);await value.fn();}};
  const finish=(request,minutes)=>request.resolve(data.STRATEGIES.map(strategy=>({...strategy,forecast:{minutes,path:{distance:1000},series:[],tmcs:[]}})));
  return {api:window.__amapCommutePicker,chart,requests,nodes,events,runQuery,finish,
    setDate(value){now=Date.parse(value);},tick(){tick();}};
}
test('midnight clears old forecasts and refetches same origin; a late old response cannot overwrite the new day',async()=>{
  const h=setup();await h.api.ready;h.api.select(121.3,31.1,false,'小区A');const first=h.runQuery();
  assert.equal(h.requests[0].config.departure,'2026-10-20T08:00:00+08:00');
  h.setDate('2026-10-20T00:00:00+08:00');h.tick();
  assert.equal(h.requests[0].signal.aborted,true);assert.equal(h.api.getState().last,null);
  assert.equal(h.chart.departure,Date.parse('2026-10-21T08:00:00+08:00')/1000);
  const second=h.runQuery();h.finish(h.requests[1],42);await second;
  h.finish(h.requests[0],99);await first;
  assert.equal(h.api.getState().last.minutes,42);assert.equal(h.api.getState().origin.name,'小区A');
  assert.equal(h.api.getState().history.length,1);
  assert.equal(h.requests[1].config.departure,'2026-10-21T08:00:00+08:00');
  h.api.select(121.3,31.1,false,'小区A');await h.runQuery();assert.equal(h.requests.length,2);
});
test('closed panel rolls date without network, reopening on Friday queries Monday instead of cached Thursday',async()=>{
  const h=setup();await h.api.ready;h.api.select(121.3,31.1,false,'小区A');const pending=h.runQuery();h.finish(h.requests[0],30);await pending;
  h.api.close();h.setDate('2026-10-23T14:00:00+08:00');h.tick();
  assert.equal(h.api.config.departure,'2026-10-26T08:00:00+08:00');assert.equal(h.api.getState().history.length,0);
  assert.equal(h.api.getState().last,null);assert.equal(h.chart.value,null);await h.runQuery();assert.equal(h.requests.length,1);
  h.api.open();const next=h.runQuery();assert.equal(h.requests[1].config.departure,'2026-10-26T08:00:00+08:00');
  h.finish(h.requests[1],45);await next;assert.equal(h.api.getState().last.minutes,45);
  h.api.destroy();assert.equal(h.events.size,0);
});
test('sleep recovery via focus updates immediately without waiting for interval',async()=>{
  const h=setup();await h.api.ready;h.setDate('2026-10-20T14:00:00+08:00');h.events.get('focus')();
  assert.equal(h.api.config.departure,'2026-10-21T08:00:00+08:00');
  assert.match(h.nodes.get('.time').textContent,/21日（周三）08:00/);
});

test('transit failure preserves driving and is not cached as a successful combined result',async()=>{
  let calls=0;const h=setup(async()=>{calls++;throw new Error('公交暂不可用');});await h.api.ready;
  h.api.select(121.3,31.1,false,'A');const first=h.runQuery();h.finish(h.requests[0],30);await first;
  assert.equal(h.api.getState().last.minutes,30);assert.match(h.api.getState().last.transit.error,/公交暂不可用/);
  h.api.select(121.3,31.1,false,'A');const retry=h.runQuery();h.finish(h.requests[1],31);await retry;assert.equal(calls,2);
});
test('all driving plans failing still preserves transit alternatives',async()=>{
  const h=setup(async()=>({routes:[{id:'0',seconds:1800,legs:[{name:'9号线'}]}]}));await h.api.ready;
  h.api.select(121.3,31.1,false,'A');const pending=h.runQuery();
  h.requests[0].resolve(data.STRATEGIES.map(p=>({...p,error:'暂无驾车预测'})));await pending;
  assert.equal(h.api.getState().last.minutes,undefined);assert.equal(h.api.getState().last.transit.routes[0].seconds,1800);
});
test('late transit response cannot replace a newer origin',async()=>{
  const bus=[];const h=setup(()=>new Promise(resolve=>bus.push(resolve)));await h.api.ready;
  h.api.select(121.3,31.1,false,'A');const old=h.runQuery();h.finish(h.requests[0],30);
  h.api.select(121.4,31.2,false,'B');const next=h.runQuery();h.finish(h.requests[1],40);
  bus[1]({routes:[{id:'0',seconds:1200,legs:[]}]});await next;
  bus[0]({routes:[{id:'0',seconds:9999,legs:[]}]});await old;
  assert.equal(h.api.getState().last.name,'B');assert.equal(h.api.getState().last.transit.routes[0].seconds,1200);
});

test('changing departure aborts the previous query and stale responses cannot overwrite the selected time',async()=>{
  const busConfigs=[],h=setup(async config=>{busConfigs.push(config.departure);return {routes:[]};});await h.api.ready;
  h.api.select(121.3,31.1,false,'A');const old=h.runQuery();
  h.api.setDeparture('2026-10-20T09:15');
  assert.equal(h.requests[0].signal.aborted,true);assert.equal(h.api.getState().last,null);
  assert.equal(h.api.getState().departureMode,'manual');
  const next=h.runQuery();assert.equal(h.requests[1].config.departure,'2026-10-20T09:15:00+08:00');
  h.finish(h.requests[1],36);await next;h.finish(h.requests[0],99);await old;
  assert.equal(h.api.getState().last.minutes,36);assert.equal(h.api.getState().history.length,1);
  assert.equal(h.chart.departure,Date.parse('2026-10-20T09:15:00+08:00')/1000);
  assert.deepEqual(busConfigs,['2026-10-20T08:00:00+08:00','2026-10-20T09:15:00+08:00']);
  h.api.select(121.3,31.1,false,'A');await h.runQuery();assert.equal(h.requests.length,2);
});
test('manual departure survives midnight, expires safely, and can restore the automatic weekday default',async()=>{
  const h=setup();await h.api.ready;h.api.setDeparture('2026-10-20T09:15');
  h.setDate('2026-10-20T00:01:00+08:00');h.tick();
  assert.equal(h.api.config.departure,'2026-10-20T09:15:00+08:00');
  h.setDate('2026-10-20T09:16:00+08:00');h.tick();
  assert.equal(h.api.config.departure,'2026-10-21T08:00:00+08:00');assert.equal(h.api.getState().departureMode,'auto');
  h.api.setDeparture('2026-10-21T14:30');h.api.setDeparture();
  assert.equal(h.api.config.departure,'2026-10-21T08:00:00+08:00');assert.equal(h.api.getState().departureMode,'auto');
  assert.throws(()=>h.api.setDeparture('2026-10-20T07:15'),/当前时间/);
  assert.equal(h.api.config.departure,'2026-10-21T08:00:00+08:00');
});

test('changing the shared destination aborts old results and updates both modes for the same origin',async()=>{
  const busConfigs=[],h=setup(async config=>{busConfigs.push(config.transitDestination);return {routes:[]};});await h.api.ready;
  h.api.select(121.3,31.1,false,'小区A');const old=h.runQuery();
  await h.api.saveDestination({name:'新公司',id:'new-company',lng:121.45,lat:31.3,address:'确认地址'});
  assert.equal(h.requests[0].signal.aborted,true);assert.equal(h.api.getState().last,null);
  const next=h.runQuery();assert.equal(h.requests[1].config.destination,'新公司');assert.equal(h.requests[1].config.lng,121.45);
  assert.equal(busConfigs[1].name,'新公司');assert.equal(busConfigs[1].lng,h.requests[1].config.lng);assert.equal(busConfigs[1].id,h.requests[1].config.destinationId);
  h.finish(h.requests[1],35);await next;h.finish(h.requests[0],99);await old;
  assert.equal(h.api.getState().last.minutes,35);assert.equal(h.api.getState().origin.name,'小区A');
  h.api.select(121.3,31.1,false,'小区A');await h.runQuery();assert.equal(h.requests.length,2);
});
test('first use rejects origins and rental links until a destination and a separate origin are selected',async()=>{
  const busConfigs=[],h=setup(async config=>{busConfigs.push(config.transitDestination);return {routes:[]};},{});await h.api.ready;
  h.api.select(121.3,31.1,false,'小区A');await h.runQuery();assert.equal(h.requests.length,0);assert.equal(h.api.getState().origin,null);assert.equal(h.api.getState().rentalUrl,null);
  assert.equal(h.nodes.get('.rental-actions').hidden,true);assert.equal(h.nodes.get('#rental').href,undefined);
  await h.api.saveDestination({name:'同一公司',lng:121.4,lat:31.2,id:'same'});
  assert.equal(h.api.getState().stage,'origin');assert.equal(h.nodes.get('.rental-actions').hidden,true);
  assert.equal(h.requests.length,0);assert.equal(h.api.getState().origin,null);
  h.api.select(121.3,31.1,false,'小区A');const pending=h.runQuery();h.finish(h.requests[0],20);await pending;
  assert.equal(h.api.getState().stage,'results');assert.equal(h.nodes.get('.rental-actions').hidden,false);
  assert.match(h.nodes.get('#rental').href,/%E5%B0%8F%E5%8C%BAA/);
  assert.equal(h.requests[0].config.destination,'同一公司');assert.equal(busConfigs[0].name,'同一公司');assert.equal(h.api.getState().settings.schema,3);
});

test('destination editing hides results and removes rental hrefs; cancel restores the same origin',async()=>{
  const h=setup();await h.api.ready;h.api.select(121.3,31.1,false,'小区A');
  const pending=h.runQuery();h.nodes.get('#change-destination').events.get('click')();
  assert.equal(h.api.getState().stage,'destination');assert.equal(h.nodes.get('.rental-actions').hidden,true);
  assert.equal(h.nodes.get('#rental').href,undefined);assert.equal(h.nodes.get('.departure-section').hidden,true);
  h.finish(h.requests[0],30);await pending;
  assert.equal(h.api.getState().stage,'destination');assert.equal(h.nodes.get('#retry').hidden,true);
  h.nodes.get('#change-destination').events.get('click')();
  assert.equal(h.api.getState().stage,'results');assert.equal(h.api.getState().origin.name,'小区A');
  assert.equal(h.nodes.get('.drive-section').hidden,false);assert.ok(h.nodes.get('#rental').href);
});

test('clearing a destination resets the whole flow and cannot reuse an old origin for first-time onboarding',async()=>{
  const h=setup();await h.api.ready;h.api.select(121.3,31.1,false,'小区A');
  await h.api.saveDestination(null);assert.equal(h.api.getState().stage,'intro');assert.equal(h.api.getState().origin,null);
  assert.equal(h.nodes.get('.rental-actions').hidden,true);
  await h.api.saveDestination({name:'新公司',lng:121.4,lat:31.2});
  assert.equal(h.api.getState().stage,'origin');assert.equal(h.api.getState().origin,null);
});

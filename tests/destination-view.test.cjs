const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const data=require('../destination-data.js');
const point={name:'公司',id:'company',lng:121.3,lat:31.2,address:'确认地址'};
function setup(overrides={}){
  const nodes=new Map(),saves=[],origins=[];
  class Element{
    constructor(){this.events={};this.classList={toggle(){}};this.attrs={};}
    querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);}
    setAttribute(key,value){this.attrs[key]=value;}addEventListener(key,fn){this.events[key]=fn;}
  }
  const window={__amapCommuteDestinations:{...data,detail:async value=>data.normalize(value),...overrides}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../destination-view.js'),'utf8'),{window,AbortController});
  const view=window.__amapCommuteDestinationView.create(new Element(),{onSave:async value=>saves.push(value),onOrigin:value=>origins.push(value)});
  const click=selector=>nodes.get(selector).events.click();
  return {view,nodes,saves,origins,click};
}
test('first use shows an introduction; map clicks do nothing until choosing destination is started',async()=>{
  const h=setup();h.view.update({});assert.equal(h.view.stage,'intro');
  assert.equal(h.nodes.get('.flow-intro').hidden,false);assert.equal(h.nodes.get('.point-rows').hidden,true);
  await h.view.pick(point,1);assert.equal(h.saves.length,0);assert.equal(h.origins.length,0);
  h.click('.flow-start');assert.equal(h.view.stage,'destination');assert.equal(h.nodes.get('.flow-intro').hidden,true);
  assert.equal(h.nodes.get('.flow-prompt h3').textContent,'请在地图上点击终点');
});
test('one physical gesture cannot set both points, including late duplicate SDK events after destination saving',async()=>{
  const h=setup();h.view.update({});h.click('.flow-start');await h.view.pick(point,1);
  assert.equal(h.saves.length,1);assert.equal(h.view.stage,'origin');assert.equal(h.origins.length,0);
  await h.view.pick(point,1);assert.equal(h.origins.length,0);assert.equal(h.view.stage,'origin');
  await h.view.pick({...point,name:'小区'},2);assert.equal(h.origins[0].name,'小区');assert.equal(h.view.stage,'results');
  await h.view.pick({...point,name:'另一个小区'},3);assert.equal(h.origins.at(-1).name,'另一个小区');assert.equal(h.saves.length,1);
});
test('returning users keep the saved destination and are guided to pick an origin',()=>{
  const h=setup();h.view.update({schema:3,destination:point});assert.equal(h.view.stage,'origin');
  assert.equal(h.nodes.get('#destination-name').textContent,'公司');assert.equal(h.nodes.get('#origin-row').hidden,true);
  assert.equal(h.nodes.get('.flow-prompt h3').textContent,'接下来，在地图上点击起点');
});
test('only Change unlocks destination; cancel preserves both points and a new map selection locks it again',async()=>{
  const h=setup();h.view.update({schema:3,destination:point});h.view.setOrigin({...point,name:'小区'});
  h.click('#change-destination');assert.equal(h.view.stage,'destination');assert.equal(h.view.editing,true);
  h.click('#change-destination');assert.equal(h.view.stage,'results');assert.equal(h.nodes.get('#origin-name').textContent,'小区');assert.equal(h.saves.length,0);
  h.click('#change-destination');await h.view.pick({...point,name:'新公司'},1);
  assert.equal(h.saves[0].name,'新公司');assert.equal(h.view.stage,'results');assert.equal(h.view.editing,false);
  await h.view.pick({...point,name:'新小区'},2);assert.equal(h.origins.at(-1).name,'新小区');assert.equal(h.saves.length,1);
});
test('saving failure remains in destination step, without enabling origin selection',async()=>{
  const h=setup({detail:async()=>{throw new Error('地点暂不可用');}});h.view.update({});h.click('.flow-start');
  await h.view.pick(point,1);assert.equal(h.view.stage,'destination');assert.equal(h.origins.length,0);assert.equal(h.saves.length,0);
  assert.equal(h.nodes.get('.flow-message').textContent,'地点暂不可用');
});
test('destroying an asynchronous selection prevents a late destination save',async()=>{
  let resolve;const h=setup({detail:()=>new Promise(done=>resolve=done)});h.view.update({});h.click('.flow-start');
  const pending=h.view.pick(point,1);h.view.destroy();resolve(point);await pending;assert.equal(h.saves.length,0);
});

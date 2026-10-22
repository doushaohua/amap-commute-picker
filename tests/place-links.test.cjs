const test=require('node:test');
const assert=require('node:assert/strict');
const {rentalUrl,hotspotPoint,markerPoint}=require('../place-links.js');
test('rental link preserves the user filter prefix and showMore and only encodes the place name',()=>{
  assert.equal(rentalUrl(' 示例小区 '),'https://sh.zu.ke.com/zufang/ie1rt200600000001l1rs%E7%A4%BA%E4%BE%8B%E5%B0%8F%E5%8C%BA/?showMore=1');
  const url=new URL(rentalUrl('地点 A/B?x=1#&'));
  assert.equal(url.origin,'https://sh.zu.ke.com');assert.equal(url.search,'?showMore=1');assert.equal(url.hash,'');
  assert.equal(decodeURIComponent(url.pathname.slice('/zufang/ie1rt200600000001l1rs'.length,-1)),'地点 A/B?x=1#&');
});
test('native search LabelMarker uses its displayed name and actual position without inventing nearby names',()=>{
  const position={getLng:()=>121.4,getLat:()=>31.2};
  assert.deepEqual(markerPoint({getOptions:()=>({text:{content:'示例小区'}}),getPosition:()=>position}),{name:'示例小区',lng:121.4,lat:31.2});
  assert.equal(markerPoint({getOptions:()=>({}),getPosition:()=>position}),null);
});
test('no name means no rental link, while any named place is accepted without neighborhood classification',()=>{
  for(const value of ['',null,undefined,'   '])assert.equal(rentalUrl(value),null);
  assert.ok(rentalUrl('示例站(地铁站)').includes(encodeURIComponent('示例站(地铁站)')));
});
test('hotspot origin takes the exact event name and coordinates, not the label click pixel',()=>{
  assert.deepEqual(hotspotPoint({name:'示例小区',lnglat:{getLng:()=>121.3,getLat:()=>31.1}}),{name:'示例小区',lng:121.3,lat:31.1});
  assert.equal(hotspotPoint({name:'',lnglat:{getLng:()=>121.3,getLat:()=>31.1}}),null);
  assert.equal(hotspotPoint({name:'地点',lnglat:{getLng:()=>NaN,getLat:()=>31.1}}),null);
  assert.deepEqual(hotspotPoint({name:'公司',id:'test-poi-id',lnglat:{getLng:()=>121.3,getLat:()=>31.1}}),{name:'公司',id:'test-poi-id',lng:121.3,lat:31.1});
});

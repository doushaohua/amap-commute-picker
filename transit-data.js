/* 对齐高德网页 getBusRoutePlan：秒为耗时单位，所有 buslist 方案按原生顺序保留。 */
(() => {
  'use strict';
  const number=value=>value!==null && value!==undefined && String(value).trim()!=='' && Number.isFinite(Number(value)) && Number(value)>=0?Number(value):null;
  const text=value=>typeof value==='string'?value.trim():'';
  function formatDuration(seconds) {
    const value=number(seconds);if(value===null)return '用时未知';
    // 原生不足一小时向上取分，超过一小时向下取剩余分钟。
    if(value<3600)return `${Math.ceil(value/60)}分钟`;
    const hours=Math.floor(value/3600),minutes=Math.floor(value/60)%60;
    return `${hours}小时${minutes?`${minutes}分钟`:''}`;
  }
  function formatDistance(meters) {
    const value=number(meters);return value===null?'距离未知':value<1000?`${Math.floor(value)}米`:`${(value/1000).toFixed(1).replace(/\.0$/,'')}公里`;
  }
  function parseCoords(value) {
    if(typeof value!=='string'||!value.trim())return [];
    const values=value.split(',').map(v=>v.trim()===''?NaN:Number(v));
    if(values.length<4||values.length%2)return [];
    const points=[];
    for(let i=0;i<values.length;i+=2){const p=values.slice(i,i+2);if(!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)return [];points.push(p);}
    return points;
  }
  const walking=walk=>(Array.isArray(walk?.infolist)?walk.infolist:[]).map(info=>({kind:'walk',points:parseCoords(info.coord),color:'#76879b'})).filter(s=>s.points.length>1);
  function parseRoute(route,index) {
    const legs=(Array.isArray(route.segmentlist)?route.segmentlist:[]).map(segment=>({
      name:text(segment.bus_key_name)||text(segment.busname)||'公共交通路段',fullName:text(segment.busname),
      start:text(segment.startname),end:text(segment.endname),direction:text(segment.directionName),
      stops:number(segment.passdepotcount)===null?null:number(segment.passdepotcount)+1,
      walkMeters:number(segment.footlength),walkSeconds:number(segment.foottime),
      entrance:text(segment.inport?.name),exit:text(segment.outport?.name),
      geometry:[...walking(segment.walk),{kind:'transit',points:parseCoords(segment.drivercoord),
        color:/^[0-9a-f]{6}$/i.test(segment.color)?`#${segment.color}`:'#287ed6'}].filter(s=>s.points.length>1)
    }));
    return {id:String(index),seconds:number(route.expensetime),distance:number(route.allLength),walkMeters:number(route.allfootlength),
      fare:number(route.expense),currency:text(route.expense_currency)||'元',
      tags:(Array.isArray(route.busTag)?route.busTag:[]).map(t=>text(t.desc)).filter(Boolean),legs,
      endWalkMeters:number(route.endfootlength),endWalkSeconds:number(route.endfoottime),
      geometry:[...legs.flatMap(leg=>leg.geometry),...walking(route.endwalk)]};
  }
  function parseResponse(json,departure) {
    const data=json?.data;
    if(Number(json?.code)!==1 || Number(data?.code)!==1 || !Array.isArray(data?.buslist))throw new Error('高德未返回有效公共交通结果，请重试');
    // 服务端回落到其他日期时不能冒充指定出发日的预测。
    if(data.routing_date!==departure.slice(0,10))throw new Error('高德公交返回日期与出发日不一致，请重试');
    if(Array.isArray(data.routelist)&&data.routelist.length)throw new Error('该起点包含城际方案，请在高德原生路线中查看');
    return {departure,routes:data.buslist.map(parseRoute)};
  }
  async function fetchRoutes(config,lng,lat,signal,fetchImpl=fetch) {
    const destination=config.transitDestination;
    if(!destination || !Number.isFinite(destination.lng) || !Number.isFinite(destination.lat))throw new Error('请先设置公共交通终点');
    const url=new URL('https://amap-pc-ssr.amap.com/ssr/api/getBusRoutePlan');
    // 使用选中坐标，不传起点POI，避免高德将小区中心替换为其他出入口。
    url.search=new URLSearchParams({x1:String(lng),y1:String(lat),x2:String(destination.lng),y2:String(destination.lat),
      poiid1:'',poiid2:destination.id||'',type:'0',dateTime:`${config.departure.slice(0,10)}|${config.departure.slice(11,16).replace(':','-')}`});
    const response=await fetchImpl(url,{credentials:'include',signal});
    if(!response.ok)throw new Error(`高德公交请求失败（${response.status}）`);
    return {...parseResponse(await response.json(),config.departure),destination:{...destination}};
  }
  const api={number,formatDuration,formatDistance,parseCoords,parseRoute,parseResponse,fetchRoutes};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.__amapCommuteTransit=api;
})();

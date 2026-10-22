/* 高德未来用时数据适配：两个半日批次，路线索引只在所属批次内解析。 */
(() => {
  'use strict';
  const STEP = 900;
  const STRATEGIES = Object.freeze([
    {id:'1',label:'躲避拥堵'}, {id:'2',label:'不走高速'}, {id:'3',label:'少收费'}
  ]);
  const shanghaiDate = now => new Date(Number(now)+28800000).toISOString().slice(0,10);
  function departureValue(value) {
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:(00|15|30|45)(:00\+08:00)?$/.test(value||''))throw new Error('请选择日期和时间，分钟间隔为15分钟');
    const departure=value.slice(0,16)+':00+08:00',stamp=Date.parse(departure),day=new Date(stamp+28800000);
    if(!Number.isFinite(stamp)||day.toISOString().slice(0,16)!==value.slice(0,16))throw new Error('出发日期或时间无效');
    return {departure,departureLabel:`${day.getUTCFullYear()}年${day.getUTCMonth()+1}月${day.getUTCDate()}日（周${'日一二三四五六'[day.getUTCDay()]}）${value.slice(11,16)}`};
  }
  function departureBounds(now=Date.now()) {
    return {min:shanghaiDate(now),max:shanghaiDate(Number(now)+7*86400000)};
  }
  function validateDeparture(value,now=Date.now()) {
    const result=departureValue(value),bounds=departureBounds(now);
    if(Date.parse(result.departure)<=now)throw new Error('请选择当前时间之后的出发时间');
    if(result.departure.slice(0,10)>bounds.max)throw new Error('高德未来用时可选择未来7天内的日期');
    return result;
  }
  // 按北京时间的日历取严格晚于今天的首个周一至周五，不使用电脑本地时区。
  function nextDeparture(now = Date.now()) {
    const day = new Date(Number(now) + 8 * 3600 * 1000);
    day.setUTCHours(0,0,0,0);
    do { day.setUTCDate(day.getUTCDate()+1); } while (day.getUTCDay()===0 || day.getUTCDay()===6);
    const date = day.toISOString().slice(0,10);
    return {departure:`${date}T08:00:00+08:00`,
      departureLabel:`${day.getUTCFullYear()}年${day.getUTCMonth()+1}月${day.getUTCDate()}日（周${'日一二三四五六'[day.getUTCDay()]}）08:00`};
  }
  function parseDay(batches, departure, dayStart) {
    const slots = new Map();
    let selectedPath = null, selectedRoute = null;
    for (const json of batches) {
      if (Number(json?.errcode) !== 0 || !Array.isArray(json.data?.time_infos)) {
        throw new Error('高德未返回有效预测，请稍后再试');
      }
      for (const info of json.data.time_infos) {
        const timestamp = Number(info.starttime);
        if (timestamp < dayStart || timestamp >= dayStart + 86400 || (timestamp-dayStart)%STEP !== 0) continue;
        const route = info.elements?.[0];
        const raw = route?.duration;
        const minutes = raw !== null && raw !== undefined && raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null;
        slots.set(timestamp, {timestamp, minutes});
        if (timestamp === departure && minutes !== null) {
          selectedPath = json.data.paths?.[route.pathindex];
          selectedRoute = route;
        }
      }
    }
    const series = Array.from({length:96}, (_,i) => slots.get(dayStart+i*STEP) || {timestamp:dayStart+i*STEP,minutes:null});
    const selected = slots.get(departure);
    if (selected?.minutes == null || !Array.isArray(selectedPath?.steps) || !Number.isFinite(Number(selectedPath.distance))) {
      throw new Error(`${new Date((departure+28800)*1000).toISOString().slice(11,16)} 暂无可用驾车预测，请换一个临近道路的位置`);
    }
    // 路况属于所选时刻的 element，不属于全天共享的 path；不能用其他时刻或实时路况代替。
    const tolls = selectedRoute.tolls;
    return {minutes:selected.minutes,path:selectedPath,series,tmcs:Array.isArray(selectedRoute.tmcs)?selectedRoute.tmcs:[],
      tolls:tolls!==null && tolls!==undefined && tolls!=='' && Number.isFinite(Number(tolls)) && Number(tolls)>=0?Number(tolls):null};
  }
  async function fetchDay(config,lng,lat,signal,fetchImpl=fetch) {
    const departure = Date.parse(config.departure)/1000;
    // 日期边界固定为北京时间，不能使用运行电脑的本地时区。
    const dayStart = Date.parse(config.departure.slice(0,10)+'T00:00:00+08:00')/1000;
    const batches = await Promise.all([dayStart,dayStart+43200].map(async firsttime => {
      const url = new URL('https://amap-pc-ssr.amap.com/ssr/api/getFutureRoutePlan');
      url.search = new URLSearchParams({fromX:String(lng),fromY:String(lat),toX:String(config.lng),toY:String(config.lat),firsttime:String(firsttime),interval:String(STEP),count:'48',strategy:config.strategy,destinationid:config.destinationId});
      const response = await fetchImpl(url,{credentials:'include',signal});
      if (!response.ok) throw new Error(`高德请求失败（${response.status}）`);
      return response.json();
    }));
    return parseDay(batches,departure,dayStart);
  }
  async function fetchPlans(config,lng,lat,signal,fetchImpl=fetch) {
    // 某一偏好无结果不抹掉其他可用方案；浮窗可重试当前起点。
    return Promise.all(STRATEGIES.map(async strategy => {
      try { return {...strategy,forecast:await fetchDay({...config,strategy:strategy.id},lng,lat,signal,fetchImpl)}; }
      catch(error) { return {...strategy,error:error.name==='AbortError'?'查询超时，请重试':error.message}; }
    }));
  }
  const api = {STRATEGIES,nextDeparture,departureValue,departureBounds,validateDeparture,parseDay,fetchDay,fetchPlans};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else window.__amapCommuteData=api;
})();

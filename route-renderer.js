/* 仅使用所选出发时刻的 tmcs；配色与高德未来用时路线一致。 */
(() => {
  'use strict';
  const COLORS = Object.freeze({
    '未知':{color:'#4983FB',outline:'#2557C7'},
    '畅通':{color:'#00C86E',outline:'#0B8655'},
    '缓行':{color:'#F5B13F',outline:'#B18C03'},
    '拥堵':{color:'#CA2A1F',outline:'#980D2B'},
    '严重拥堵':{color:'#871B13',outline:'#52100B'}
  });
  function parsePolyline(value) {
    if(typeof value!=='string'||!value.trim())return [];
    const points=value.split(';').filter(Boolean).map(p=>p.split(',').map(v=>v.trim()===''?NaN:Number(v)));
    return points.length>1 && points.every(p=>p.length===2 && p.every(Number.isFinite) && Math.abs(p[0])<=180 && Math.abs(p[1])<=90)?points:[];
  }
  const pathPoints = path => (path?.steps||[]).flatMap(step=>parsePolyline(step.polyline));
  function trafficSegments(tmcs) {
    let previousEnd=null;
    return (Array.isArray(tmcs)?tmcs:[]).flatMap(tmc=>{
      const points=parsePolyline(tmc?.polyline);
      if(!points.length){previousEnd=null;return [];}
      // 高德原生绘制会把上一分段的末点接入下一段，避免 TMC 边界留下蓝色断口。
      if(previousEnd && (previousEnd[0]!==points[0][0] || previousEnd[1]!==points[0][1]))points.unshift(previousEnd);
      previousEnd=points[points.length-1];
      const status=Object.hasOwn(COLORS,tmc?.status)?tmc.status:'未知';
      return [{points,status,...COLORS[status]}];
    });
  }
  function draw(map,plans,selectedId) {
    const overlays=[];
    const add=(points,style,info)=>{
      if(points.length>1)overlays.push(new AMap.Polyline({path:points,strokeWeight:8,strokeOpacity:1,
        isOutline:true,borderWeight:1,lineJoin:'round',lineCap:'round',bubble:true,map,
        extData:{commute:true,...info},...style}));
    };
    for(const plan of plans) {
      if(!plan.forecast||plan.id===selectedId)continue;
      add(pathPoints(plan.forecast.path),{strokeColor:'#b6bfcd',outlineColor:'#fff',strokeWeight:5,strokeOpacity:0.8,zIndex:170},
        {strategy:plan.id,kind:'alternative'});
    }
    const current=plans.find(plan=>plan.id===selectedId)?.forecast;
    if(!current)return overlays;
    // 未覆盖或缺失的路况使用“未知”蓝色，不能默认涂成畅通绿。
    add(pathPoints(current.path),{strokeColor:COLORS['未知'].color,outlineColor:COLORS['未知'].outline,zIndex:180},
      {strategy:selectedId,kind:'base',status:'未知'});
    for(const segment of trafficSegments(current.tmcs)) {
      add(segment.points,{strokeColor:segment.color,outlineColor:segment.outline,zIndex:181,showDir:true},
        {strategy:selectedId,kind:'traffic',status:segment.status});
    }
    return overlays;
  }
  const api={COLORS,parsePolyline,pathPoints,trafficSegments,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.__amapCommuteRoutes=api;
})();

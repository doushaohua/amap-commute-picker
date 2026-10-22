/* 公交与驾车同时绘制；只绘制高德返回的分段坐标，步行用虚线。 */
(() => {
  'use strict';
  function draw(map,route) {
    return (route?.geometry||[]).filter(segment=>segment.points.length>1).map(segment=>new AMap.Polyline({
      path:segment.points,map,strokeColor:segment.color,strokeWeight:segment.kind==='walk'?4:6,
      strokeStyle:segment.kind==='walk'?'dashed':'solid',strokeDasharray:[6,4],
      isOutline:true,outlineColor:'#fff',borderWeight:2,lineJoin:'round',lineCap:'round',
      strokeOpacity:1,zIndex:190,bubble:true,showDir:segment.kind==='transit',
      extData:{commute:true,kind:segment.kind,mode:'transit',routeId:route.id}
    }));
  }
  const api={draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.__amapCommuteTransitRenderer=api;
})();

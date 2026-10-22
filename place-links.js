/* 按地图地点名称拼接租房链接；贝壳保留原筛选，太平洋使用官方关键词路由。 */
(() => {
  'use strict';
  const cleanName = value => typeof value==='string'?value.trim():'';
  function rentalUrl(name) {
    const keyword=cleanName(name);
    return keyword?'https://sh.zu.ke.com/zufang/ie1rt200600000001l1rs'+encodeURIComponent(keyword)+'/?showMore=1':null;
  }
  function taiwuRentalUrl(name) {
    const keyword=cleanName(name);
    return keyword?'https://www.taiwu.com/zufang/kw'+encodeURIComponent(keyword):null;
  }
  function hotspotPoint(event) {
    const name=cleanName(event?.name),position=event?.lnglat;
    const lng=position?.getLng?.(),lat=position?.getLat?.();
    const id=cleanName(event?.id||event?.poiid);
    return name && Number.isFinite(lng) && Number.isFinite(lat)?{name,lng,lat,...(id?{id}:{})}:null;
  }
  function markerPoint(marker) {
    const options=marker?.getOptions?.()||{};
    let name=cleanName(options.text?.content);
    // 选中后的搜索图钉由 LabelMarker 切换为含 common-label 的 HTML 标记。
    if(!name && typeof document!=='undefined') {
      let content=options.content;
      if(typeof content==='string' && content.includes('common-label')) {
        const template=document.createElement('template');template.innerHTML=content;content=template.content;
      }
      name=cleanName(content?.querySelector?.('.common-label')?.textContent);
    }
    return hotspotPoint({name,lnglat:marker?.getPosition?.()});
  }
  const api={cleanName,rentalUrl,taiwuRentalUrl,hotspotPoint,markerPoint};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.__amapCommutePlaces=api;
})();

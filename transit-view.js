/* 公交方案列表独立于驾车卡片，全部方案可查看，选中项控制地图公交线路。 */
(() => {
  'use strict';
  function create(container,onSelect) {
    const data=window.__amapCommuteTransit;
    let expanded=false,previousResult=null,routeCount=0,selectedIndex=-1;
    container.innerHTML=`<style>
      .transit-section{margin-top:14px;border-top:1px solid #dce5ef;padding-top:12px}.transit-title{font-size:14px;margin:0 0 4px;color:#223c5a}.transit-caption{font-size:11px;color:#65758a;margin:0 0 8px}.transit-list{display:grid;gap:6px}.transit-card{border:1px solid #dce5ef;border-radius:9px;overflow:hidden;background:#f6f8fc}.transit-card:has([aria-checked=true]){border-color:#2468ef;background:#edf4ff}.transit-choice{width:100%;text-align:left;border-radius:0;padding:7px 9px 4px;background:transparent;color:#223c5a}.transit-choice[aria-checked=true]{color:#2468ef}.transit-heading{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;line-height:1.4}.transit-heading b:first-child{min-width:0;overflow-wrap:anywhere}.transit-heading b:last-child{white-space:nowrap}.transit-meta{display:block;color:#65758a;font-size:11px;margin-top:3px}.transit-details{padding:0 9px 5px;font-size:11px;color:#52647b}.transit-details summary{cursor:pointer;color:#2468ef}.transit-details ol{margin:7px 0 0;padding-left:20px}.transit-details li{margin-top:5px}.transit-message{font-size:12px;color:#65758a;margin:8px 0}.transit-message:empty{display:none}.transit-message.error{color:#b33b3b}.transit-card[hidden]{display:none}.transit-more{width:100%;margin-top:6px;padding:5px 8px;font-size:12px;color:#2468ef;background:#edf4ff}
    </style><section class="transit-section" aria-label="公共交通通勤"><h3 class="transit-title"><label class="route-visibility"><input id="show-transit" type="checkbox" aria-label="显示公共交通路线" checked><span>公共交通通勤</span></label></h3><p class="transit-caption"></p><div class="transit-message" role="status"></div><div class="transit-list" id="transit-plan-list" role="radiogroup" aria-label="公共交通方案"></div><button class="transit-more" aria-expanded="false" aria-controls="transit-plan-list" hidden></button></section>`;
    const $=s=>container.querySelector(s);
    const element=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
    function updateVisibility() {
      Array.from($('.transit-list').children).forEach((card,index)=>{card.hidden=!expanded&&index>=2;});
      const toggle=$('.transit-more');toggle.hidden=routeCount<=2;
      toggle.setAttribute('aria-expanded',String(expanded));
      toggle.textContent=expanded?'收起更多方案':`展开其余 ${Math.max(0,routeCount-2)} 个方案${selectedIndex>=2?`（已选方案${selectedIndex+1}）`:''}`;
    }
    $('.transit-more').addEventListener('click',()=>{expanded=!expanded;updateVisibility();});
    function render(result,selectedId,loading,hasPoint,dateLabel,destination) {
      if(result!==previousResult){expanded=false;previousResult=result;}
      routeCount=result?.routes?.length||0;selectedIndex=(result?.routes||[]).findIndex(route=>route.id===selectedId);
      $('.transit-list').replaceChildren();
      $('.transit-caption').hidden=true;
      $('.transit-title span').textContent='公共交通通勤';
      const message=$('.transit-message');message.classList.toggle('error',!!result?.error);
      message.textContent=!destination?'请先设置终点':loading?'正在查询公共交通…':result?.error||(!hasPoint?'选择起点后显示公交 / 地铁方案':!result?'请选择起点重新查询':!result.routes.length?'高德暂无该起点的公共交通方案':'');
      for(const [index,route] of (result?.routes||[]).entries()) {
        const card=element('div','','transit-card'),button=element('button','','transit-choice');
        button.setAttribute('role','radio');button.setAttribute('aria-checked',String(route.id===selectedId));
        button.setAttribute('aria-label',`公交方案${index+1} ${route.legs.map(l=>l.name).join(' → ')} ${data.formatDuration(route.seconds)}`);
        const heading=element('span','','transit-heading');heading.append(element('b',`${index+1} · ${route.legs.map(l=>l.name).join(' → ')||'路线信息待补充'}${route.tags.length?' · '+route.tags.join(' / '):''}`),element('b',data.formatDuration(route.seconds)));
        button.append(heading,
          element('small',`${data.formatDistance(route.distance)} · 步行${data.formatDistance(route.walkMeters)} · ${route.fare===null?'票价未知':route.fare+route.currency}`,'transit-meta'));
        button.addEventListener('click',()=>onSelect(route.id));card.append(button);
        const details=element('details','','transit-details');details.append(element('summary','乘车详情'));
        const list=element('ol','');
        for(const leg of route.legs){
          if(leg.walkMeters>0)list.append(element('li',`步行${data.formatDistance(leg.walkMeters)}至${leg.start||'上车站'}${leg.entrance?'（'+leg.entrance+'）':''}`));
          list.append(element('li',`${leg.fullName||leg.name}：${leg.start||'站点未知'} → ${leg.end||'站点未知'}${leg.stops===null?'':`，${leg.stops}站`}${leg.exit?'，'+leg.exit+'出':''}`));
        }
        if(route.endWalkMeters>0)list.append(element('li',`步行${data.formatDistance(route.endWalkMeters)}到${destination?.name||'终点'}`));
        details.append(list);card.append(details);$('.transit-list').append(card);
      }
      updateVisibility();
    }
    return {render};
  }
  window.__amapCommuteTransitView={create};
})();

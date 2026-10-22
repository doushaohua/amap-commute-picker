/* 租房小区选择助手。使用当前页面的地图与未来用时接口，无第三方服务。 */
(() => {
  'use strict';
  if (location.hostname !== 'www.amap.com') return;
  if (window.__amapCommutePicker?.version === '0.11.1') { window.__amapCommutePicker.open(); return; }
  window.__amapCommutePicker?.destroy();
  const data = window.__amapCommuteData, charts = window.__amapCommuteChart, routes = window.__amapCommuteRoutes, places = window.__amapCommutePlaces;
  const departurePickers=window.__amapCommuteDeparturePicker,scrollbars=window.__amapCommutePanelScrollbar;
  const destinations=window.__amapCommuteDestinations,destinationViews=window.__amapCommuteDestinationView;
  const transit=window.__amapCommuteTransit, transitViews=window.__amapCommuteTransitView, transitRenderer=window.__amapCommuteTransitRenderer;
  if (!data || !charts || !routes || !places || !transit || !transitViews || !transitRenderer || !departurePickers || !scrollbars || !destinations || !destinationViews) throw new Error('通勤组件尚未加载，请重新加载扩展');
  let config = Object.freeze({
    destination:'',lng:null,lat:null,destinationId:'',transitDestination:null,...data.nextDeparture(),strategy:'1'
  });

  const host = document.createElement('div');
  host.id = 'amap-commute-picker';
  host.style.cssText = 'position:fixed;right:76px;top:78px;width:380px;max-width:calc(100vw - 90px);z-index:10000;';
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = `
    <style>
      :host{font:14px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#17253b}
      *{box-sizing:border-box} .card{background:#fff;border:1px solid #dce5ef;border-radius:16px;box-shadow:0 8px 32px #16315530;overflow:hidden}
      header{padding:15px 17px 10px;display:flex;align-items:center;justify-content:space-between}h2{font-size:17px;margin:0}button{font:inherit;cursor:pointer;border:0;border-radius:8px;background:#edf3fb;color:#24496e;padding:7px 10px}button:hover{background:#dceafa}button:focus-visible{outline:2px solid #2468ef}
      .close{font-size:20px;padding:0 7px;background:transparent;color:#758397}.body{padding:0 17px 15px}.fixed{font-size:12px;color:#52647b;background:#f4f7fb;border-radius:10px;padding:10px 12px}.fixed strong{display:block;color:#223c5a;font-size:13px}.route-visibility{display:flex;align-items:center;gap:6px;cursor:pointer}.route-visibility input{width:15px;height:15px;margin:0;accent-color:#2468ef;flex-shrink:0}.route-visibility input:focus-visible{outline:2px solid #2468ef;outline-offset:2px}.departure-section{margin-bottom:10px;padding:10px 12px;border-radius:10px;background:#f4f7fb}.departure-label{display:block;color:#52647b;font-size:12px;margin-bottom:4px}.time{display:block;width:100%;padding:0;background:transparent;text-align:left;color:#2364d9;font-size:13px;font-weight:600}.time:hover{background:transparent;color:#1856cc}.rental-actions[hidden]{display:none}.rental-actions{display:flex;gap:8px;margin-top:10px}.rental-actions .rental{flex:1;text-align:center}.drive-section{margin-top:14px;border-top:1px solid #dce5ef;padding-top:12px}.commute-title{font-size:14px;margin:0;color:#223c5a}.error{color:#b33b3b}.foot{font-size:11px;color:#8491a3;margin-top:10px}
    </style>
    <style>.card{max-height:calc(100vh - 96px);overflow:auto;scrollbar-width:none;overscroll-behavior:contain}
      .card::-webkit-scrollbar{display:none;width:0;height:0}
      .panel-scrollbar{position:absolute;top:62px;right:5px;bottom:14px;width:8px;z-index:1;cursor:pointer;touch-action:none;outline-offset:1px}
      .panel-scrollbar[hidden]{display:none}.panel-scrollbar:focus-visible{outline:1px solid #2468ef;border-radius:5px}
      .panel-scrollbar-thumb{position:absolute;top:0;left:2px;width:3px;height:32px;border-radius:999px;background:#cbd4df;opacity:.65;pointer-events:none;transition:background .15s,opacity .15s}
      .panel-scrollbar:hover .panel-scrollbar-thumb,.panel-scrollbar.dragging .panel-scrollbar-thumb,.panel-scrollbar:focus-visible .panel-scrollbar-thumb{background:#9aaabd;opacity:1}
      .plans{display:flex;gap:6px;margin-top:12px}.plan{flex:1;min-width:0;padding:9px 4px;background:#f4f7fb;border:1px solid transparent;color:#52647b;font-size:12px;text-align:center}.plan[aria-checked=true]{border-color:#2468ef;background:#edf4ff;color:#2468ef}.plan b,.plan small{display:block}.plan b{font-size:13px;margin-bottom:4px}.plan small{font-size:10px;margin-top:3px}#retry{margin-top:8px;font-size:12px}
      .rental{flex-shrink:0;border-radius:7px;padding:6px 8px;color:#fff;background:#2468ef;text-decoration:none;font-size:12px}.rental:hover{background:#1856cc}.rental.taiwu{background:#d83938}.rental.taiwu:hover{background:#b82d2c}.rental[aria-disabled=true]{background:#e2e7ee;color:#8390a2;cursor:default}
    </style>
    <section class="card" aria-label="租房小区选择助手">
      <header><h2>租房小区选择助手</h2><button class="close" aria-label="关闭租房小区选择助手">×</button></header>
      <div class="body"><section class="departure-section" aria-label="出发时间设置" hidden><span class="departure-label">出发时间</span><button class="time" id="departure-time" aria-label="调整出发时间">${config.departureLabel} 出发 ▾</button></section>
      <div class="fixed"><div id="destination-settings"></div><p id="settings-error" role="alert">正在读取终点设置…</p><button id="settings-retry" hidden>重试读取设置</button></div>
      <div class="rental-actions" hidden><a class="rental" id="rental" role="button" target="_blank" rel="noopener noreferrer" aria-disabled="true" tabindex="-1">查看贝壳房源</a><a class="rental taiwu" id="rental-taiwu" role="button" target="_blank" rel="noopener noreferrer" aria-disabled="true" tabindex="-1">查看太平洋房源</a></div>
      <section class="drive-section" aria-label="驾车通勤" hidden><h3 class="commute-title"><label class="route-visibility"><input id="show-driving" type="checkbox" aria-label="显示驾车路线" checked><span>驾车通勤</span></label></h3>
      <div class="plans" role="radiogroup" aria-label="路线偏好"></div>
      <div id="future-chart"></div></section>
      <div id="transit-results" hidden></div>
      <button id="retry" hidden>重新查询此起点</button>
      <div class="foot" hidden>数据来自高德未来用时预测；仅供出行参考。</div></div>
    </section>`;
  document.body.append(host);
  const $ = selector => shadow.querySelector(selector);
  const panelScrollbar=scrollbars.create($('.card'),shadow);
  const chart = charts.create($('#future-chart'),Date.parse(config.departure)/1000);
  const launcher = document.createElement('button');
  launcher.id='amap-commute-launcher';launcher.textContent='租房小区选择助手';launcher.title='开启租房小区选择助手';
  launcher.style.cssText='position:fixed;right:76px;top:78px;z-index:10000;background:#2468ef;color:#fff;border:0;border-radius:10px;padding:12px 16px;font:14px -apple-system,sans-serif;cursor:pointer;box-shadow:0 3px 12px #0003';
  launcher.hidden=true;document.body.append(launcher);
  let enabled = true, disposed = false, map = null, container = null;
  let sequence = 0, controller = null, debounce = null, poll = null;
  let gestureId=0;
  let down = null, last = null, history = [], overlays = [], count = 0;
  let selectedStrategy = config.strategy, selectedTransitId = '0', currentPoint = null, loading = false;
  const routeVisibility={driving:true,transit:true};
  let manualDeparture=null;
  let settings=destinations.normalizeSettings(),settingsReady=false;
  const destinationView=destinationViews.create($('#destination-settings'),{
    onSave:saveDestination,onOrigin:point=>select(point.lng,point.lat,false,point.name),onStageChange:syncFlowVisibility
  });
  const departurePicker=departurePickers.create($('#departure-time'),()=>config.departure,setDeparture);
  let originalHotspot = true;
  const cache = new Map();
  const namedMarkers = new Map();
  const transitView=transitViews.create($('#transit-results'),id=>{
    selectedTransitId=id;renderTransit();if(last)draw(last);
  });
  for(const [selector,mode] of [['#show-driving','driving'],['#show-transit','transit']]) {
    $(selector).addEventListener('change',()=>{routeVisibility[mode]=$(selector).checked;if(last)draw(last);});
  }
  function renderTransit() {
    transitView.render(last?.transit,selectedTransitId,loading,!!currentPoint,config.departureLabel,settings.destination);
  }
  function isResults(){return settingsReady&&!!settings.destination&&!!currentPoint&&destinationView.stage==='results';}
  function syncFlowVisibility(){
    const show=!!isResults();
    for(const selector of ['.departure-section','.rental-actions','.drive-section','#transit-results','.foot'])$(selector).hidden=!show;
    if(!show){$('#retry').hidden=true;clearOverlays();}else if(last)draw(last);
    syncRentalLinks();
  }
  function applySettings(value,refresh=true){
    const next=destinations.normalizeSettings(value),changed=destinations.signature(next)!==destinations.signature(settings);
    settings=next;settingsReady=true;
    if(!next.destination)currentPoint=null;
    config=Object.freeze({...config,destination:next.destination?.name||'',lng:next.destination?.lng??null,lat:next.destination?.lat??null,destinationId:next.destination?.id||'',transitDestination:next.destination});
    destinationView.update(settings);if(!next.destination)destinationView.setOrigin(null);$('#settings-error').hidden=true;$('#settings-retry').hidden=true;
    syncFlowVisibility();
    if(changed){cancel();cache.clear();history=[];last=null;loading=false;clearOverlays();chart.clear(settings.destination?'点击地图选择起点':'请先设置终点');renderPlans();$('#retry').hidden=true;
      if(refresh&&currentPoint&&!host.hidden&&map)select(currentPoint.lng,currentPoint.lat,true,currentPoint.name);}
  }
  async function saveDestination(point){
    const next=destinations.normalizeSettings({...settings,destination:point});
    const saved=await destinations.saveSettings(next);if(disposed)return;
    applySettings(saved);
  }
  async function loadSettings(){
    try {const saved=await destinations.loadSettings();if(!disposed)applySettings(saved);}
    catch(error){if(!disposed){$('#settings-error').textContent=error.message;$('#settings-error').className='error';$('#settings-retry').hidden=false;}}
  }
  const selectedPlan = result => result?.plans.find(plan=>plan.id===selectedStrategy);
  function setDeparture(value=null) {
    const next=value===null?data.nextDeparture():data.validateDeparture(value);
    manualDeparture=value===null?null:next.departure;
    changeDeparture(next);
  }
  function syncDeparture(refresh = true) {
    if(manualDeparture) {
      try { data.validateDeparture(manualDeparture);return false; }
      catch { manualDeparture=null; }
    }
    return changeDeparture(data.nextDeparture(),refresh);
  }
  function changeDeparture(next,refresh=true) {
    if(next.departure===config.departure)return false;
    // 先取消旧日期请求并清空预测，避免日期已更新但图表/路线仍属于昨天。
    cancel();config=Object.freeze({...config,...next});
    cache.clear();history=[];last=null;loading=false;clearOverlays();
    $('.time').textContent=`${config.departureLabel} 出发 ▾`;
    chart.setDeparture(Date.parse(config.departure)/1000);
    renderPlans();$('#retry').hidden=true;
    if(refresh && currentPoint && !host.hidden && map)select(currentPoint.lng,currentPoint.lat,true,currentPoint.name);
    return true;
  }
  function onResume() { if(!document.hidden)syncDeparture(); }
  function renderPlans() {
    $('.cp-chart').setAttribute('data-strategy',selectedStrategy);
    $('.plans').replaceChildren();
    for(const strategy of data.STRATEGIES) {
      const plan=last?.plans.find(item=>item.id===strategy.id),forecast=plan?.forecast;
      const button=document.createElement('button');button.className='plan';button.setAttribute('role','radio');
      button.setAttribute('aria-checked',String(selectedStrategy===strategy.id));button.setAttribute('aria-label',strategy.label);
      const label=document.createElement('b');label.textContent=strategy.label;
      const duration=document.createElement('span');duration.textContent=forecast?`${forecast.minutes}分钟`:!settings.destination?'设置终点':loading?'查询中…':plan?.error?'暂无预测':'选择起点';
      const detail=document.createElement('small');detail.textContent=forecast?`${(forecast.path.distance/1000).toFixed(1)}公里 · ${forecast.tolls==null?'收费未知':forecast.tolls===0?'无收费':`¥${forecast.tolls}`}`:plan?.error?'可重新查询':'—';
      button.append(label,duration,detail);
      button.addEventListener('click',()=>{ selectedStrategy=strategy.id;renderPlans();if(last){show(last);} });
      $('.plans').append(button);
    }
    renderTransit();
  }
  const rentalLinks=[['#rental',places.rentalUrl],['#rental-taiwu',places.taiwuRentalUrl]];
  function syncRentalLinks() {
    for(const [selector,buildUrl] of rentalLinks) {
      const link=$(selector),url=isResults()?buildUrl(currentPoint?.name):null;
      if(url)link.href=url;else link.removeAttribute('href');
      link.setAttribute('aria-disabled',String(!url));link.tabIndex=url?0:-1;
    }
  }
  function renderOrigin() {
    destinationView.setOrigin(currentPoint);
    syncRentalLinks();
  }
  for(const [selector,buildUrl] of rentalLinks) {
    $(selector).addEventListener('click',event=>{if(!isResults()||!buildUrl(currentPoint?.name))event.preventDefault();});
    $(selector).addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();if(isResults()&&buildUrl(currentPoint?.name))$(selector).click();}});
  }
  function clearOverlays() {
    for (const overlay of overlays) overlay.setMap(null);
    overlays = [];
  }
  function cancel() {
    sequence++;
    down=null;
    clearTimeout(debounce);
    controller?.abort();
    controller = null;
  }
  function marker(point, label, color) {
    const element = document.createElement('div');
    element.style.cssText = `padding:5px 10px;background:${color};border:2px solid white;border-radius:18px;color:white;font:bold 13px sans-serif;white-space:nowrap;box-shadow:0 2px 8px #0004;pointer-events:none;`;
    element.textContent = label;
    return new AMap.Marker({position:point,content:element,anchor:'bottom-center',zIndex:220,bubble:true,map});
  }
  function draw(result) {
    clearOverlays();
    if(!isResults())return;
    const forecast=selectedPlan(result)?.forecast;
    // 显隐只影响本工具覆盖物，数据、方案选择和图表不随勾选改变。
    if(routeVisibility.driving && settings.destination) {
      overlays=routes.draw(map,result.plans,selectedStrategy);
    }
    overlays.push(marker([result.lng,result.lat], `起 ${result.number}${routeVisibility.driving&&forecast?` · ${forecast.minutes}分钟`:''}`, '#2468ef'));
    const busRoute=result.transit?.routes?.find(route=>route.id===selectedTransitId);
    if(routeVisibility.transit && busRoute && settings.destination) {
      overlays.push(...transitRenderer.draw(map,busRoute));
    }
    if(settings.destination && (routeVisibility.driving||routeVisibility.transit))overlays.push(marker([settings.destination.lng,settings.destination.lat],`终点 · ${settings.destination.name}`,'#e45b55'));
  }
  function show(result) {
    if(syncDeparture(false) || result.departure!==config.departure || result.destinations!==destinations.signature(settings)) {
      select(result.lng,result.lat,true,result.name);return;
    }
    if(!result.transit?.routes?.some(route=>route.id===selectedTransitId))selectedTransitId=result.transit?.routes?.[0]?.id||'0';
    last = result;currentPoint={lng:result.lng,lat:result.lat,name:result.name};renderOrigin();renderPlans();
    const plan=selectedPlan(result),forecast=plan?.forecast;
    $('#retry').hidden=!isResults()||(!result.plans.some(item=>item.error)&&!result.transit?.error);
    draw(result);
    if(forecast)chart.render(forecast);else chart.clear(!settings.destination?'请先设置终点':plan?.error||'此方案暂无预测，请切换方案或重新查询');
  }
  async function query(lng, lat, ticket) {
    if (ticket !== sequence || disposed) return;
    if(syncDeparture())return;
    const requestConfig=config;
    controller = new AbortController();
    const activeController = controller;
    const timeout = setTimeout(() => activeController.abort(), 15000);
    try {
      const destinationKey=destinations.signature(settings),key = `${destinationKey}|${requestConfig.departure}|${lng.toFixed(6)},${lat.toFixed(6)}`;
      let result = cache.get(key);
      if (!result) {
        // 两种出行方式并行请求；单侧失败仍展示另一侧的真实结果。
        const [drive,bus]=await Promise.allSettled([
          requestConfig.destination?data.fetchPlans(requestConfig,lng,lat,activeController.signal):Promise.resolve([]),
          requestConfig.transitDestination?transit.fetchRoutes(requestConfig,lng,lat,activeController.signal):Promise.resolve({routes:[]})
        ]);
        const plans=drive.status==='fulfilled'?drive.value:data.STRATEGIES.map(strategy=>({...strategy,error:'驾车查询失败，请重试'}));
        const busResult=bus.status==='fulfilled'?bus.value:{routes:[],error:bus.reason?.name==='AbortError'?'公交查询超时，请重试':bus.reason?.message||'公交查询失败，请重试'};
        if(ticket!==sequence || disposed || syncDeparture())return;
        result = {lng,lat,plans,transit:busResult,departure:requestConfig.departure,destinations:destinationKey,number:++count};
        if(plans.every(plan=>plan.forecast) && !busResult.error)cache.set(key,result);
        if (cache.size > 30) cache.delete(cache.keys().next().value);
      }
      // 连续点选时，旧请求即使完成，也不能覆盖新起点的结果。
      if (ticket !== sequence || disposed || syncDeparture()) return;
      result={...result,name:currentPoint?.name||''};
      loading=false;
      history = [result,...history.filter(item => item.lng!==lng || item.lat!==lat)].slice(0,5);
      show(result);
    } catch (error) {
      if (ticket !== sequence || disposed || syncDeparture()) return;
      loading=false;renderPlans();$('#retry').hidden=!isResults();
      chart.clear(error.name === 'AbortError' ? '查询超时，请重新点选' : (error instanceof SyntaxError ? '高德返回异常，请在原页面检查是否需要验证' : error.message));
    } finally { clearTimeout(timeout); }
  }
  function select(lng,lat,force=false,name='') {
    if ((!enabled && !force) || !map || !Number.isFinite(lng) || !Number.isFinite(lat)) return;
    if(!settingsReady||!settings.destination)return;
    syncDeparture(false);
    cancel(); clearOverlays(); last = null;
    selectedTransitId='0';currentPoint={lng,lat,name:places.cleanName(name)};renderOrigin();loading=!!settings.destination;renderPlans();$('#retry').hidden=true;
    chart.clear(settings.destination?'正在加载每15分钟的预测…':'请先设置终点');
    if(!settings.destination)return;
    const ticket = sequence;
    debounce = setTimeout(() => query(lng,lat,ticket),250);
  }
  function onHotspot(event) {
    if(!enabled || disposed || down?.moved)return;
    const point=places.hotspotPoint(event);
    selectNamedPoint(point);
  }
  function selectNamedPoint(point) {
    if(!enabled || disposed || down?.moved)return;
    if(!point)return;
    // 同一次指针手势只推进一步，SDK的mouseup/click/热点重复事件不能把终点也设成起点。
    destinationView.pick(point,gestureId);down=null;
  }
  function bindNamedMarkers() {
    // 搜索结果用 LabelMarker 绘制名称，不触发底图 hotspotclick；只订阅有明确文本的标记。
    const visible=new Set(map?.getAllOverlays('marker')||[]);
    for(const [marker,handler] of namedMarkers)if(!visible.has(marker)){marker.off('click',handler);marker.off('mouseup',handler);namedMarkers.delete(marker);}
    for(const marker of visible) {
      if(namedMarkers.has(marker)||!places.markerPoint(marker))continue;
      const handler=()=>selectNamedPoint(places.markerPoint(marker));
      // 原生 click 处理会重建搜索标记；在抬起时先保留名称，拖动仍由 moved 标记排除。
      marker.on('mouseup',handler);marker.on('click',handler);namedMarkers.set(marker,handler);
    }
  }
  function namedPointAtTarget(target) {
    const markerElement=target.closest('.amap-marker');
    if(!markerElement)return null;
    const bounds=markerElement.getBoundingClientRect(),mapBounds=container.getBoundingClientRect();
    // 搜索图钉的透明图片会盖住文字，并吞掉 DOM click。只匹配该图钉范围内的名称标记坐标。
    const matches=[];
    for(const marker of namedMarkers.keys()) {
      const point=places.markerPoint(marker);if(!point)continue;
      const pixel=map.lngLatToContainer(new AMap.LngLat(point.lng,point.lat));
      const x=pixel.getX()+mapBounds.left,y=pixel.getY()+mapBounds.top;
      if(x>=bounds.left-2 && x<=bounds.right+2 && y>=bounds.top-2 && y<=bounds.bottom+2)matches.push(point);
    }
    return matches.length===1?matches[0]:null;
  }
  function onDown(event) {
    gestureId++;bindNamedMarkers();down={x:event.clientX,y:event.clientY,moved:false,namedPoint:namedPointAtTarget(event.target)};
  }
  function onMove(event) { if (down && Math.hypot(event.clientX-down.x,event.clientY-down.y)>6) down.moved=true; }
  function onClick(event) {
    if (!enabled || event.button !== 0 || !down || down.moved) return;
    // 地图控件保留原行为；拖拽距离超过阈值不视为点选。
    if (event.target.closest('.amap-controls,.amap-control,.amap-info,button,a,input')) return;
    const rect = container.getBoundingClientRect();
    const point = map.containerToLngLat(new AMap.Pixel(event.clientX-rect.left,event.clientY-rect.top));
    const gesture=down;
    // LabelMarker 的点击在冒泡阶段处理。先让 SDK 派发名称事件，再把无名称的点击作为坐标点。
    setTimeout(()=>{
      if(down!==gesture || !enabled || disposed)return;
      if(gesture.namedPoint)selectNamedPoint(gesture.namedPoint);
      else {selectNamedPoint({lng:point.getLng(),lat:point.getLat(),name:''});down=null;}
    },0);
  }
  function connect() {
    const element = document.getElementById('amap-global-container');
    if (!element?.amap || !window.AMap) return;
    if (container === element && map === element.amap) {bindNamedMarkers();return;}
    if (container) detach();
    container=element; map=element.amap;
    // 保留热点点击以取得高德提供的地点名称；暂停或卸载时恢复页面原状态。
    originalHotspot = map.getStatus().isHotspot;
    if (enabled) map.setStatus({isHotspot:true});
    map.on('hotspotclick',onHotspot);
    bindNamedMarkers();
    container.addEventListener('pointerdown',onDown,true);
    container.addEventListener('pointermove',onMove,true);
    container.addEventListener('pointerup',onClick,true);
    container.addEventListener('click',onClick,true);
  }
  function detach() {
    for(const [marker,handler] of namedMarkers){marker.off('click',handler);marker.off('mouseup',handler);}
    namedMarkers.clear();
    map?.off('hotspotclick',onHotspot);
    if (map && !map.destroyed) map.setStatus({isHotspot:originalHotspot});
    container?.removeEventListener('pointerdown',onDown,true);
    container?.removeEventListener('pointermove',onMove,true);
    container?.removeEventListener('pointerup',onClick,true);
    container?.removeEventListener('click',onClick,true);
  }
  function close() {
    destinationView.close();
    departurePicker.close();
    enabled=false;cancel();loading=false;clearOverlays();
    if(map)map.setStatus({isHotspot:originalHotspot});
    host.hidden=true;launcher.hidden=false;
  }
  function open() {
    host.hidden=false;launcher.hidden=true;enabled=true;
    if(map)map.setStatus({isHotspot:true});
    syncDeparture(false);
    if(last)show(last);
    else if(currentPoint)select(currentPoint.lng,currentPoint.lat,true,currentPoint.name);
    else { renderOrigin();renderPlans();chart.clear(); }
  }
  function destroy() { disposed=true;destinationView.destroy();panelScrollbar.destroy();departurePicker.destroy();cancel();clearInterval(poll);window.removeEventListener('focus',onResume);document.removeEventListener('visibilitychange',onResume);detach();clearOverlays();host.remove();launcher.remove();delete window.__amapCommutePicker; }
  $('.close').addEventListener('click',close);
  launcher.addEventListener('click',open);
  $('#settings-retry').addEventListener('click',loadSettings);
  $('#retry').addEventListener('click',()=>{if(currentPoint)select(currentPoint.lng,currentPoint.lat,true,currentPoint.name);});
  const summarize = item => ({transit:item.transit&&{error:item.transit.error,routes:item.transit.routes.map(route=>({id:route.id,seconds:route.seconds,distance:route.distance,walkMeters:route.walkMeters,fare:route.fare,lines:route.legs.map(leg=>leg.name)}))},lng:item.lng,lat:item.lat,number:item.number,name:item.name,plans:item.plans.map(plan=>({id:plan.id,label:plan.label,error:plan.error,
    minutes:plan.forecast?.minutes,distance:plan.forecast?.path.distance,tolls:plan.forecast?.tolls,
    traffic:routes.trafficSegments(plan.forecast?.tmcs).reduce((counts,segment)=>(counts[segment.status]=(counts[segment.status]||0)+1,counts),{})}))});
  window.__amapCommutePicker = {version:'0.11.1',open,close,destroy,select,setDeparture,saveDestination,get config(){return config;},getState:()=>({settings:destinations.normalizeSettings(settings),settingsReady,stage:destinationView.stage,editingDestination:destinationView.editing,pickingDestination:destinationView.picking,enabled,loading,visible:!host.hidden,connected:!!map,routeVisibility:{...routeVisibility},departureMode:manualDeparture?'manual':'auto',sequence,selectedStrategy,selectedTransitId,origin:currentPoint&&{...currentPoint},rentalUrl:isResults()?places.rentalUrl(currentPoint?.name):null,taiwuRentalUrl:isResults()?places.taiwuRentalUrl(currentPoint?.name):null,
    history:history.map(summarize),last:last&&{...summarize(last),minutes:selectedPlan(last)?.forecast?.minutes,series:selectedPlan(last)?.forecast?.series}})};
  window.addEventListener('focus',onResume);document.addEventListener('visibilitychange',onResume);
  renderOrigin();renderPlans();connect(); poll=setInterval(()=>{syncDeparture();connect();},1500);
  window.__amapCommutePicker.ready=loadSettings();
})();

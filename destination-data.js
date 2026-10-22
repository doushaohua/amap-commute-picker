/* 复用高德原生地点信息、终点校验和扩展本地设置；不把任意搜索文本当作终点。 */
(() => {
  'use strict';
  const SETTINGS_KEY='commuteDestinationsV1';
  const text=value=>typeof value==='string'?value.trim().slice(0,200):'';
  function normalize(value) {
    if(!value || !text(value.name))return null;
    const lng=Number(value.lng),lat=Number(value.lat);
    if(value.lng==null || value.lat==null || String(value.lng).trim()==='' || String(value.lat).trim()==='' || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng)>180 || Math.abs(lat)>90)return null;
    return {name:text(value.name),lng,lat,id:text(value.id),address:text(value.address)};
  }
  function normalizeSettings(value) {
    const destination=normalize(value?.destination)||normalize(value?.driving)||normalize(value?.transit);
    return {schema:3,destination};
  }
  const signature=settings=>JSON.stringify(normalizeSettings(settings).destination);
  function readNativePlace() {
    const id=location.pathname.match(/\/ssr\/place\/([^/]+)/)?.[1];
    const name=document.querySelector('h1')?.textContent?.trim();
    const address=document.querySelector('[class*="BasicInfo_addressText"]')?.textContent?.trim();
    return id&&name?{id,name,address:address||''}:null;
  }
  function detail(point,signal,readImpl=readNativePlace) {
    const selected=normalize(point);if(!selected)return Promise.reject(new Error('请选择有效的地图地点'));
    // 读取用户已打开的高德详情，不重复请求地点接口，也不猜附近地址或入口。
    return new Promise((resolve,reject)=>{
      let timer,attempts=0;
      function cleanup(){clearTimeout(timer);signal?.removeEventListener('abort',abort);}
      function abort(){cleanup();reject(Object.assign(new Error('已取消地点选择'),{name:'AbortError'}));}
      function check(){
        if(signal?.aborted){abort();return;}
        const native=readImpl();
        // 原生路由先更新ID、React标题后更新；ID和名称都一致才可读取地址。
        if(native && selected.id && native.id===selected.id && native.name===selected.name && native.address){
          cleanup();resolve(normalize({...selected,address:native.address}));return;
        }
        // 空白点直接保留坐标；有名称的点短暂等待原生详情完成渲染。
        if(!selected.id || ++attempts>=20){cleanup();resolve(selected);return;}
        timer=setTimeout(check,100);
      }
      signal?.addEventListener('abort',abort,{once:true});check();
    });
  }
  // MAIN 只发送白名单设置请求；Chrome API 留在 ISOLATED 桥接中。
  function request(action,value) {
    return new Promise((resolve,reject)=>{
      const id=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timer=setTimeout(()=>{cleanup();reject(new Error('本地设置未连接，请刷新高德页面'));},6000);
      function cleanup(){clearTimeout(timer);window.removeEventListener('message',receive);}
      function receive(event){
        const message=event.data;
        if(event.source!==window || event.origin!==location.origin || message?.channel!=='amap-commute-settings-v3-response' || message.id!==id)return;
        cleanup();if(message.error)reject(new Error(message.error));else resolve(normalizeSettings(message.value));
      }
      window.addEventListener('message',receive);
      window.postMessage({channel:'amap-commute-settings-v3-request',id,action,value:action==='save'?normalizeSettings(value):undefined},location.origin);
    });
  }
  const api={SETTINGS_KEY,normalize,normalizeSettings,signature,readNativePlace,detail,loadSettings:()=>request('load'),saveSettings:value=>request('save',value)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.__amapCommuteDestinations=api;
})();

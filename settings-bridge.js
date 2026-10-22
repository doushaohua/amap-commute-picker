/* 扩展隔离环境：仅允许当前高德窗口读写这一项本地设置。 */
(() => {
  'use strict';
  window.__amapCommuteSettingsBridge?.destroy?.();
  const data=globalThis.__amapCommuteDestinations;
  // 串行化读写，避免终点加载与保存互相覆盖。
  let pending=Promise.resolve();
  function receive(event){
    const message=event.data;
    if(event.source!==window || event.origin!==location.origin || message?.channel!=='amap-commute-settings-v3-request' || typeof message.id!=='string' || !['load','save'].includes(message.action))return;
    pending=pending.then(async()=>{
      try {
        let value;
        if(message.action==='save') {
          value=data.normalizeSettings(message.value);
          await chrome.storage.local.set({[data.SETTINGS_KEY]:value});
        } else {
          const raw=(await chrome.storage.local.get(data.SETTINGS_KEY))[data.SETTINGS_KEY];value=data.normalizeSettings(raw);
          if(raw && raw.schema!==3)await chrome.storage.local.set({[data.SETTINGS_KEY]:value});
        }
        window.postMessage({channel:'amap-commute-settings-v3-response',id:message.id,value},location.origin);
      } catch {
        window.postMessage({channel:'amap-commute-settings-v3-response',id:message.id,error:'无法保存本地设置，请重新加载扩展并刷新页面'},location.origin);
      }
    });
  }
  window.addEventListener('message',receive);
  window.__amapCommuteSettingsBridge={destroy(){window.removeEventListener('message',receive);}};
})();

// 工具栏入口只操作高德标签页；无全站或 Cookie 权限。
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !tab.url?.startsWith('https://www.amap.com/')) {
    await chrome.tabs.create({url:'https://www.amap.com/ssr/search'});
    return;
  }
  try {
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:'ISOLATED',files:['destination-data.js','settings-bridge.js']});
    await chrome.scripting.executeScript({
      target:{tabId:tab.id},world:'MAIN',
      files:['future-data.js','departure-picker.js','future-chart.js','route-renderer.js','place-links.js','transit-data.js','transit-renderer.js','transit-view.js','panel-scrollbar.js','destination-data.js','destination-view.js','commute-picker.js']
    });
    await chrome.action.setBadgeText({tabId:tab.id,text:''});
  } catch {
    await chrome.action.setBadgeText({tabId:tab.id,text:'!'});
    await chrome.action.setTitle({tabId:tab.id,title:'请刷新高德页面后再开启租房小区选择助手'});
  }
});

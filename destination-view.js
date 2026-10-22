/* 点图分步流程：介绍 → 终点 → 起点 → 结果。更改终点必须显式进入编辑。 */
(() => {
  'use strict';
  function create(container,actions) {
    const data=window.__amapCommuteDestinations;
    // 与扩展图标共用地图找房图形；内联以免增加页面资源权限。
    const logo=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path d="M784.681938 345.68102c0-156.149363-122.879632-282.727223-274.448676-282.727223-151.587464 0-274.465049 126.57786-274.465049 282.727223 0 154.813948 269.794679 458.030831 274.401604 466.936665 1.695618-7.896854 274.512121-312.818565 274.512121-466.936665z m-405.66109-0.056282c0-74.632791 58.734706-135.122467 131.211391-135.122467 72.458265 0 131.211391 60.490699 131.21139 135.122467 0 74.616418-58.753125 135.12349-131.21139 135.123491-72.476685 0-131.211391-60.507072-131.211391-135.123491z m131.211391 467.162816a0.461511 0.461511 0 0 0-0.064469-0.168845c-0.021489 0.103354-0.008186 0.168846 0.064469 0.168845z m363.171369-163.15594c-8.844435-15.20326-27.649733-24.305569-50.89311-24.305569h-87.719854c-15.34857 0-37.406958 9.724479-52.832276 25.14775-46.636157 63.302745-142.212956 175.910429-152.519695 188.630125-9.0624 11.184737-30.645974 11.001565-39.711444 0-7.729032-9.357112-104.018052-128.216173-154.090471-190.312441-13.376659-13.414521-23.738657-23.466458-49.579185-23.466457h-88.886423c-19.023262 0-39.693024 5.739724-50.730405 25.366737-27.339672 48.684816-85.324294 149.598156-85.324294 149.598156 0 27.611871 22.330588 49.998741 49.888224 49.998741h261.601066c30.117948 0 35.636638 3.034103 54.69674 25.254174 31.778774 37.098943 64.729234 75.511811 68.457138 79.751369 6.396687 7.348362 21.63781 7.455809 28.034497 0 4.988618-5.812379 36.694737-44.369533 68.601424-80.114643 19.062148-21.328771 24.74559-24.889877 55.846936-24.889876h261.19993c27.558659 0 49.90869-22.38687 49.90869-49.998741 0-0.001023-58.133002-102.814644-85.947488-150.659325z" fill="#2468ef" /></svg>`;
    let destination=null,origin=null,stage='intro',editing=false,busy=false,ready=false,disposed=false,revision=0,controller=null,lastGesture=null;
    container.innerHTML=`<style>
      .flow-intro h3,.flow-prompt h3{font-size:16px;color:#223c5a;margin:0 0 8px}.flow-intro p,.flow-prompt p{font-size:13px;color:#65758a;line-height:1.7;margin:0 0 12px}
      .flow-heading{display:flex;align-items:center;gap:10px;margin-bottom:10px}.flow-heading h3{margin:0}.flow-heading>div{min-width:0}.flow-logo{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:12px;background:#e7efff}.flow-logo svg{display:block;width:32px;height:32px}.flow-prompt .flow-logo{width:38px;height:38px;border-radius:10px}.flow-prompt .flow-logo svg{width:28px;height:28px}
      .flow-start{width:100%;background:#2468ef;color:#fff;padding:9px 10px}.flow-start:hover{background:#1856cc}.flow-start:disabled{opacity:.5;cursor:default}
      .flow-step{display:block;font-size:11px;color:#2468ef;margin-bottom:6px}.flow-prompt{padding-top:2px}.point-rows:not([hidden])+.flow-prompt{margin-top:12px;border-top:1px solid #dce5ef;padding-top:12px}
      .point-row{display:flex;align-items:center;gap:8px}.point-row+.point-row{margin-top:8px;border-top:1px solid #e1e8f1;padding-top:8px}.point-row strong{font-size:13px;color:#223c5a;flex-shrink:0}.point-row span{font-size:13px;font-weight:600;color:#223c5a;flex:1;min-width:0;overflow-wrap:anywhere}.point-row button{font-size:12px;padding:4px 8px;flex-shrink:0}
      .flow-message{font-size:12px;color:#65758a;margin-top:8px}.flow-message:empty{display:none}.flow-message.error{color:#b33b3b}
      .flow-intro[hidden],.point-rows[hidden],.point-row[hidden],.flow-prompt[hidden]{display:none}
    </style><section class="flow-intro" aria-label="功能介绍"><div class="flow-heading"><span class="flow-logo" aria-hidden="true">${logo}</span><h3>在地图上找到合适的租房小区</h3></div><p>固定通勤终点后，任意点击地图上的小区，即可查看该小区到终点的驾车、公共交通路线和用时。</p><p>继续点击其他小区，就能快速切换起点、比较通勤，并查看对应房源；终点保持不变。</p><button class="flow-start" disabled>先在地图上选择终点</button></section>
    <div class="point-rows" hidden><div class="point-row" id="origin-row"><strong>起：</strong><span id="origin-name"></span></div><div class="point-row"><strong>终：</strong><span id="destination-name"></span><button id="change-destination" aria-label="更改终点">更改</button></div></div>
    <section class="flow-prompt" aria-label="地图点选引导" hidden><div class="flow-heading"><span class="flow-logo" aria-hidden="true">${logo}</span><div><span class="flow-step"></span><h3></h3></div></div><p></p></section><div class="flow-message" role="status"></div>`;
    const $=selector=>container.querySelector(selector);
    function message(text='',error=false){$('.flow-message').textContent=text;$('.flow-message').classList.toggle('error',error);}
    function render(){
      $('.flow-intro').hidden=stage!=='intro';$('.flow-start').disabled=!ready||busy;
      $('.point-rows').hidden=!destination;$('#origin-row').hidden=stage!=='results';
      $('#origin-name').textContent=origin?.name||'地图选点';$('#destination-name').textContent=destination?.name||'';$('#destination-name').title=destination?.address||'';
      const change=$('#change-destination');change.disabled=busy;change.textContent=editing?'取消':'更改';change.setAttribute('aria-label',editing?'取消更改终点':'更改终点');
      $('.flow-prompt').hidden=!['destination','origin'].includes(stage);
      $('.flow-step').textContent=stage==='destination'?(editing?'修改通勤终点':'第 1 步 · 共 2 步'):'第 2 步 · 共 2 步';
      $('.flow-prompt h3').textContent=stage==='destination'?'请在地图上点击终点':'接下来，在地图上点击起点';
      $('.flow-prompt p').textContent=stage==='destination'?'点击工作地点或目的地，将它固定为通勤终点。之后可任意点选地图上的小区，快速比较通勤。':'终点已固定。在地图上任意点击小区作为起点，自动显示路线、用时和房源入口；继续点击其他小区，即可快速切换、比较通勤。';
      actions.onStageChange?.(stage);
    }
    $('.flow-start').addEventListener('click',()=>{if(!ready||busy)return;stage='destination';message();render();});
    $('#change-destination').addEventListener('click',()=>{
      if(busy)return;if(editing){close();return;}editing=true;stage='destination';message();render();
    });
    function close(){
      if(busy)return;
      revision++;controller?.abort();controller=null;
      if(editing){editing=false;stage=origin?'results':destination?'origin':'intro';}
      message();render();
    }
    async function pick(point,gesture){
      if(!ready||busy||disposed||stage==='intro'||(gesture!=null&&gesture===lastGesture))return;
      lastGesture=gesture??null;
      if(stage!=='destination'){
        if(!destination)return;origin={...point,name:point.name||''};stage='results';actions.onOrigin(origin);message();render();return;
      }
      const ticket=++revision;busy=true;controller=new AbortController();message('正在设置终点…');render();
      try{
        const selected=await data.detail({...point,name:point.name||'地图选点'},controller.signal);if(disposed||ticket!==revision)return;
        await actions.onSave(selected);if(disposed||ticket!==revision)return;
        destination=selected;editing=false;stage=origin?'results':'origin';message();
      }catch(error){if(!disposed&&ticket===revision&&error.name!=='AbortError')message(error.message,true);}
      finally{if(!disposed&&ticket===revision){busy=false;render();}}
    }
    return {update(value){destination=data.normalizeSettings(value).destination;ready=true;if(!busy&&!editing)stage=destination?(origin?'results':'origin'):'intro';render();},
      setOrigin(value){origin=destination?value:null;if(!busy&&!editing&&destination)stage=origin?'results':'origin';render();},pick,close,
      get stage(){return stage;},get editing(){return editing;},get picking(){return stage==='destination';},
      destroy(){disposed=true;revision++;controller?.abort();}};
  }
  window.__amapCommuteDestinationView={create};
})();

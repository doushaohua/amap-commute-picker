/* 复用高德网页实测的柱状图布局、尺寸和配色；数据全部来自高德。 */
(() => {
  'use strict';
  const formatDuration = minutes => minutes == null ? '—' : minutes >= 60 ? `${Math.floor(minutes/60)}小时${minutes%60?'\n'+minutes%60+'分':''}` : `${minutes}分`;
  const formatTime = timestamp => new Date((timestamp+28800)*1000).toISOString().slice(11,16);
  function create(container,departure) {
    container.innerHTML = `<style>
      .cp-chart{position:relative;background:#f5f5f5;border-radius:8px;padding:12px;color:rgba(0,0,0,.65);margin:14px 0 0}
      .cp-chart::before{content:"";position:absolute;top:-8px;left:calc((100% - 12px)/6);transform:translateX(-50%);border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #f5f5f5;pointer-events:none}
      .cp-chart[data-strategy="2"]::before{left:50%}.cp-chart[data-strategy="3"]::before{left:calc(100% - (100% - 12px)/6)}
      .cp-chart-title{font-size:14px;font-weight:500;line-height:20px;color:rgba(0,0,0,.88);margin-bottom:8px}
      .cp-chart-scroll{overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:#d5d9e0 transparent;outline-offset:2px}
      .cp-chart-row{display:flex;align-items:flex-end;gap:4px;padding:8px 0 4px;min-width:0}
      .cp-chart-item{display:flex;flex-direction:column;align-items:center;gap:4px;width:40px;flex-shrink:0}
      .cp-chart-duration{display:flex;flex-direction:column;align-items:center;justify-content:center;height:32px;line-height:16px;font-size:13px;white-space:pre-line;text-align:center}
      .cp-chart-track{width:20px;height:100px;background:#f0f0f0;border-radius:2px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
      .cp-chart-fill{width:100%;background:#a7c2f5;border-radius:0 0 2px 2px}
      .cp-chart-time{font-size:13px;line-height:18px}
      .cp-chart-item[aria-current=true]{color:#2273f7}
      .cp-chart-item[aria-current=true] .cp-chart-fill{background:#2273f7}

      .cp-chart-empty{font-size:12px;padding:12px 0}
    </style><div class="cp-chart"><div class="cp-chart-title">预计耗时对比</div>
    <div class="cp-chart-scroll" tabindex="0" aria-label="未来用时柱状图，可横向滚动查看全天"><div class="cp-chart-row" role="list"></div></div>
    <div class="cp-chart-empty">选择起点后显示每15分钟的预测</div></div>`;
    const $=selector=>container.querySelector(selector);
    function clear(message='选择起点后显示每15分钟的预测') {
      $('.cp-chart-row').replaceChildren();
      $('.cp-chart-empty').hidden=false;$('.cp-chart-empty').textContent=message;
    }
    function render(result) {
      clear();$('.cp-chart-empty').hidden=true;
      const available=result.series.filter(slot=>slot.minutes!=null).map(slot=>slot.minutes);
      const min=Math.min(...available),max=Math.max(...available);
      for (const slot of result.series) {
        const item=document.createElement('div');item.className='cp-chart-item';item.setAttribute('role','listitem');
        const time=formatTime(slot.timestamp),label=formatDuration(slot.minutes);
        item.setAttribute('aria-label',`${time} 出发，${slot.minutes==null?'暂无预测':label.replace('\n','')}`);
        item.setAttribute('aria-current',String(slot.timestamp===departure));
        const duration=document.createElement('span');duration.className='cp-chart-duration';duration.textContent=label;
        const track=document.createElement('div');track.className='cp-chart-track';track.title=item.getAttribute('aria-label');
        const fill=document.createElement('div');fill.className='cp-chart-fill';
        // 原生图以最短40%、最长100%展示对比；每根柱上始终显示真实分钟数。
        fill.style.height=slot.minutes==null?'0%':`${max===min?100:40+60*(slot.minutes-min)/(max-min)}%`;
        track.append(fill);
        const caption=document.createElement('span');caption.className='cp-chart-time';caption.textContent=time;
        item.append(duration,track,caption);$('.cp-chart-row').append(item);
      }

      requestAnimationFrame(()=>{
        const selected=$('[aria-current=true]'),scroll=$('.cp-chart-scroll');
        if(selected && container.isConnected) scroll.scrollLeft=selected.getBoundingClientRect().left-scroll.getBoundingClientRect().left+scroll.scrollLeft-scroll.clientWidth/2+selected.offsetWidth/2;
      });
    }
    return {render,clear,setDeparture(value) { departure=value;clear(); }};
  }
  const api={create,formatDuration,formatTime};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.__amapCommuteChart=api;
})();

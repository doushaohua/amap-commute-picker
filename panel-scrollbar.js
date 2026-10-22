/* 浮窗内的短滑块；内容仍使用原生滚动，避免比例滑块在轻微溢出时占满右侧。 */
(() => {
  'use strict';
  function create(scroller,root) {
    const track=document.createElement('div'),thumb=document.createElement('span');
    track.className='panel-scrollbar';thumb.className='panel-scrollbar-thumb';track.append(thumb);
    scroller.id='housing-panel-content';track.tabIndex=0;track.hidden=true;
    for(const [key,value] of Object.entries({role:'scrollbar','aria-label':'滚动助手内容','aria-controls':scroller.id,'aria-orientation':'vertical','aria-valuemin':'0','aria-valuemax':'0','aria-valuenow':'0'}))track.setAttribute(key,value);
    root.append(track);
    let drag=null;
    const limit=()=>Math.max(0,scroller.scrollHeight-scroller.clientHeight);
    const travel=()=>Math.max(0,track.clientHeight-thumb.offsetHeight);
    function sync() {
      const max=limit();track.hidden=max<=1;
      const top=Math.max(0,Math.min(max,scroller.scrollTop));
      thumb.style.transform=`translateY(${max?top/max*travel():0}px)`;
      track.setAttribute('aria-valuemax',String(Math.round(max)));track.setAttribute('aria-valuenow',String(Math.round(top)));
      track.setAttribute('aria-valuetext',`${max?Math.round(top/max*100):0}%`);
    }
    function onDown(event) {
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();
      track.focus({preventScroll:true});
      const rect=thumb.getBoundingClientRect();
      if(event.clientY<rect.top||event.clientY>rect.bottom){
        scroller.scrollTop=(event.clientY-track.getBoundingClientRect().top-thumb.offsetHeight/2)/Math.max(1,travel())*limit();
      }
      drag={y:event.clientY,top:scroller.scrollTop};track.setPointerCapture(event.pointerId);track.classList.add('dragging');sync();
    }
    function onMove(event) {
      if(!drag)return;
      event.preventDefault();scroller.scrollTop=drag.top+(event.clientY-drag.y)/Math.max(1,travel())*limit();sync();
    }
    function onUp(){drag=null;track.classList.remove('dragging');}
    function onWheel(event) {
      event.preventDefault();event.stopPropagation();
      scroller.scrollTop+=event.deltaY*(event.deltaMode===1?40:event.deltaMode===2?scroller.clientHeight:1);sync();
    }
    function onKey(event) {
      const offsets={ArrowDown:40,ArrowUp:-40,PageDown:scroller.clientHeight*.8,PageUp:-scroller.clientHeight*.8};
      if(event.key==='Home')scroller.scrollTop=0;
      else if(event.key==='End')scroller.scrollTop=limit();
      else if(event.key in offsets)scroller.scrollTop+=offsets[event.key];
      else return;
      event.preventDefault();event.stopPropagation();sync();
    }
    scroller.addEventListener('scroll',sync,{passive:true});
    track.addEventListener('pointerdown',onDown);track.addEventListener('pointermove',onMove);
    track.addEventListener('wheel',onWheel,{passive:false});
    track.addEventListener('pointerup',onUp);track.addEventListener('pointercancel',onUp);track.addEventListener('lostpointercapture',onUp);track.addEventListener('keydown',onKey);
    // 同时观察内容高度，展开公交方案时即使浮窗高度不变也需要更新滚动范围。
    const resize=new ResizeObserver(sync);resize.observe(scroller);for(const child of scroller.children)resize.observe(child);
    sync();
    return {destroy(){resize.disconnect();scroller.removeEventListener('scroll',sync);track.remove();}};
  }
  window.__amapCommutePanelScrollbar={create};
})();

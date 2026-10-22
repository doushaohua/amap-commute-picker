/* 复用高德 Ant Design 日历/时间列的页面样式；独立管理草稿，确认后才更改查询时间。 */
(() => {
  'use strict';
  function create(anchor,getDeparture,onChange) {
    const data=window.__amapCommuteData;
    let popup=null,draft='',month='',returnFocus=true;
    const pad=n=>String(n).padStart(2,'0');
    const element=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
    function close() {
      if(!popup)return;
      popup.remove();popup=null;anchor.setAttribute('aria-expanded','false');
      document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',position);
      if(returnFocus)anchor.focus();
    }
    function outside(event) { if(!event.composedPath().includes(anchor)&&!event.composedPath().includes(popup)){returnFocus=false;close();} }
    function onKey(event) {
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
      if(event.key==='Tab'&&popup){
        const controls=Array.from(popup.querySelectorAll('button:not(:disabled)'));
        if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
        else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
      }
    }
    function position() {
      if(!popup)return;
      const rect=anchor.getBoundingClientRect(),width=Math.min(402,window.innerWidth-16);
      popup.style.width=width+'px';popup.style.left=Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))+'px';
      popup.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-popup.offsetHeight-8))+'px';
    }
    function confirm(value=draft) {
      try { const next=value===null?null:data.validateDeparture(value).departure;onChange(next);close(); }
      catch(error){popup.querySelector('.cp-date-error').textContent=error.message;}
    }
    function render() {
      const focusLabel=popup.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
      popup.replaceChildren();
      const style=element('style');
      style.textContent=`#amap-commute-departure{position:fixed;z-index:10002;font:14px/22px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:rgba(0,0,0,.88)}
        #amap-commute-departure *{box-sizing:border-box}#amap-commute-departure button{font:inherit;cursor:pointer}
        #amap-commute-departure button:disabled{cursor:default;color:#bfbfbf}#amap-commute-departure button:focus-visible{outline:2px solid #3178f6;outline-offset:1px}
        #amap-commute-departure .ant-picker-panel-container{background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 6px 16px #00000014,0 3px 6px -4px #0000001f,0 9px 28px 8px #0000000d}
        #amap-commute-departure .ant-picker-datetime-panel{display:flex}#amap-commute-departure .ant-picker-date-panel{width:calc(100% - 113px)}
        #amap-commute-departure .ant-picker-time-panel{width:113px;border-left:1px solid #0505050f}#amap-commute-departure .ant-picker-header{height:41px;border-bottom:1px solid #0505050f;display:flex;align-items:center;padding:0 8px}
        #amap-commute-departure .ant-picker-header button{border:0;background:transparent;padding:0 8px}#amap-commute-departure .ant-picker-header-view{flex:1;text-align:center;font-weight:600}
        #amap-commute-departure .ant-picker-body{padding:8px 12px}#amap-commute-departure table{border-collapse:collapse;width:100%;table-layout:fixed;text-align:center}
        #amap-commute-departure th{font-weight:400;height:30px}#amap-commute-departure td{height:36px;padding:3px 0}
        #amap-commute-departure .ant-picker-cell-inner{border:0;background:transparent;padding:0;width:24px;height:24px;line-height:24px;border-radius:4px;text-align:center}
        #amap-commute-departure .ant-picker-cell-selected .ant-picker-cell-inner{background:#3178f6;color:#fff}#amap-commute-departure .ant-picker-cell-disabled{background:#00000004}
        #amap-commute-departure .ant-picker-time-panel-header{height:41px;line-height:40px;text-align:center;font-weight:600;border-bottom:1px solid #0505050f}
        #amap-commute-departure .ant-picker-time-panel-content{display:flex;height:260px}#amap-commute-departure .ant-picker-time-panel-column{list-style:none;padding:0;margin:0;width:56px;height:260px;overflow-y:auto;scrollbar-width:thin}
        #amap-commute-departure .ant-picker-time-panel-cell{padding:0 4px}#amap-commute-departure .ant-picker-time-panel-cell-inner{display:block;width:100%;height:28px;line-height:28px;border:0;background:transparent;border-radius:0;padding:0;text-align:center}
        #amap-commute-departure .ant-picker-time-panel-cell-selected .ant-picker-time-panel-cell-inner{background:#edf6ff}#amap-commute-departure .ant-picker-footer{border-top:1px solid #0505050f;padding:8px 12px;display:flex;align-items:center;gap:12px}
        #amap-commute-departure .cp-date-default{margin-right:auto;border:0;background:transparent;color:#3178f6;padding:0;font-size:12px}#amap-commute-departure .cp-date-cancel{border:0;background:transparent;padding:0;color:#666}
        #amap-commute-departure .cp-date-ok{border:0;border-radius:4px;background:#3178f6;color:white;padding:0 7px;height:24px}#amap-commute-departure .cp-date-error{color:#b33b3b;font-size:12px;padding:0 12px}#amap-commute-departure .cp-date-error:empty{display:none}`;
      popup.append(style);
      const panel=element('div','','ant-picker-panel-container ant-picker-datetime-panel-container'),body=element('div','','ant-picker-datetime-panel');
      const calendar=element('div','','ant-picker-date-panel'),header=element('div','','ant-picker-header'),bounds=data.departureBounds();
      for(const [label,delta] of [['上个月',-1],['下个月',1]]) {
        const b=element('button',delta<0?'‹':'›');b.setAttribute('aria-label',label);
        const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+delta);const target=next.toISOString().slice(0,7);
        b.disabled=target<bounds.min.slice(0,7)||target>bounds.max.slice(0,7);b.addEventListener('click',()=>{month=target;render();});
        if(delta>0)header.append(element('div',`${month.slice(0,4)}年 ${Number(month.slice(5))}月`,'ant-picker-header-view'));header.append(b);
      }
      calendar.append(header);
      const days=element('div','','ant-picker-body'),table=element('table','','ant-picker-content'),thead=element('thead'),tr=element('tr');
      for(const day of '一二三四五六日')tr.append(element('th',day));thead.append(tr);table.append(thead);
      const first=new Date(month+'-01T00:00:00Z');first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7);const tbody=element('tbody');
      for(let row=0;row<6;row++) {
        const tr=element('tr');
        for(let col=0;col<7;col++) {
          const date=first.toISOString().slice(0,10),disabled=date<bounds.min||date>bounds.max,selected=date===draft.slice(0,10);
          const cell=element('td','','ant-picker-cell'+(date.slice(0,7)===month?' ant-picker-cell-in-view':'')+(selected?' ant-picker-cell-selected':'')+(disabled?' ant-picker-cell-disabled':''));cell.title=date;
          const b=element('button',String(first.getUTCDate()),'ant-picker-cell-inner');b.disabled=disabled;b.setAttribute('aria-label','日期 '+date);b.setAttribute('aria-pressed',String(selected));
          b.addEventListener('click',()=>{draft=date+draft.slice(10);month=date.slice(0,7);render();});cell.append(b);tr.append(cell);first.setUTCDate(first.getUTCDate()+1);
        }
        tbody.append(tr);
      }
      table.append(tbody);days.append(table);calendar.append(days);body.append(calendar);
      const time=element('div','','ant-picker-time-panel');time.append(element('div',draft.slice(11,16),'ant-picker-time-panel-header'));
      const columns=element('div','','ant-picker-time-panel-content');
      for(const [label,offset,values] of [['小时',11,Array.from({length:24},(_,i)=>pad(i))],['分钟',14,['00','15','30','45']]]) {
        const list=element('ul','','ant-picker-time-panel-column');list.setAttribute('aria-label',label);
        for(const value of values) {
          const selected=draft.slice(offset,offset+2)===value,li=element('li','','ant-picker-time-panel-cell'+(selected?' ant-picker-time-panel-cell-selected':''));
          const b=element('button',value,'ant-picker-time-panel-cell-inner');b.setAttribute('aria-label',label+' '+value);b.setAttribute('aria-pressed',String(selected));
          b.addEventListener('click',()=>{draft=draft.slice(0,offset)+value+draft.slice(offset+2);render();});li.append(b);list.append(li);
        }
        columns.append(list);
      }
      time.append(columns);body.append(time);panel.append(body);
      const error=element('div','','cp-date-error');error.setAttribute('role','alert');panel.append(error);
      const footer=element('div','','ant-picker-footer');
      for(const [text,cls,handler] of [['恢复默认','cp-date-default',()=>confirm(null)],['取消','cp-date-cancel',close],['确定','cp-date-ok',()=>confirm()]]) {
        const b=element('button',text,cls);b.addEventListener('click',handler);footer.append(b);
      }
      panel.append(footer);popup.append(panel);position();
      if(focusLabel)Array.from(popup.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===focusLabel&&!e.disabled)?.focus();
      requestAnimationFrame(()=>{if(popup)for(const list of popup.querySelectorAll('ul')){const selected=list.querySelector('.ant-picker-time-panel-cell-selected');if(selected)list.scrollTop=Math.max(0,selected.offsetTop-list.offsetTop-4);}});
    }
    function open() {
      if(popup){close();return;}
      draft=getDeparture().slice(0,16);month=draft.slice(0,7);returnFocus=true;
      popup=element('div');popup.id='amap-commute-departure';popup.setAttribute('role','dialog');popup.setAttribute('aria-label','选择出发时间');
      // 页面已经加载的 Ant Design 样式直接复用，哈希从现有 CSS 获取，不访问高德 React 内部状态。
      const css=Array.from(document.querySelectorAll('style')).map(e=>e.textContent).join('\n');
      popup.className='ant-picker-dropdown ant-picker-css-var '+(css.match(/:where\(\.(css-[\w]+)\)\.ant-picker/)?.[1]||'')+' '+(css.match(/\.(css-var-[\w]+)\{--ant-blue/)?.[1]||'');
      document.body.append(popup);render();anchor.setAttribute('aria-expanded','true');popup.querySelector('[aria-pressed=true]:not(:disabled)')?.focus();
      document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',onKey,true);window.addEventListener('resize',position);
    }
    anchor.setAttribute('aria-haspopup','dialog');anchor.setAttribute('aria-expanded','false');anchor.addEventListener('click',open);
    return {close,destroy(){close();anchor.removeEventListener('click',open);}};
  }
  window.__amapCommuteDeparturePicker={create};
})();

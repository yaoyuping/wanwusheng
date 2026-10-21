/* 一隅 v4.6: non-destructive design enhancement. Existing IndexedDB schema and API routes unchanged. */
'use strict';
const v46PriorHome=homeView;
const v46PriorRecognize=recognizeView;
const v46PriorPlants=plantsView;
const v46PriorCare=careView;
const v46PriorPlantForm=plantForm;
const v46PriorPlantDetail=plantDetail;
const v46PriorAct=act;
const v46PriorRender=render;
const v46Positions={location:{'阳台':'☀','走廊':'▥','客厅':'⌂','卧室':'☾','厨房':'♨','院子':'❀'},light:{'直射光':'☀','散射光':'◒','补光灯':'✧'},status:{'健康':'♡','生病中':'✚','需关注':'!'},source:{'花店':'✿','网购':'▣','花鸟市场':'❀'}};
function v46Dashboard(){const plants=state?.plants||[],due=plants.filter(p=>p.reminder!==false&&plantStatus(p).due).length,pending=(state.tasks||[]).filter(t=>!t.done&&t.date<=stamp()).length;
 const watch=plants.filter(p=>p.status==='需关注'||p.status==='生病中').length;
 return `<div class="v46-dashline" aria-label="植物照料概览"><div class="v46-dashcard"><span class="v46-dash-symbol">❧</span><div><strong>${plants.length}</strong><small>我的植物</small></div></div><div class="v46-dashcard"><span class="v46-dash-symbol">✓</span><div><strong>${due+pending}</strong><small>待检查事项</small></div></div><div class="v46-dashcard"><span class="v46-dash-symbol">✧</span><div><strong>${watch}</strong><small>需要多关注</small></div></div></div><div class="v46-today-note"><span>☘</span><div>先看植物，再决定如何照料。浇水间隔是提醒检查的节奏，而非必须浇水的指令。</div><button class="outlined-btn small-btn" data-nav="care">去日历 →</button></div>`;}
homeView=function(){let html=v46PriorHome();const i=html.indexOf('</section>');if(i>=0&&html.includes('v4-welcome'))html=html.slice(0,i+10)+v46Dashboard()+html.slice(i+10);return html;};
plantsView=function(){let html=v46PriorPlants();const banner=`<section class="v46-page-intro"><div><span>MY GREEN COMPANIONS</span><h2>每一株都有自己的节奏</h2><p>浏览、查找与记录属于它们的日常。</p></div><i aria-hidden="true">❧</i></section>`;return banner+html;};
careView=function(){let html=v46PriorCare();const banner=`<section class="v46-page-intro"><div><span>CARE IN SMALL MOMENTS</span><h2>把照料写进日历</h2><p>每日只需一点时间，记录生长的变化。</p></div><i aria-hidden="true">▦</i></section>`;return banner+html;};
recognizeView=function(){let html=v46PriorRecognize();const flow=`<section class="v46-identify-flow" aria-label="植物识别步骤"><span><b>01</b> 上传同株照片</span><i>→</i><span><b>02</b> 对比候选图鉴</span><i>→</i><span><b>03</b> 核对并建档</span></section>`;
 const tip=ui.recognitionResults?.length&&Number(ui.recognitionResults[0]?.score||0)<.6?'<p class="v46-alert">当前首位结果的匹配分数较低，无法仅凭此结果确认物种。请结合照片特征进一步核实。</p>':'';
 return `<div class="v46-recognition-page">${flow}${html}${tip}</div>`;};
function v46DecorateSegments(form){for(const key of ['location','light','interval','source','status']){const select=form.querySelector(`select[name="${key}"]`);if(!select||select.closest('.v46-select-wrap'))continue;
 const parent=select.closest('.field');if(!parent)continue;parent.classList.add('v46-select-wrap');select.classList.add('v46-native-select');
 const box=document.createElement('div');box.className='v46-segment-row';box.setAttribute('role','group');box.setAttribute('aria-label',(parent.querySelector('label')?.textContent||key).trim());
 [...select.options].filter(o=>o.value).forEach(opt=>{const btn=document.createElement('button');btn.type='button';btn.className='v46-segment'+(select.value===opt.value?' active':'');btn.dataset.action='v46-pick';btn.dataset.key=key;btn.dataset.value=opt.value;btn.setAttribute('aria-pressed',select.value===opt.value?'true':'false');const symbol=v46Positions[key]?.[opt.value]|| (key==='interval'?'◷':'✦');btn.innerHTML=`<span aria-hidden="true">${symbol}</span>${esc(opt.textContent)}<span class="tick" aria-hidden="true">✓</span>`;box.append(btn)});select.after(box);
 } }
plantForm=function(pid=null,prefill={}){v46PriorPlantForm(pid,prefill);const form=$('#plant-form');if(!form)return;v46DecorateSegments(form);const header=document.querySelector('#modal-root .modal-header h2');if(header)header.textContent=pid?'编辑 · '+(state.plants.find(p=>p.id===pid)?.name||'植物档案'):'收下一株植物';};
plantDetail=function(pid,tab='info'){v46PriorPlantDetail(pid,tab);const p=state?.plants?.find(x=>x.id===pid);if(!p)return;
 const body=document.querySelector('#modal-root .v3-plant-body');if(!body||tab!=='info')return;const tokens=document.createElement('div');tokens.className='v46-detail-tokens';tokens.innerHTML=[['摆放位置',p.location||'未设置'],['光照条件',p.light||'未设置'],['检查周期',(Number(p.interval)||7)+'天']].map(([a,b])=>`<div><small>${esc(a)}</small><b>${esc(b)}</b></div>`).join('');body.prepend(tokens);
};
act=async function(action,el){
 if(action==='v46-pick'){const form=el.closest('form'),select=form?.querySelector(`select[name="${el.dataset.key}"]`);if(!select)return;select.value=el.dataset.value;const row=el.closest('.v46-segment-row');row?.querySelectorAll('.v46-segment').forEach(b=>{const chosen=b===el;b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen))});select.dispatchEvent(new Event('change',{bubbles:true}));return;}
 if(action==='v46-fab'){modal('快速记录 · 一隅',`<p class="subtle" style="margin:6px 0 15px">想为今天留下什么记录？</p><div class="v46-sheet-options"><button data-action="new-plant"><span>🪴</span>植物入驻</button><button data-action="new-sighting"><span>🌳</span>野外发现</button><button data-nav="recognize"><span>◎</span>拍照识别</button><button data-nav="care"><span>▦</span>养护日历</button></div>`);return;}
 return v46PriorAct(action,el);
};
function v46Fab(){let fab=document.getElementById('v46-fab');if(!fab){fab=document.createElement('button');fab.id='v46-fab';fab.className='v46-fab';fab.type='button';fab.dataset.action='v46-fab';fab.setAttribute('aria-label','快速记录');fab.innerHTML='<i aria-hidden="true">＋</i> 记录';document.body.append(fab)}
 const tab=ui.tab;fab.classList.toggle('show',['home','plants','atlas','care'].includes(tab));
 if(tab==='plants')fab.innerHTML='<i aria-hidden="true">＋</i> 新植物';else if(tab==='atlas')fab.innerHTML='<i aria-hidden="true">＋</i> 新发现';else fab.innerHTML='<i aria-hidden="true">＋</i> 记录';
}
render=function(){v46PriorRender();v46Fab();const app=$('#app');if(app){app.classList.add('v46-animations');if(ui.tab==='recognize'){const info=app.querySelector('.recognize-info');if(info&&!info.closest('.v46-know-details')){const detail=document.createElement('details');detail.className='v46-know-details';const title=document.createElement('summary');title.textContent='了解识别流程、来源与隐私保护';info.before(detail);detail.append(title,info);}}}};
// Reuse existing saving paths; do not write user data, image or location to GitHub or other services.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--v46-loaded','1')});
// The public GitHub Pages origin can use the user's existing Vercel endpoint; secrets stay server-side.
if(typeof yiyuAPIHost==='function'){
 const v46ExistingAPIHost=yiyuAPIHost;
 yiyuAPIHost=function(){const chosen=v46ExistingAPIHost();if(chosen)return chosen;return location.hostname==='yaoyuping.github.io'?'https://yiyu-plants-api.vercel.app':null;};
}
// Ensure the enhanced view is drawn after the asynchronous first-run database load.
(function v46InitialRedraw(){let tries=0;const repaint=()=>{if(typeof state!=='undefined'&&state){render();return}if(tries++<80)setTimeout(repaint,40)};repaint()})();

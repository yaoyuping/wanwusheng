/* 一隅 · 植物手记 v2 增强功能。与原版 v1 IndexedDB 数据结构兼容。 */
'use strict';
const V2_TYPES={
 '检查盆土':['✓','#199b78'],'浇水':['💧','#377fe0'],'施肥':['🌱','#199b78'],'病虫害':['🛡️','#d78a37'],
 '修剪':['✂️','#1e8eb3'],'换盆':['🪴','#d98257'],'拍照':['📷','#c49744'],
 '清理黄叶':['🍂','#b79851'],'生长观察':['🌿','#5b927a'],'自定义':['✎','#798087']
};
const V2_SECTIONS=['形态特征','分布与生境','栽培技术','主要价值','植物文化','近种区别'];
const v2escape=esc;
const v2Orig={act,handleSubmit,recognizeView,settingsView,homeView,render,identify};
ui.calendarMonth=stamp().slice(0,7);
ui.selectedDay=stamp();
ui.logFilter='全部';
ui.aiImage=null;
ui.aiFile=null;
ui.apiStatus=null;

function v2date(d){if(!d)return '';const a=d.split('-');return a.length===3?`${+a[1]}月${+a[2]}日`:d}
function v2time(l){return l.time?esc(l.time):''}
function v2iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function v2plusDate(s,n){const d=new Date(s+'T12:00:00');if(Number.isNaN(d.getTime()))return stamp();d.setDate(d.getDate()+n);return v2iso(d)}
function v2dayTasks(day){const actual=(state.tasks||[]).filter(t=>t.date===day);
 const water=state.plants.filter(p=>p.lastWatered).filter(p=>{const proposed=v2plusDate(p.lastWatered,Math.max(1,Number(p.interval)||7));return (proposed<stamp()?stamp():proposed)===day}).map(p=>({id:`check-${p.id}`,date:day,type:'浇水检查',name:p.name,plantId:p.id,generated:true}));
 return [...actual,...water];
}
function v2logCard(l,p){const sym=V2_TYPES[l.action]?.[0]||'✎';return `<div class="v2-log-card"><div class="v2-log-icon">${sym}</div><div class="v2-log-body"><div class="v2-log-head"><b>${esc(l.action||'养护')}</b>${v2time(l)?`<small>${v2time(l)}</small>`:''}</div>${l.note?`<p>${esc(l.note)}</p>`:''}${imageSrc(l.image)?`<img class="v2-log-photo" src="${esc(l.image)}" alt="养护记录照片">`:''}</div></div>`}
function v2timeline(logs,p){const sorted=[...logs].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.time||'').localeCompare(a.time||''));if(!sorted.length)return '<div class="v2-empty-hint">还没有养护记录。每次浇水、修剪、发现虫害或长出新叶，都可以留下照片和观察。</div>';
 return `<div class="v2-timeline">${[...new Set(sorted.map(l=>l.date))].map(d=>`<div class="v2-day-group"><div class="v2-date-title"><span class="v2-date-dot"></span><b>${esc(v2date(d))}</b><small>${esc(d?.slice(0,4)||'')}</small>${sorted.find(l=>l.date===d&&l.weather)?`<small class="v2-log-weather">${esc(sorted.find(l=>l.date===d&&l.weather).weather)} ${esc(sorted.find(l=>l.date===d&&l.weather).temperature||'')}</small>`:''}</div><div class="v2-day-entries">${sorted.filter(l=>l.date===d).map(l=>v2logCard(l,p)).join('')}</div></div>`).join('')}</div>`;
}

// ----- 完整的养护时间轴 -----
plantDetail=function(pid,tab='info'){
 const p=state.plants.find(x=>x.id===pid);if(!p)return;
 const x=plantStatus(p),logs=p.logs||[];ui.detailTab=tab;
 const actions=`<div class="v2-detail-actions"><button class="primary-btn" data-action="v2-add-log" data-id="${esc(pid)}">＋ 记录养护</button><button class="outlined-btn" data-action="v2-ai-care" data-id="${esc(pid)}">✧ AI 养护建议</button><button class="outlined-btn" data-action="v2-ai-diagnose" data-id="${esc(pid)}">☘ AI 健康诊断</button><button class="outlined-btn" data-action="edit-plant" data-id="${esc(pid)}">编辑档案</button></div>`;
 const info=`<div class="v2-profile-grid">${[
 ['到家日期',datePretty(p.acquired)],['摆放位置',p.location||'未设置'],['浇水检查间隔',(p.interval||7)+'天'],['最近浇水',datePretty(p.lastWatered)],
 ['光照条件',p.light||'未记录'],['健康状态',p.status||'未记录'],['购买渠道',p.source||'未记录'],['购买金额',p.price?'¥'+p.price:'未记录']
 ].map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div><section class="v2-subpanel"><h3>专属笔记</h3><p>${esc(p.notes||'还没有记录这株植物的习性。')}</p></section>`;
 const filters=['全部',...Object.keys(V2_TYPES)];
 const list=logs.filter(l=>ui.logFilter==='全部'||l.action===ui.logFilter);
 const history=`<div class="v2-filter-scroll">${filters.map(f=>`<button data-action="v2-log-filter" data-id="${esc(pid)}" data-type="${esc(f)}" class="filter-chip ${f===ui.logFilter?'active':''}">${esc(f)}</button>`).join('')}</div>${v2timeline(list,p)}`;
 const gallery=logs.filter(l=>imageSrc(l.image));
 const photos=`${gallery.length?`<div class="v2-gallery">${gallery.map(l=>`<figure><img src="${esc(l.image)}" alt="${esc(l.action)}"><figcaption>${datePretty(l.date)} · ${esc(l.action)}</figcaption></figure>`).join('')}</div>`:'<p class="subtle">相册还是空的。添加养护记录时上传照片，就会自动归档在这里。</p>'}`;
 modal(p.name,`<div class="v2-profile-cover">${imgTag(p.image,p.name)}<div class="v2-cover-text"><small>${esc(p.location||'我的植物')}</small><strong>${esc(p.name)}</strong><em>${esc(p.latin||'我的绿色伙伴')}</em></div></div><div class="v2-tabs"><button data-action="v2-plant-tab" data-id="${esc(pid)}" data-tab="info" class="${tab==='info'?'selected':''}">基本信息</button><button data-action="v2-plant-tab" data-id="${esc(pid)}" data-tab="logs" class="${tab==='logs'?'selected':''}">养护记录 <small>${logs.length}</small></button><button data-action="v2-plant-tab" data-id="${esc(pid)}" data-tab="photos" class="${tab==='photos'?'selected':''}">相册</button></div><div class="v2-tab-body">${tab==='info'?info:tab==='logs'?history:photos}</div>${actions}<div class="v2-care-footnote">${esc(x.text)}。提醒你检查植物状态，不代表必须浇水。</div>`);
};
newLog=function(pid){const p=state.plants.find(x=>x.id===pid);if(!p)return;
 modal('新养护记录 · '+p.name,`<form id="log-form" data-id="${esc(pid)}"><div class="v2-care-picker">${Object.entries(V2_TYPES).map(([k,[e]])=>`<label class="v2-care-option"><input type="radio" name="action" value="${esc(k)}" ${k==='浇水'?'checked':''}><span>${e}</span><small>${k}</small></label>`).join('')}</div><div class="form-grid">${textField('记录日期','date',stamp(),{type:'date'})}${textField('记录时间','time',new Date().toTimeString().slice(0,5),{type:'time'})}${textField('当天天气（可选）','weather','',{placeholder:'如：晴 / 阴 / 雨'})}${textField('温度（可选）','temperature','',{placeholder:'如：22°C'})}${textField('这次发现或做了什么','note','',{full:true,textarea:true,placeholder:'例如：擦拭黄叶、发现小黑飞、观察到新芽…'})}<div class="field full"><label for="v2-log-photo">可选：上传观察照片</label><input id="v2-log-photo" type="file" name="photo" accept="image/*"></div></div><div class="modal-actions"><button type="button" class="outlined-btn" data-action="close-modal">取消</button><button type="submit" class="primary-btn">保存记录</button></div></form>`);
};

// ----- 按月份浏览待办 + 历史完成事项 -----
careView=function(){
 const value=/^\d{4}-\d{2}$/.test(ui.calendarMonth)?ui.calendarMonth:stamp().slice(0,7),[yy,mm]=value.split('-').map(Number);
 const first=new Date(yy,mm-1,1),weekIndex=(first.getDay()+6)%7,days=new Date(yy,mm,0).getDate();
 const yearWeek=['一','二','三','四','五','六','日'];
 const list=Array.from({length:Math.ceil((weekIndex+days)/7)*7},(_,i)=>{
   const d=i-weekIndex+1;
   if(d<1||d>days)return '<div class="v2-calendar-cell blank"></div>';
   const key=`${value}-${String(d).padStart(2,'0')}`,tasks=v2dayTasks(key),today=stamp()===key,selected=ui.selectedDay===key;
   const logs=state.plants.flatMap(p=>(p.logs||[]).filter(l=>l.date===key));
   return `<button class="v2-calendar-cell ${today?'today':''} ${selected?'selected':''}" data-action="v2-select-day" data-day="${key}" aria-label="${d}号，${tasks.length}项任务，${logs.length}条记录"><strong>${d}</strong><span class="v2-cell-dots">${tasks.slice(0,2).map(t=>`<i class="${t.done?'complete':''}"></i>`).join('')}${logs.length?'<i class="done"></i>':''}</span></button>`;
 }).join('');
 const sel=ui.selectedDay||stamp(),dayTasks=v2dayTasks(sel);
 const dayLogs=state.plants.flatMap(p=>(p.logs||[]).filter(l=>l.date===sel).map(l=>({...l,plant:p.name,plantId:p.id}))).sort((a,b)=>(b.time||'').localeCompare(a.time||''));
 const pending=(state.tasks||[]).filter(x=>!x.done&&x.date<=stamp()).length;
 return `<div class="page-heading"><div><h1>养护日历</h1><p>把照顾草木的日常，慢慢记下来。</p></div><button class="primary-btn" data-action="v2-new-task">＋ 添加待办</button></div><div class="v2-calendar-layout"><section class="panel v2-calendar"><div class="v2-calendar-top"><div><small>CARE CALENDAR</small><h2>${yy}年 ${mm}月</h2></div><div class="v2-calendar-arrows"><button data-action="v2-month-prev" aria-label="上个月">‹</button><button data-action="v2-month-today">今天</button><button data-action="v2-month-next" aria-label="下个月">›</button></div></div><div class="v2-calendar-grid">${yearWeek.map(d=>`<div class="v2-weekday">${d}</div>`).join('')}${list}</div><div class="v2-calendar-legend"><span><i></i> 计划 / 浇水检查</span><span><i></i> 已有养护记录</span></div></section><section class="panel v2-agenda"><small class="v2-small-eyebrow">DAILY NOTES</small><h2>${esc(v2date(sel))} <small>${sel===stamp()?'今天':''}</small></h2><div class="v2-section-caption">待办 ${dayTasks.filter(task=>!task.done).length} · 已完成 ${dayTasks.filter(task=>task.done).length}</div>${dayTasks.length?dayTasks.map(t=>`<div class="v2-agenda-entry ${t.done?'v59-task-done':''}"><button type="button" role="checkbox" aria-checked="${Boolean(t.done)}" aria-label="${t.done?'恢复':'完成'}${esc(t.name||t.type)}的${esc(t.type)}" class="v59-task-check ${t.done?'v2-done-check':'v2-open-check'}" data-action="${t.generated?'v59-toggle-check':'v2-toggle-task'}" data-id="${esc(t.generated?t.plantId:t.id)}" data-day="${esc(sel)}">${t.done?'✓':'○'}</button><div><b>${esc(t.type)}</b><p>${esc(t.name||'')}</p></div><button type="button" class="v2-text-button" data-action="${t.generated?'v59-toggle-check':'v2-toggle-task'}" data-id="${esc(t.generated?t.plantId:t.id)}" data-day="${esc(sel)}">${t.done?'恢复':'完成'}</button>${t.generated?`<button type="button" class="v2-text-button" data-action="v2-open-plant" data-id="${esc(t.plantId)}">查看植物</button>`:''}<button type="button" class="v59-delete" data-action="v59-delete-task" data-id="${esc(t.id)}" data-plant-id="${esc(t.plantId||'')}" data-generated="${t.generated?'1':'0'}" aria-label="删除${esc(t.type)}待办">删除</button></div>`).join(''):'<p class="v2-empty-inline">这天暂时没有待办。</p>'}<div class="v2-section-caption">养护记录 ${dayLogs.length}</div>${dayLogs.length?dayLogs.map(l=>`<div class="v2-agenda-entry"><span>${V2_TYPES[l.action]?.[0]||'🌿'}</span><div><b>${esc(l.action)}</b><p>${esc(l.plant)} ${l.time?'· '+esc(l.time):''} ${l.note?'· '+esc(l.note):''}</p></div><button type="button" class="v59-delete" data-action="v59-delete-log" data-id="${esc(l.plantId)}" data-log-id="${esc(l.id)}" aria-label="删除${esc(l.plant)}的${esc(l.action)}记录">删除</button></div>`).join(''):'<p class="v2-empty-inline">暂无养护记录。</p>'}<button class="outlined-btn v2-agenda-add" data-action="v2-new-task" data-day="${sel}">＋ 添加该日待办</button></section></div><div class="intro-row"><h2 class="section-title">近期检查清单</h2><span class="subtle">${pending} 条手动待办未完成且已到期</span></div><div class="care-list">${state.plants.length?[...state.plants].sort((a,b)=>(plantStatus(a).days??999)-(plantStatus(b).days??999)).map(careItem).join(''):'<p class="subtle">添加植物后，可以设置浇水检查间隔。</p>'}</div><div class="v2-care-footnote">点击圆圈或“完成”可标记待办。完成“浇水检查”会保存盆土检查记录，不会改动上次浇水日期；未浇水时，次日仍会提醒检查。</div>`;
};
function v2TaskForm(day=ui.selectedDay){modal('新增养护待办',`<form id="v2-task-form"><div class="form-grid">${textField('计划日期','date',day||stamp(),{type:'date'})}<div class="field"><label for="v2-task-type">任务类型</label><select id="v2-task-type" name="type">${['检查盆土','施肥','病虫害检查','修剪','换盆','拍照','清理黄叶','生长观察','自定义'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field full"><label for="v2-task-plant">对应植物</label><select id="v2-task-plant" name="plantId"><option value="">不指定</option>${state.plants.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>${textField('备注','note','',{full:true,textarea:true})}</div><div class="modal-actions"><button class="outlined-btn" type="button" data-action="close-modal">取消</button><button class="primary-btn" type="submit">加入日历</button></div></form>`)}

// ----- 结构化植物图鉴 -----
const speciesExtra={
 '无患子':{
   morphology:'落叶乔木。叶通常为偶数羽状复叶，多个小叶沿叶轴排列；果实近球形，成熟后由黄变褐，果皮含皂苷。',
   habitat:'见于中国长江流域及以南等温暖地区；常栽于庭院、道路、公园和寺庙周边。喜光，也可耐一定弱光。',
   care:'适合露地种植；幼树注意疏松排水和水分管理。成年树木适应环境后，通常不需要密集浇水。',
   values:'果皮含皂苷，可用于传统清洁用途；也有观果、绿荫和园林树木价值。不要将它视为可随意使用的药品。',
   culture:'果核曾被制成念珠、串饰；“无患”的寓意与民俗及祈愿文化相联系。相关传说因地区而异。',
   diff:'与其他羽状复叶树种区分时，应同时观察小叶排列、叶形、果实结构及成熟颜色，而不是只看整树轮廓。'
 },
 '银杏':{
   morphology:'扇形叶片常带有二叉脉，长枝与短枝上的叶形不完全相同；秋季叶色转黄。',habitat:'原产中国，现广泛栽培于世界各地温带地区，常见于公园及历史园林。',care:'庭院种植宜保证一定日照、排水良好的土壤；移栽初期更需关注水分。',values:'长寿观赏树种，具有显著的季节景观价值。种子不可未经处理随意食用。',culture:'与古寺、书院、秋景相关联，常被视为悠久时光的象征。',diff:'扇形叶与二叉状脉是常用识别要点；不要仅靠秋叶变黄判断。'
 },
 '龙柏':{
   morphology:'圆柏常见的园艺品种，树冠常呈塔形，枝条具有向上或扭转的生长习性。',habitat:'园林观赏栽培多，常见于庭院、道路与公园。',care:'喜日照与排水，修剪以维持外形和通风为主，避免长期积水。',values:'四季常绿，有造型绿化、屏障和庭园装饰价值。',culture:'常绿柏类在东亚传统园林中具有庄重、持久的审美意涵。',diff:'龙柏与圆柏关系密切，主要以株形、枝态及园艺性状区分；仅凭局部枝条可能难以辨别。'
 },
 '圆柏':{
   morphology:'常绿乔木或灌木，可同时有针状和鳞片状叶，枝冠形态随树龄和园艺处理变化。',habitat:'在中国多地园林种植，常见于庭院、寺院和公园。',care:'偏好日照和排水良好的介质；盆景应结合盆土干湿与季节安排浇水。',values:'园林观赏、绿篱、造型盆景用途广泛。',culture:'松柏意象常与坚韧、岁寒和长青联系在一起。',diff:'与龙柏等圆柏园艺类型区别主要在树形与枝条生长特征。'
 }
};
function v2speciesSection(f,label){const x=speciesExtra[f.name]||{};return ({'形态特征':x.morphology||f.desc,'分布与生境':x.habitat||f.habitat,'栽培技术':x.care||'养护方式取决于物种、当地环境与栽种方式，建议结合具体条件进一步核对。','主要价值':x.values||'主要价值需要结合物种特征及可靠文献进一步核对。','植物文化':x.culture||f.culture,'近种区别':x.diff||'需要结合叶、花、果和生长形态综合鉴别。'})[label]}
speciesDetail=function(i){const f=flora[Number(i)];if(!f)return;
 modal(f.name,`<div class="v2-species-head"><div class="v2-species-cover">${imgTag(f.photo,f.name)}</div><h2>${esc(f.name)}</h2><p class="latin">${esc(f.latin)}</p><p class="v2-taxonomy">${esc(f.family)}</p><p class="v2-species-summary">${esc(f.desc)}</p></div><div class="v2-species-layout"><nav class="v2-species-toc" aria-label="物种章节">${V2_SECTIONS.map((s,j)=>`<a href="#v2-species-${j}">${j+1}. ${s}</a>`).join('')}</nav><div class="v2-species-content">${V2_SECTIONS.map((label,j)=>`<section id="v2-species-${j}" class="v2-species-section"><h3><span>${String(j+1).padStart(2,'0')}</span>${label}</h3><p>${esc(v2speciesSection(f,label))}</p></section>`).join('')}<p class="v2-care-footnote">当前是四种示例树木的简版百科。物种鉴定与医疗/药用信息仍需查证可靠资料。</p></div></div><div class="v2-detail-actions"><button class="primary-btn" data-action="collect-species" data-id="${Number(i)}">＋ 收藏一次野外发现</button><button class="outlined-btn" data-action="v2-ai-species" data-id="${Number(i)}">✧ 向 AI 提问</button></div>`);
};

// ----- 发现地点与定位 -----
sightingForm=function(sid=null,prefill={}){const s=state.sightings.find(x=>x.id===sid)||prefill;
 const coords=s.lat!==undefined&&s.lon!==undefined?{lat:s.lat,lon:s.lon}:null;
 modal(sid?'编辑观察记录':'新发现 · 野外植物',`<form id="sighting-form" data-id="${esc(sid||'')}"><div class="form-grid">${textField('植物名称 *','name',s.name||'',{required:true})}${textField('植物学名','latin',s.latin||'')}<div class="field full"><label for="fld-location">发现地点</label><div class="v2-location-line"><input id="fld-location" name="location" value="${esc(s.location||'')}" placeholder="地点名称，可手动修改"><button type="button" class="outlined-btn" data-action="v2-geolocate">${ico('pin',15)} 获取手机定位</button></div><small id="v2-coord-state" class="v2-coord-state">${coords?`已记录坐标：${(+coords.lat).toFixed(5)}, ${(+coords.lon).toFixed(5)}`:'仅点击定位按钮后才请求位置权限；你也可以仅填写文字地点。'}</small></div><input type="hidden" id="v2-lat" name="lat" value="${coords?.lat??''}"><input type="hidden" id="v2-lon" name="lon" value="${coords?.lon??''}">${textField('发现日期','date',s.date||stamp(),{type:'date'})}${textField('观察笔记','notes',s.notes||'',{full:true,textarea:true,placeholder:'它在哪里生长？叶片、花果有哪些特征？'})}<div class="field full"><label for="sighting-image">观察照片</label><div class="upload-preview" id="sighting-preview">${s.image?imgTag(s.image,s.name):'🌳 暂无照片'}</div><input type="file" id="sighting-image" name="image" accept="image/*"></div></div><div class="modal-actions">${sid?`<button type="button" class="danger-btn" data-action="delete-sighting" data-id="${esc(sid)}">删除发现</button>`:''}<button type="button" class="outlined-btn" data-action="close-modal">取消</button><button type="submit" class="primary-btn">保存发现</button></div></form>`);
};
sightingDetail=function(sid){const s=state.sightings.find(x=>x.id===sid);if(!s)return;const f=flora.find(x=>x.name===s.name);
 modal(s.name,`<div class="v2-profile-cover">${imgTag(s.image,s.name)}<div class="v2-cover-text"><small>自然观察</small><strong>${esc(s.name)}</strong><em>${esc(s.latin||'待确认学名')}</em></div></div><div class="v2-tab-body"><div class="v2-profile-grid"><div><span>发现日期</span><b>${datePretty(s.date)}</b></div><div><span>观察地点</span><b>${esc(s.location||'未记录')}</b></div></div><section class="v2-subpanel"><h3>当时的观察</h3><p>${esc(s.notes||'还没有留下观察笔记。')}</p></section>${f?`<section class="v2-subpanel"><h3>形态速览</h3><p>${esc(f.desc)}</p><button class="outlined-btn" data-action="v2-species-by-name" data-name="${esc(s.name)}">打开植物百科 →</button></section>`:''}</div><div class="v2-detail-actions"><button class="primary-btn" data-action="edit-sighting" data-id="${esc(sid)}">编辑观察记录</button></div>`);
};
async function v2getLocation(){const el=$('#v2-coord-state');if(!navigator.geolocation){toast('当前浏览器不支持定位');return}if(!isSecureContext){toast('手机定位需要 HTTPS 或 localhost 网站');return}if(el)el.textContent='正在请求手机位置授权…';navigator.geolocation.getCurrentPosition(async pos=>{
 const lat=pos.coords.latitude,lon=pos.coords.longitude;$('#v2-lat').value=lat;$('#v2-lon').value=lon;
 if(el)el.textContent=`已获取坐标（精度约 ${Math.round(pos.coords.accuracy)} 米），正在尝试获取地点名称…`;
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&accept-language=zh-CN`);if(!r.ok)throw Error('无法反查地址');const j=await r.json();const a=j.address||{};const human=[a.city||a.town||a.county||a.state,a.suburb||a.neighbourhood||a.village||a.road].filter(Boolean).join(' · ');if(human&&$('#fld-location')&&!$('#fld-location').value.trim())$('#fld-location').value=human;if(el)el.textContent=`✓ 已定位 (${lat.toFixed(5)}, ${lon.toFixed(5)})；你可以修改地点名称。`;
 }catch{if(el)el.textContent=`✓ 已保存精确坐标 (${lat.toFixed(5)}, ${lon.toFixed(5)})，地点名称可手动填写。`}
 },err=>{if(el)el.textContent='未获取定位：'+(err.code===1?'没有位置权限':err.code===2?'设备无法确定位置':'定位超时')+'。可手动填写地点。'},{enableHighAccuracy:true,timeout:14000,maximumAge:60000});}
// ----- DeepSeek 文本+图片真实调用 -----
function v2staticHosting(){return location.hostname.endsWith('github.io')||location.hostname.endsWith('netlify.app')||location.protocol==='file:'}
async function v2status(){if(v2staticHosting()){ui.apiStatus={deepseek:false,plantnet:false,protected:false,offline:true,staticHosting:true};return ui.apiStatus}try{const r=await fetch('/api/status',{cache:'no-store'});if(!r.ok)throw Error();ui.apiStatus=await r.json()}catch{ui.apiStatus={deepseek:false,plantnet:false,protected:false,offline:true}}return ui.apiStatus}
function v2password(){return sessionStorage.getItem('yiyu-ai-session-password')||''}
async function v2post(endpoint,data){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Yiyu-Password':v2password()},body:JSON.stringify(data)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||`请求失败（${r.status}）`);return j}
function v2aiModal(pid='',mode='care'){
 const p=state.plants.find(x=>x.id===pid);const choose=mode==='identify'?'identification':mode;
 ui.aiImage=null;ui.aiFile=null;
 modal(choose==='identification'?'✧ AI 看图识植物':choose==='diagnose'?'✧ AI 健康诊断':'✧ AI 养护助手',`<div class="v2-ai-modal"><p>使用 DeepSeek 根据${p?'「'+esc(p.name)+'」的档案与历史养护记录':'你提供的照片与描述'}提供参考分析。</p>${p?`<div class="v2-ai-plantline">${imgTag(p.image,p.name)}<div><b>${esc(p.name)}</b><small>已关联 ${p.logs?.length||0} 条养护记录</small></div></div>`:''}<div class="field full"><label for="v2-ai-question">你的问题</label><textarea id="v2-ai-question" placeholder="${choose==='diagnose'?'例如：最近叶片发黄，可能是什么原因？':choose==='identification'?'例如：请帮我看看这是什么植物？':'例如：根据最近一个月的记录，下周应该注意什么？'}"></textarea></div><div class="field full"><label for="v2-ai-image">${choose==='identification'?'植物照片（必须）':'补充照片（可选）'}</label><input type="file" id="v2-ai-image" accept="image/*"><div id="v2-ai-photo-preview" class="v2-ai-preview"></div></div><div class="v2-ai-privacy">仅点击“开始分析”后，照片、提问和必要的植物养护记录才会发送到 DeepSeek。不会自动写入养护档案。</div><button class="primary-btn" id="v2-ai-run" data-action="v2-ai-run" data-id="${esc(pid)}" data-mode="${choose}">✧ 开始 AI 分析</button><div id="v2-ai-result" aria-live="polite"></div></div>`);
}
function v2plantContext(p){return {name:p.name,latin:p.latin,location:p.location,acquired:p.acquired,light:p.light,status:p.status,lastWatered:p.lastWatered,interval:p.interval,notes:p.notes,logs:(p.logs||[]).slice(0,24).map(l=>({date:l.date,time:l.time,action:l.action,note:l.note}))}}
async function v2aiRun(pid,mode){const r=$('#v2-ai-result'),button=$('#v2-ai-run');if(!r)return;
 if(mode==='identification'&&!ui.aiImage){toast('请先选择植物照片');return}
 if(v2staticHosting()) {r.innerHTML='<div class="v2-ai-error">此静态网站已支持植物档案和养护管理，但 DeepSeek AI 后端尚未部署。接入独立服务端后即可使用。</div>';return;}
 button.disabled=true;r.innerHTML='<div class="v2-ai-loading">🌿 正在结合植物信息分析，一般需要一些时间……</div>';
 const plant=state.plants.find(x=>x.id===pid)||{};
 try{const j=await v2post('/api/ai',{mode:mode==='identification'?'identify':mode,plant:v2plantContext(plant),question:$('#v2-ai-question')?.value.trim()||'',image:ui.aiImage});r.innerHTML=`<div class="v2-ai-answer"><div class="v2-ai-answer-title">✧ DeepSeek 分析建议 <small>${esc(j.model)}</small></div><div class="v2-ai-answer-text">${esc(j.answer||'没有返回结果').replace(/\n/g,'<br>')}</div><button class="outlined-btn small-btn" data-action="v2-copy-ai">复制分析文字</button></div>`;
 }catch(e){r.innerHTML=`<div class="v2-ai-error">${esc(e.message)}。请检查服务端 API Key、余额、网络和访问口令。</div>`}finally{button.disabled=false}}
function v2settings(){return `<div class="panel v2-ai-settings"><div class="v2-ai-settings-head"><div><h3>✧ DeepSeek AI 植物助手</h3><p class="setting-desc">支持看图识植物、黄叶/虫害辅助排查、根据历史记录生成养护建议。</p></div><span class="v2-ai-state" id="v2-ai-status">检查连接中…</span></div><p>AI 密钥保存在你运行的网站服务端，不会写入浏览器、网页源代码或植物备份。</p><div class="field"><label for="v2-session-password">访问口令（仅当网站服务端启用了 APP_PASSWORD 时填写）</label><input type="password" id="v2-session-password" value="${esc(v2password())}" autocomplete="off" placeholder="个人站点访问口令"></div><div class="setting-actions"><button class="primary-btn" data-action="v2-save-password">保存本次会话口令</button><button class="outlined-btn" data-action="v2-refresh-api">检测 AI 接口</button></div><p class="setting-desc">打开前先运行 <code>node server.mjs</code>；在系统环境变量中配置 <code>DEEPSEEK_API_KEY</code>。远程使用请部署 HTTPS 并设置 APP_PASSWORD。</p></div>`}
recognizeView=function(){let s=v2Orig.recognizeView();const extra=`<div class="v2-ai-recognition panel"><div><h3>✧ 或用 DeepSeek 识别植物</h3><p>DeepSeek 看图分析名称和相似种，不生成虚构置信度。建议结合 Pl@ntNet 核对。</p></div><button class="primary-btn" data-action="v2-ai-identify">使用 DeepSeek 看图</button></div>`;
 return s+extra;
};
settingsView=function(){return v2settings()+v2Orig.settingsView()};
homeView=function(){return v2Orig.homeView()+`<section class="v2-ai-home"><div><span>✦ AI BOTANICAL ASSISTANT</span><h2>问问植物的近况</h2><p>依据你记录下的叶片、花盆与养护时间，给出更贴近生活的观察建议。</p></div><button class="primary-btn" data-action="v2-open-ai-home">✧ 打开植物助手</button></section>`};

// ----- 接管 v1 保存和操作，确保兼容既有档案 -----
handleSubmit=async function(form){
 if(form.id==='log-form'){
  const p=state.plants.find(x=>x.id===form.dataset.id);if(!p)return;
  const d=Object.fromEntries(new FormData(form).entries());const photo=d.photo?.size?await compress(d.photo):'';
  const log={id:id(),date:d.date||stamp(),time:d.time||'',action:d.action||'浇水',weather:(d.weather||'').trim(),temperature:(d.temperature||'').trim(),note:(d.note||'').trim(),image:photo};
  p.logs=p.logs||[];p.logs.unshift(log);if(log.action==='浇水'&&(!p.lastWatered||log.date>=p.lastWatered))p.lastWatered=log.date;
  state.isDemo=false;await save();plantDetail(p.id,'logs');render();toast('已保存养护记录');return;
 }
 if(form.id==='sighting-form'){
  const data=new FormData(form),lat=data.get('lat'),lon=data.get('lon'),existing=state.sightings.find(x=>x.id===form.dataset.id);
  const before=existing?existing.id:'';await v2Orig.handleSubmit(form);
  const target=before?state.sightings.find(x=>x.id===before):state.sightings[0];
  if(target&&data.get('name')?.trim()){
   if(lat!==''&&lon!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))){target.lat=Number(lat);target.lon=Number(lon)}else{delete target.lat;delete target.lon}
   await save();
  }
  return;
 }
 return v2Orig.handleSubmit(form);
};
act=async function(action,el){
 const pid=el.dataset.id;
 switch(action){
  case 'v2-plant-tab':plantDetail(pid,el.dataset.tab);return;
  case 'v2-add-log':newLog(pid);return;
  case 'v2-log-filter':ui.logFilter=el.dataset.type;plantDetail(pid,'logs');return;
  case 'v2-month-prev':case 'v2-month-next':{const [y,m]=ui.calendarMonth.split('-').map(Number);const d=new Date(y,m-1+(action==='v2-month-prev'?-1:1),1);ui.calendarMonth=v2iso(d).slice(0,7);render();return}
  case 'v2-month-today':ui.calendarMonth=stamp().slice(0,7);ui.selectedDay=stamp();render();return;
  case 'v2-select-day':ui.selectedDay=el.dataset.day;render();return;
  case 'v2-new-task':v2TaskForm(el.dataset.day||ui.selectedDay);return;
  case 'v2-toggle-task':{const t=(state.tasks||[]).find(x=>x.id===pid);if(t){t.done=!t.done;await save();render()}return}
  case 'v2-open-plant':plantDetail(pid);return;
  case 'v2-geolocate':await v2getLocation();return;
  case 'v2-species-by-name':{const idx=flora.findIndex(s=>s.name===el.dataset.name);if(idx>=0)speciesDetail(idx);return}
  case 'v2-ai-species':{const f=flora[Number(pid)];v2aiModal('', 'care');if($('#v2-ai-question'))$('#v2-ai-question').value=`请介绍${f.name}（${f.latin}）的鉴别特征、在中国的生境以及常见养护注意事项。`;return}
  case 'v2-ai-care':v2aiModal(pid,'care');return;
  case 'v2-ai-diagnose':v2aiModal(pid,'diagnose');return;
  case 'v2-ai-identify':{v2aiModal('','identify');if(ui.recognitionImage){ui.aiImage=ui.recognitionImage;$('#v2-ai-photo-preview').innerHTML=`<img src="${esc(ui.aiImage)}" alt="待识别植物">`;}return}
  case 'v2-open-ai-home':{if(state.plants.length===1)v2aiModal(state.plants[0].id,'care');else modal('选择植物 · AI 助手',`<div class="v2-ai-pick">${state.plants.map(p=>`<button data-action="v2-ai-care" data-id="${esc(p.id)}">${imgTag(p.image,p.name)}<b>${esc(p.name)}</b> →</button>`).join('')}<button class="outlined-btn" data-action="v2-ai-identify">或者拍照识别一株新植物</button></div>`);return}
  case 'v2-ai-run':await v2aiRun(pid,el.dataset.mode);return;
  case 'v2-copy-ai':{const text=$('.v2-ai-answer-text')?.innerText||'';if(navigator.clipboard){await navigator.clipboard.writeText(text);toast('已复制分析文字')}return}
  case 'v2-save-password':{const pw=$('#v2-session-password')?.value||'';if(pw)sessionStorage.setItem('yiyu-ai-session-password',pw);else sessionStorage.removeItem('yiyu-ai-session-password');toast('会话口令已更新（不包含在备份中）');return}
  case 'v2-refresh-api':{await v2refreshStatus();return}
 }
 return v2Orig.act(action,el);
};

async function v2refreshStatus(){const r=await v2status();const box=$('#v2-ai-status');if(box){box.textContent=r.offline?'需启动网站服务端':r.deepseek?'DeepSeek 已接通':'未配置 DeepSeek';box.className='v2-ai-state '+(r.deepseek?'ready':'')};toast(r.deepseek?'DeepSeek 服务已配置，可以尝试对话':'尚未检测到已配置的 DeepSeek 服务')}

// 双保险：不更改老版本数据，任务清单随第一次保存自然升级到备份格式。
const v2OriginalExport=exportData;
exportData=function(){if(!Array.isArray(state.tasks))state.tasks=[];return v2OriginalExport()};

// 添加新表单、上传和 AI 图像预览的事件委托。原版事件仍然处理既有表单。
document.addEventListener('submit',async e=>{
 if(e.target.id!=='v2-task-form')return;
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());const p=state.plants.find(x=>x.id===d.plantId);
 if(!state.tasks)state.tasks=[];
 state.tasks.push({id:id(),date:d.date||stamp(),type:d.type||'自定义',name:p?.name||d.note||'个人养护待办',plantId:d.plantId||'',note:d.note||'',done:false});
 state.isDemo=false;await save();ui.selectedDay=d.date||stamp();ui.calendarMonth=ui.selectedDay.slice(0,7);closeModal();render();toast('已加入养护日历');
});
document.addEventListener('change',async e=>{if(e.target.id!=='v2-ai-image')return;
 const file=e.target.files?.[0];if(!file)return;
 try{ui.aiImage=await compress(file);const preview=$('#v2-ai-photo-preview');if(preview)preview.innerHTML=`<img src="${esc(ui.aiImage)}" alt="待提交的照片"><small>仅点击开始分析后才上传</small>`}
 catch(err){toast(err.message)}
});
// render 随状态变化时不自动联网。只有设置页主动检测状态。
document.addEventListener('click',e=>{const button=e.target.closest('[data-nav="settings"]');if(button)setTimeout(()=>v2status().then(r=>{const box=$('#v2-ai-status');if(box){box.textContent=r.offline?'需启动网站服务端':r.deepseek?'DeepSeek 已接通':'未配置 DeepSeek';if(r.deepseek)box.classList.add('ready')}}),0)},true);

// 优先走服务端的 Pl@ntNet 代理。个人旧版浏览器密钥继续兼容。
identify=async function(){
 if(!ui.recognitionImage){toast('请先选一张植物照片');return}
 ui.recognitionLoading=true;ui.recognitionResults=null;ui.recognitionMessage='正在进行植物识别…';render();
 try{
  const service=await v2status();
  if(service.plantnet){const j=await v2post('/api/identify',{image:ui.recognitionImage});ui.recognitionResults=j.results||[];ui.recognitionMessage=ui.recognitionResults.length?'已获得植物候选结果，请核对叶片、花与果实等特征。':'未找到可靠候选结果。';}
  else if(localStorage.getItem(API_KEY_STORAGE)){
   // 兼容原版个人浏览器密钥设置；推荐迁移至服务器环境变量。
   ui.recognitionLoading=false;return await v2Orig.identify();
  }else throw Error('Pl@ntNet 尚未配置。可在服务器配置 PLANTNET_API_KEY，或使用下方 DeepSeek 看图功能');
 }catch(e){ui.recognitionMessage='识别暂不可用：'+e.message}
 finally{ui.recognitionLoading=false;render()}
};

// v2 备份恢复保留「手动待办」和历史档案；v1 备份也可以导入。
importData=async function(file){
 if(!file)return;
 try{
  if(file.size>100*1024*1024)throw Error('备份文件超过 100MB');
  const content=JSON.parse(await file.text());
  if(!Array.isArray(content.plants)||!Array.isArray(content.sightings))throw Error('这不是有效的一隅植物备份');
  const tasks=Array.isArray(content.tasks)?content.tasks:[];
  if(!confirm(`将用备份中的 ${content.plants.length} 株植物、${content.sightings.length} 条野外发现及 ${tasks.length} 项待办覆盖本机数据，确定继续吗？`))return;
  state={version:2,isDemo:!!content.isDemo,plants:content.plants,sightings:content.sightings,tasks};
  await save();closeModal();go('home');toast('已恢复植物、发现记录与养护日历待办');
 }catch(e){toast('导入失败：'+e.message)}
};

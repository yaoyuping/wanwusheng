/* 一隅 · 植物手记 v3 · 视觉重构、可编辑档案与定位天气
   继续使用 v1/v2 的 IndexedDB 数据，新增的天气缓存不保存精确坐标。 */
'use strict';
const V3_WEATHER_KEY='yiyu-weather-v3';
let v3Weather=null;
let v3WeatherBusy=false;
let v3LastOpenedPlant='';
try { const w=JSON.parse(localStorage.getItem(V3_WEATHER_KEY)||'null'); if(w&&Number.isFinite(Number(w.temperature))&&Number.isFinite(Number(w.humidity)))v3Weather=w; }catch{}
const v3Before={plantDetail,plantForm,newLog,homeView,plantsView,careView,settingsView,render,handleSubmit,act};
const v3OriginalDayTasks=v2dayTasks;
v2dayTasks=function(day){return v3OriginalDayTasks(day).filter(t=>!t.generated||state.plants.find(p=>p.id===t.plantId)?.reminder!==false)};
const v3WeatherCodes={0:['晴','☀️'],1:['晴间多云','🌤️'],2:['多云','⛅'],3:['阴','☁️'],45:['有雾','🌫️'],48:['雾凇','🌫️'],51:['毛毛雨','🌦️'],53:['毛毛雨','🌧️'],55:['毛毛雨','🌧️'],56:['冻雨','🌧️'],57:['冻雨','🌧️'],61:['小雨','🌧️'],63:['雨','🌧️'],65:['大雨','🌧️'],66:['冻雨','🌧️'],67:['冻雨','🌧️'],71:['小雪','🌨️'],73:['雪','🌨️'],75:['大雪','🌨️'],77:['雪粒','🌨️'],80:['阵雨','🌦️'],81:['阵雨','🌧️'],82:['强阵雨','⛈️'],85:['阵雪','🌨️'],86:['阵雪','🌨️'],95:['雷雨','⛈️'],96:['雷暴','⛈️'],99:['强雷暴','⛈️']};
function v3WeatherDesc(n){return v3WeatherCodes[Number(n)]||['天气未知','🌥️']}
function v3Age(w){return w?Math.max(0,Date.now()-new Date(w.at).getTime()):Infinity}
function v3WeatherSurface(compact=false){
 const w=v3Weather;const label=w?esc(w.city||'当前位置'):'尚未获取位置';const valid=w&&Number.isFinite(+w.temperature)&&Number.isFinite(+w.humidity);
 const d=valid?v3WeatherDesc(w.code):['暂无天气','🌤️'];
 const stale=valid&&v3Age(w)>60*60*1000;
 return `<section class="v3-weather ${compact?'compact':''}" aria-label="当地室外天气">
  <div class="v3-weather-left"><div class="v3-weather-icon" aria-hidden="true">${d[1]}</div><div><span class="v3-weather-eyebrow">LOCAL WEATHER · 室外实况${stale?' · 缓存':''}</span><strong>${label} <span class="v3-weather-spot">⌖</span></strong><small>${valid?`${d[0]} · 更新于 ${new Date(w.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:'允许定位或手动输入城市以获取天气'}</small></div></div>
  <div class="v3-weather-stats">${valid?`<div><strong>${Math.round(w.temperature)}<sup>°C</sup></strong><span>室外温度</span></div><div><strong>${Math.round(w.humidity)}<sup>%</sup></strong><span>室外湿度</span></div>`:'<span class="v3-weather-placeholder">尚无天气数据</span>'}</div>
  <div class="v3-weather-buttons"><button data-action="v3-weather-refresh" title="重新定位刷新天气" aria-label="定位并刷新天气">${ico('pin',18)}</button><button data-action="v3-weather-manual" title="按城市查找" aria-label="按城市查找天气">${ico('search',18)}</button></div></section>`;
}
function v3ToastError(e){toast(typeof e==='string'?e:e?.message||'暂时无法获取天气')}
function v3UpdateWeatherViews(){
 // 不刷新编辑中的表单，也不关闭已经打开的详情弹窗。
 document.querySelectorAll('.v3-weather').forEach(el=>{const node=document.createElement('div');node.innerHTML=v3WeatherSurface(el.classList.contains('compact'));el.replaceWith(node.firstElementChild)});
 const f=document.querySelector('#log-form');if(f&&v3Weather){v3FillLogWeather(f)}
}
async function v3FetchWeather(lat,lon,city){
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.searchParams.set('latitude',Number(lat).toFixed(3));url.searchParams.set('longitude',Number(lon).toFixed(3));
 url.searchParams.set('current','temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m');url.searchParams.set('timezone','auto');
 const r=await fetch(url.toString());if(!r.ok)throw Error('天气服务暂时不可用');const data=await r.json();
 const current=data.current||{};if(!Number.isFinite(+current.temperature_2m)||!Number.isFinite(+current.relative_humidity_2m))throw Error('天气服务未返回有效温湿度');
 v3Weather={city:city||'当前位置',temperature:Number(current.temperature_2m),humidity:Number(current.relative_humidity_2m),code:Number(current.weather_code),windSpeed:Number(current.wind_speed_10m),windDirection:Number(current.wind_direction_10m),at:new Date().toISOString(),source:'Open-Meteo',locationMethod:city?'城市检索':'手机定位'};
 try{localStorage.setItem(V3_WEATHER_KEY,JSON.stringify(v3Weather))}catch{}
 v3UpdateWeatherViews();return v3Weather;
}
function v3Position(){return new Promise((resolve,reject)=>{
 if(!navigator.geolocation){reject(Error('此浏览器不支持地理定位；可按城市查询'));return}
 if(!window.isSecureContext){reject(Error('自动定位需要 HTTPS 或 localhost，请改用城市查询'));return}
 navigator.geolocation.getCurrentPosition(resolve,e=>reject(Error(e.code===1?'没有定位权限。可以在浏览器设置中授权，或按城市查询。':e.code===2?'设备暂时无法定位，请尝试按城市查询。':'定位超时，请重试。')),{enableHighAccuracy:false,maximumAge:15*60*1000,timeout:12000});
})}
async function v3ReverseCity(lat,lon){
 // Nominatim 仅用于显示城市名，失败时使用「当前位置」，不阻塞天气。
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${Number(lat).toFixed(2)}&lon=${Number(lon).toFixed(2)}&zoom=10&accept-language=zh-CN`);if(!r.ok)return '';
 const a=(await r.json()).address||{};return a.city||a.town||a.county||a.municipality||a.state||'';}catch{return ''}
}
async function v3LocateWeather(silent=false){
 if(v3WeatherBusy)return;if(!silent)toast('正在读取手机位置与室外天气…');v3WeatherBusy=true;
 try{const pos=await v3Position();const {latitude,longitude}=pos.coords;
  // 天气先显示，城市名获取失败也不影响。
  await v3FetchWeather(latitude,longitude,'');
  const city=await v3ReverseCity(latitude,longitude);
  if(city&&v3Weather&&v3Weather.locationMethod==='手机定位'){
   v3Weather.city=city;try{localStorage.setItem(V3_WEATHER_KEY,JSON.stringify(v3Weather))}catch{};v3UpdateWeatherViews();
  }
  if(!silent)toast('已更新当地室外天气');
 }catch(e){if(!silent)v3ToastError(e);else {const spot=document.querySelector('.v3-weather-placeholder');if(spot)spot.textContent='定位未授权，可按城市查询'}}
 finally{v3WeatherBusy=false}
}
async function v3SearchCity(name){
 const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.searchParams.set('name',name);url.searchParams.set('count','8');url.searchParams.set('language','zh');url.searchParams.set('format','json');
 const r=await fetch(url);if(!r.ok)throw Error('城市搜索暂不可用');return (await r.json()).results||[];
}
function v3WeatherManual(){modal('选择天气所在城市',`<div class="v3-city-dialog"><p>不方便授权手机定位时，可以输入城市。天气来自 Open-Meteo，显示的是室外温湿度，不等于盆栽旁的室内数值。</p><form id="v3-city-form"><label class="field"><span>城市名称</span><input type="search" name="city" autofocus required placeholder="例如：杭州 / Shanghai" autocomplete="off"></label><div class="modal-actions"><button class="primary-btn" type="submit">搜索城市</button></div></form><div id="v3-city-results"></div></div>`)}
function v3WeatherManualResult(rows){const el=$('#v3-city-results');if(!el)return;
 el.innerHTML=rows.length?`<p class="v3-city-hint">选择一个城市以获取天气：</p>${rows.map((x,i)=>`<button class="v3-city-row" data-action="v3-pick-city" data-index="${i}"><span><strong>${esc(x.name)}</strong><small>${esc([x.admin1,x.country].filter(Boolean).join(' · '))}</small></span>→</button>`).join('')}`:'<p class="v3-city-hint">没有找到城市，请尝试填写更完整的城市名称。</p>';
}

const v3Fields=[
 ['健康状态','status','♡','mint',true],['植物品种','name','✿','mint',true],['到家日期','acquired','▦','aqua',false],['摆放位置','location','⌂','sand',true],['植物标签','tags','◇','lavender',true],['浇水检查间隔','interval','♧','blue',true],['养护提醒','reminder','♧','mint',true],['购买金额','price','¥','aqua',false],['购买渠道','source','▣','lavender',false],['光照环境','light','☀','sand',true]
];
function v3FieldValue(p,key){switch(key){
 case 'status':return p.status||'未记录';case 'name':return p.name||'未命名植物';case 'acquired':return p.acquired?`${p.acquired.slice(0,4)}年${Number(p.acquired.slice(5,7))}月${Number(p.acquired.slice(8,10))}日`:'未设置';
 case 'tags':return p.tags||'未设置';case 'interval':return (p.interval||7)+'天（到期检查盆土）';case 'reminder':return p.reminder===false?'关闭':'开启站内检查';case 'price':return p.price?`¥${p.price}`:'未记录';default:return p[key]||'未设置';
}}
function v3ProfileInfo(p){return `<section class="v3-info-card" aria-label="植物基本信息">${v3Fields.map(([label,key,icon,toned,editable])=>`<${editable?'button':'div'} class="v3-info-row" ${editable?`type="button" data-action="edit-plant" data-id="${esc(p.id)}"`:''}><span class="v3-info-icon ${toned}" aria-hidden="true">${icon}</span><span class="v3-info-value"><small>${label}</small><strong>${esc(v3FieldValue(p,key))}</strong></span>${editable?`<span class="v3-info-arrow" aria-hidden="true">${ico('back',19)}</span>`:''}</${editable?'button':'div'}>`).join('')}</section>${p.notes?`<section class="v3-profile-notes"><div class="v3-note-head">植物手记 <span>PERSONAL NOTES</span></div><p>${esc(p.notes)}</p></section>`:''}`}
function v3LogCard(l){const sym=V2_TYPES[l.action]?.[0]||'✎';const weather=[l.weather,l.temperature,l.humidity].filter(Boolean).map(esc).join(' · ');
 return `<article class="v3-log-card"><span class="v3-log-symbol">${sym}</span><div class="v3-log-main"><div class="v3-log-header"><b>${esc(l.action||'养护')}</b><small>${esc(l.time||'')}</small></div>${l.note?`<p>${esc(l.note)}</p>`:''}${imageSrc(l.image)?`<img src="${esc(l.image)}" alt="养护照片" class="v3-log-img">`:''}${weather?`<div class="v3-log-weather">${weather}</div>`:''}</div></article>`;
}
function v3LogTimeline(logs){const ordered=[...logs].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.time||'').localeCompare(a.time||''));
 if(!ordered.length)return '<div class="v3-empty"><span>✎</span><h3>把植物的故事记下来</h3><p>第一次浇水、新叶生长或一次细心的修剪，都会成为它的生长日记。</p></div>';
 return `<div class="v3-timeline">${[...new Set(ordered.map(l=>l.date||'未知日期'))].map(day=>`<section class="v3-log-day"><div class="v3-log-date"><i></i><b>${esc(v2date(day))}</b><small>${esc(day.slice(0,4))}</small><span>${ordered.filter(l=>l.date===day).length} 条</span></div><div class="v3-log-daycards">${ordered.filter(l=>(l.date||'未知日期')===day).map(v3LogCard).join('')}</div></section>`).join('')}</div>`;
}
plantDetail=function(pid,tab='info'){
 const p=state.plants.find(x=>x.id===pid);if(!p)return;v3LastOpenedPlant=pid;ui.detailTab=tab;
 const logs=p.logs||[],photoLogs=logs.filter(l=>imageSrc(l.image));const filters=['全部',...Object.keys(V2_TYPES)];
 const filtered=logs.filter(l=>ui.logFilter==='全部'||ui.logFilter===l.action);
 const journal=`<div class="v3-filter-scroll">${filters.map(f=>`<button class="filter-chip ${ui.logFilter===f?'active':''}" data-action="v2-log-filter" data-id="${esc(pid)}" data-type="${esc(f)}">${esc(f)}</button>`).join('')}</div>${v3LogTimeline(filtered)}`;
 const photos=photoLogs.length?`<div class="v2-gallery">${photoLogs.map(l=>`<figure>${imgTag(l.image,p.name)}<figcaption>${esc(datePretty(l.date))} · ${esc(l.action)}</figcaption></figure>`).join('')}</div>`:'<div class="v3-empty"><span>▧</span><h3>相册还是空的</h3><p>记录养护时上传的照片，会自动留在这里。</p></div>';
 const status=plantStatus(p);
 modal(p.name,`<div class="v3-plant-detail">
  <div class="v3-detail-photo">${imgTag(p.image,p.name)}<div class="v3-detail-photo-shade"></div><span class="v3-detail-cover-label">✿ MY BOTANICAL COMPANION</span><div class="v3-detail-cover-bottom"><h2>${esc(p.name)}</h2><p>${esc(p.latin||p.location||'我的植物伙伴')}</p></div><button class="v3-cover-edit" data-action="edit-plant" data-id="${esc(pid)}">${ico('settings',16)} 编辑资料</button></div>
  <div class="v3-plant-overline"><span class="v3-overline-status">◉ ${esc(p.status||'待记录')}</span><span>相伴 ${esc(since(p.acquired))}</span><span>· ${esc(status.text)}</span></div>
  <div class="v3-plant-tabs" role="tablist"><button role="tab" aria-selected="${tab==='info'}" data-action="v2-plant-tab" data-id="${esc(pid)}" data-tab="info" class="${tab==='info'?'selected':''}">基本信息</button><button role="tab" aria-selected="${tab==='logs'}" data-action="v2-plant-tab" data-id="${esc(pid)}" data-tab="logs" class="${tab==='logs'?'selected':''}">养护记录 <small>${logs.length}</small></button><button role="tab" aria-selected="${tab==='photos'}" data-action="v2-plant-tab" data-id="${esc(pid)}" data-tab="photos" class="${tab==='photos'?'selected':''}">相册</button></div>
  <div class="v3-plant-body">${tab==='info'?`<div class="v3-insight"><span>✧</span><div><b>七日养护提示</b><p>按你设置的检查间隔，${esc(status.text)}。请先观察盆土与叶片，再决定是否浇水。</p></div><button data-action="v2-ai-care" data-id="${esc(pid)}" aria-label="获取 AI 养护建议">${ico('back',18)}</button></div>${v3ProfileInfo(p)}`:tab==='logs'?journal:photos}</div>
  <div class="v3-plant-foot"><button class="v3-detail-quick" data-action="v3-action-sheet" data-id="${esc(pid)}"><span>${ico('plus',18)} 新增养护</span><i>⌄</i></button><button class="v3-detail-ai" data-action="v2-ai-diagnose" data-id="${esc(pid)}">✧ AI 分析</button></div></div>`);
 document.querySelector('#modal-root .modal')?.classList.add('v3-profile-modal');
};
function v3ActionSheet(pid){const p=state.plants.find(x=>x.id===pid);if(!p)return;
 modal('记录 · '+p.name,`<div class="v3-sheet-intro"><span>CHOOSE AN ACTION</span><p>这次，你为植物做了什么？</p></div><div class="v3-action-grid">${Object.entries(V2_TYPES).map(([name,[emoji]])=>`<button data-action="v3-quick-log" data-id="${esc(pid)}" data-type="${esc(name)}"><span>${emoji}</span><b>${esc(name)}</b></button>`).join('')}</div><button class="outlined-btn v3-sheet-back" data-action="v3-back-plant" data-id="${esc(pid)}">返回植物档案</button>`);
 document.querySelector('#modal-root .modal')?.classList.add('v3-action-modal');
}
const v3BeforePlantForm=plantForm;
plantForm=function(pid=null,prefill={}){
 v3BeforePlantForm(pid,prefill);const p=state.plants.find(x=>x.id===pid)||prefill;
 const form=$('#plant-form');if(!form)return;
 const tagsField=document.createElement('div');tagsField.className='field';tagsField.innerHTML=`<label for="v3-tags">植物标签</label><input id="v3-tags" name="tags" maxlength="120" placeholder="例如：中古盆栽 / 喜湿" value="${esc(p.tags||'')}">`;
 const reminderField=document.createElement('div');reminderField.className='field';reminderField.innerHTML=`<label for="v3-reminder">养护待检查</label><select id="v3-reminder" name="reminder"><option value="yes" ${p.reminder===false?'':'selected'}>开启（仅站内显示）</option><option value="no" ${p.reminder===false?'selected':''}>关闭</option></select>`;
 const grid=form.querySelector('.form-grid');if(grid){grid.append(tagsField,reminderField)}
 const head=document.querySelector('.modal-header h2');if(head)head.textContent=pid?'编辑 · '+(p.name||'我的植物'):'新植物入驻';
 document.querySelector('#modal-root .modal')?.classList.add('v3-editor-modal');
};
const v3BeforeNewLog=newLog;
newLog=function(pid){v3BeforeNewLog(pid);const form=$('#log-form');if(!form)return;
 const hum=document.createElement('div');hum.className='field';hum.innerHTML=`<label for="v3-humidity">室外相对湿度（可选）</label><input id="v3-humidity" type="text" name="humidity" placeholder="例如：68%">`;
 const label=document.createElement('div');label.className='field full v3-weather-form-note';label.innerHTML=`<span>天气根据当前位置或所选城市自动填入（室外数据）；旧日期记录不会用今天的天气回填。<button type="button" data-action="v3-weather-refresh">刷新天气</button></span>`;
 form.querySelector('.form-grid')?.append(hum,label);
 v3FillLogWeather(form);
 document.querySelector('#modal-root .modal')?.classList.add('v3-editor-modal');
};
function v3FillLogWeather(form){if(!form)return;
 if(form.querySelector('[name=date]')?.value!==stamp()){
  for(const key of ['weather','temperature','humidity']){
   const el=form.querySelector(`[name="${key}"]`);
   if(el?.dataset.v3Auto==='1'){el.value='';el.dataset.v3Auto='0'}
  }
  return;
 }
 if(!v3Weather)return;
 const get=name=>form.querySelector('[name="'+name+'"]');
 const items={weather:v3WeatherDesc(v3Weather.code)[0],temperature:Math.round(v3Weather.temperature)+'°C',humidity:Math.round(v3Weather.humidity)+'%'};
 for(const [key,val] of Object.entries(items)){
  const input=get(key);if(input&&(!input.value||input.dataset.v3Auto==='1')){input.value=val;input.dataset.v3Auto='1'}
 }
}
handleSubmit=async function(form){
 if(form.id==='plant-form'){
  const pid=form.dataset.id||'';const tags=form.querySelector('[name=tags]')?.value.trim()||'';const reminder=form.querySelector('[name=reminder]')?.value!=='no';
  const prev=pid?state.plants.find(x=>x.id===pid):null;const count=state.plants.length;
  await v3Before.handleSubmit(form);
  const item=pid?state.plants.find(x=>x.id===pid):state.plants.length>count?state.plants[0]:null;
  if(item){item.tags=tags;item.reminder=reminder;await save();render();plantDetail(item.id,'info')}
  return;
 }
 if(form.id==='log-form'){
  const hum=form.querySelector('[name=humidity]')?.value.trim()||'';
  const pid=form.dataset.id;const p=state.plants.find(x=>x.id===pid);
  await v3Before.handleSubmit(form);
  if(p?.logs?.length){p.logs[0].humidity=hum;await save();}
  return;
 }
 return v3Before.handleSubmit(form);
};

homeView=function(){return v3WeatherSurface()+v3Before.homeView()};
plantsView=function(){return `<div class="v3-plants-banner"><div><span>MY GREEN COLLECTION</span><strong>每株植物，都有自己的故事</strong><small>点击照片查看档案，或使用「编辑资料」修改信息。</small></div><span class="v3-banner-art">❧</span></div>`+v3WeatherSurface(true)+v3Before.plantsView()};
careView=function(){return v3WeatherSurface()+v3Before.careView()};
settingsView=function(){return `<div class="v3-weather-settings"><h2>当地天气 · 位置设置</h2><p>定位授权后自动查询室外实时天气、温度和相对湿度。天气由 Open-Meteo 提供；室内实际温湿度请以家用温湿度计为准。</p>${v3WeatherSurface(true)}<p>位置仅用于即时查询天气。网站不在备份中存储天气定位坐标。天气信息约 30 分钟自动检查一次。</p></div>`+v3Before.settingsView()};
act=async function(action,el){
 const pid=el.dataset.id;
 switch(action){
  case 'v3-weather-refresh':await v3LocateWeather(false);return;
  case 'v3-weather-manual':v3WeatherManual();return;
  case 'v3-pick-city':{
   const idx=Number(el.dataset.index),city=ui.v3CityRows?.[idx];if(!city)return;
   try{await v3FetchWeather(city.latitude,city.longitude,[city.name,city.admin1].filter(Boolean).join(' · '));closeModal();render();toast('已更新城市天气');}catch(e){v3ToastError(e)}return;
  }
  case 'v3-action-sheet':v3ActionSheet(pid);return;
  case 'v3-back-plant':plantDetail(pid,ui.detailTab||'info');return;
  case 'v3-quick-log':{
    newLog(pid);const radio=document.querySelector(`#log-form input[name="action"][value="${CSS.escape(el.dataset.type)}"]`);
    if(radio)radio.checked=true;return;
  }
 }
 return v3Before.act(action,el);
};
// 城市检索是 v3 独立表单，不能被 v1 的事件处理器拦截。
document.addEventListener('submit',async e=>{
 if(e.target.id!=='v3-city-form')return;e.preventDefault();const city=(new FormData(e.target).get('city')||'').toString().trim();if(city.length<2)return toast('请至少输入两个字符');
 const box=$('#v3-city-results');if(box)box.innerHTML='<p class="v3-city-hint">正在查询城市…</p>';
 try{ui.v3CityRows=await v3SearchCity(city);v3WeatherManualResult(ui.v3CityRows)}catch(error){if(box)box.textContent=error.message}
});
// 仅当修改为今天时，才允许把“当前”天气写入同日养护记录。
document.addEventListener('change',e=>{if(e.target.matches('#log-form [name="date"]'))v3FillLogWeather($('#log-form'))});
document.addEventListener('input',e=>{if(e.target.matches('#log-form [name="weather"],#log-form [name="temperature"],#log-form [name="humidity"]'))e.target.dataset.v3Auto='0'});
// 在用户可见界面增设天气条，不在定时检查时突然关闭弹窗。
(function startWeather(){
 const begin=()=>{
  // 等原版 IndexedDB 完成加载再刷新首页。
  const wait=setInterval(()=>{if(!state)return;clearInterval(wait);v3UpdateWeatherViews();
   if(!v3Weather||v3Age(v3Weather)>30*60*1000)v3LocateWeather(true);
   const frame=document.querySelector('.topbar');if(frame)frame.classList.add('v3-topbar');
  },120);
  setTimeout(()=>clearInterval(wait),12000);
  setInterval(()=>{if(document.visibilityState==='visible'&&v3Age(v3Weather)>30*60*1000)v3LocateWeather(true)},30*60*1000);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();

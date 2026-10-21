/* 一隅 v4 · 位置管理、地点反查、植物选项、自定义标签。兼容 v1-v3 存档。 */
'use strict';
const V4_CITY_KEY='yiyu-weather-location-preference-v4';
const V4_OPTIONS={location:['阳台','走廊','客厅','卧室','厨房','院子'],interval:['1','2','5','7','10','15'],source:['花店','网购','花鸟市场'],light:['直射光','散射光','补光灯'],status:['健康','生病中','需关注']};
const V4_DEFAULT_CITY={name:'杭州',admin1:'浙江省',country_code:'CN',latitude:30.2741,longitude:120.1551};
Object.assign(icons,{thermometer:'<path d="M10 14.8V5a2 2 0 0 1 4 0v9.8a4.5 4.5 0 1 1-4 0Z"/><path d="M12 8v8"/>',humidity:'<path d="M8 4c-2.2 3-4 5.1-4 7.4a4 4 0 0 0 8 0C12 9.1 10.2 7 8 4Z"/><path d="M16 3c-2.2 3-4 5.1-4 7.4a4 4 0 1 0 8 0C20 8.1 18.2 6 16 3Z"/>',wind:'<path d="M3 8h10a2.5 2.5 0 1 0-2.4-3.2"/><path d="M3 12h15a2.5 2.5 0 1 1-2.4 3.2"/><path d="M3 16h7"/>',bug:'<path d="M8 9h8v7a4 4 0 0 1-8 0V9Z"/><path d="M10 9V7a2 2 0 0 1 4 0v2M12 9v11M5 11l3 2M19 11l-3 2M5 17l3-1M19 17l-3-1"/>'});
function v4ReadPref(){try{const p=JSON.parse(localStorage.getItem(V4_CITY_KEY)||'null');return p&&p.mode==='fixed'&&Number.isFinite(+p.lat)&&Number.isFinite(+p.lon)?p:{mode:'auto'}}catch{return {mode:'auto'}}}
let v4Pref=v4ReadPref();
let v4GPSBusy=false;
let v4ReverseBusy=false;
const v4OrigPlantForm=plantForm;
const v4OrigSightingForm=sightingForm;
const v4OrigHandleSubmit=handleSubmit;
const v4OrigAct=act;
const v4OrigLocate=v3LocateWeather;
const v4OrigWeatherSurface=v3WeatherSurface;
const v4OrigFetchWeather=v3FetchWeather;
const v4OrigSettings=settingsView;
const v4OrigSightingDetail=sightingDetail;
const v4OrigImport=importData;

function v4Dedup(values){return [...new Set(values.map(v=>String(v).trim()).filter(Boolean))]}
function v4SplitTags(value){return v4Dedup(String(value||'').split(/\s*[,，、;；/|]\s*|\s+·\s+/).filter(Boolean))}
function v4TagBank(){const custom=Array.isArray(state?.tagLibrary)?state.tagLibrary:[];return v4Dedup([...custom,...(state?.plants||[]).flatMap(p=>v4SplitTags(p.tags))]).slice(0,80)}
function v4UpdateTagHidden(form){const v=form?.querySelector('[name=tags]');if(v)v.value=[...form.querySelectorAll('.v4-tag-selected [data-v4-tag]')].map(x=>x.dataset.v4Tag).join(' / ')}
function v4PaintTags(form){const selected=form.querySelector('.v4-tag-selected');const available=form.querySelector('.v4-tag-bank');if(!selected||!available)return;
 const current=[...selected.querySelectorAll('[data-v4-tag]')].map(x=>x.dataset.v4Tag);
 available.innerHTML=v4TagBank().filter(t=>!current.includes(t)).map(t=>`<button type="button" class="v4-tag-suggestion" data-action="v4-tag-pick" data-tag="${esc(t)}">＋ ${esc(t)}</button>`).join('')||'<small>还没有其他标签，可以在上方自定义。</small>';
 v4UpdateTagHidden(form);
}
function v4AddTag(name){const form=$('#plant-form');if(!form)return;const tag=String(name||'').trim().slice(0,20);if(!tag){toast('先输入一个标签名称');return}
 const box=form.querySelector('.v4-tag-selected');const current=[...box.querySelectorAll('[data-v4-tag]')].map(x=>x.dataset.v4Tag);
 if(current.includes(tag)){toast('这个标签已经添加');return}if(current.length>=12){toast('每株植物最多设置 12 个标签');return}
 const btn=document.createElement('button');btn.type='button';btn.className='v4-tag-chip';btn.dataset.action='v4-tag-remove';btn.dataset.v4Tag=tag;btn.innerHTML=`${esc(tag)} <span aria-hidden="true">×</span>`;box.append(btn);
 const input=form.querySelector('#v4-tag-entry');if(input)input.value='';v4PaintTags(form);
}
function v4OptionLabel(key){return {location:'摆放位置',interval:'浇水检查间隔',source:'购买渠道',light:'光照条件',status:'植物状态'}[key]}
function v4MakeSelect(key,oldValue){const opts=V4_OPTIONS[key];const chosen=oldValue===undefined||oldValue===null?'':String(oldValue).trim();let items=[...opts];if(chosen&&!items.includes(chosen))items.push(chosen);
 const label=v4OptionLabel(key);const list=`<option value="" ${!chosen?'selected':''}>请选择${label}</option>`+items.map(x=>`<option value="${esc(x)}" ${chosen===x?'selected':''}>${esc(key==='interval'?x+'天':x)}</option>`).join('');
 return `<div class="field v4-choice-field"><label for="fld-${key}">${label}</label><select id="fld-${key}" name="${key}" ${key==='interval'?'required':''}>${list}</select>${key==='interval'?'<small>此间隔是检查盆土的提醒周期，不代表到期必须浇水。</small>':''}</div>`;
}
plantForm=function(pid=null,prefill={}){
 v4OrigPlantForm(pid,prefill);const form=$('#plant-form');if(!form)return;
 const p=state.plants.find(x=>x.id===pid)||prefill;
 for(const key of ['location','interval','source','light','status']){
  const input=form.querySelector(`[name="${key}"]`);if(!input)continue;
  const wrapper=input.closest('.field');if(wrapper)wrapper.outerHTML=v4MakeSelect(key,p[key]??(key==='status'?'健康':key==='interval'?'7':''));
 }
 const field=form.querySelector('#v3-tags')?.closest('.field');if(field){const tags=v4SplitTags(p.tags);field.classList.add('full','v4-tags-field');field.innerHTML=`<label for="v4-tag-entry">植物标签 · 自由添加</label><div class="v4-tag-selected" aria-label="已选择的植物标签">${tags.map(t=>`<button type="button" class="v4-tag-chip" data-action="v4-tag-remove" data-v4-tag="${esc(t)}">${esc(t)} <span aria-hidden="true">×</span></button>`).join('')}</div><div class="v4-tag-entry"><input id="v4-tag-entry" type="text" maxlength="20" placeholder="输入标签，例如：喜湿、盆景、开花中" autocomplete="off"><button type="button" class="outlined-btn" data-action="v4-tag-add">添加标签</button></div><input type="hidden" name="tags" value="${esc(tags.join(' / '))}"><small>点击标签上的 × 可以移除；已有标签可点选复用。</small><div class="v4-tag-bank"></div>`;v4PaintTags(form)}
};

function v4NameFromAddress(a,full=false){if(!a)return '';const province=a.state||a.province||a.region||'';const city=a.city||a.town||a.municipality||a.county||a.state_district||'';const detail=full?[a.suburb||a.neighbourhood||a.village||a.city_district||'',a.road||a.pedestrian||a.park||''].filter(Boolean):[];return v4Dedup([province,city,...detail]).join(' · ')}
async function v4ReverseLocation(lat,lon,{full=false}={}){
 // 仅在获得用户设备实时 GPS 后发起请求，不以 IP 地址估测所在地。
 // 先尝试包含行政区级别的 OSM 地址；如果不可用再尝试浏览器端的 BDC 反向地理编码。
 try{
  const u=new URL('https://nominatim.openstreetmap.org/reverse');u.searchParams.set('format','jsonv2');u.searchParams.set('lat',String(lat));u.searchParams.set('lon',String(lon));u.searchParams.set('zoom',full?'17':'10');u.searchParams.set('addressdetails','1');u.searchParams.set('accept-language','zh-CN');
  const r=await fetch(u.toString(),{headers:{'Accept':'application/json'}});if(r.ok){const j=await r.json();const label=v4NameFromAddress(j.address,full);if(label)return label}
 }catch{}
 try{
  const u=new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');u.searchParams.set('latitude',lat);u.searchParams.set('longitude',lon);u.searchParams.set('localityLanguage','zh');
  const r=await fetch(u.toString());if(r.ok){const j=await r.json();const label=v4Dedup([j.principalSubdivision,j.city||j.locality,...(full?[j.localityInfo?.administrative?.[2]?.name]:[])]).join(' · ');if(label)return label}
 }catch{}
 return '';
}
function v4GeoPosition(){return new Promise((resolve,reject)=>{
 if(!navigator.geolocation){reject(Error('此设备浏览器不支持定位'));return}
 if(!window.isSecureContext){reject(Error('手机定位需要通过 HTTPS 网站打开，不支持普通本地文件'));return}
 navigator.geolocation.getCurrentPosition(resolve,e=>reject(Error(e.code===1?'位置权限被拒绝，请到手机设置中允许此网站定位':e.code===2?'设备无法确认当前位置，请检查系统定位开关及网络':'定位超时，请稍后重试')),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
})}
async function v4SetWeather(lat,lon,name,method){const w=await v4OrigFetchWeather(lat,lon,name);w.locationMethod=method;try{localStorage.setItem(V3_WEATHER_KEY,JSON.stringify(w))}catch{};v3UpdateWeatherViews();return w}
async function v4SetFixedCity(city){const label=city.label||v4Dedup([city.admin1,city.name]).join(' · ');const pref={mode:'fixed',label,lat:+city.latitude,lon:+city.longitude};
 v4Pref=pref;localStorage.setItem(V4_CITY_KEY,JSON.stringify(pref));await v4SetWeather(pref.lat,pref.lon,label,'固定城市');closeModal();render();toast('已固定天气城市：'+label)}
// 定位刷新时一律请求 GPS，经纬度不来自 IP，也不悄悄用之前的固定城市替代。
v3LocateWeather=async function(silent=false,forceGPS=false){
 if(v4Pref.mode==='fixed'&&!forceGPS){try{await v4SetWeather(v4Pref.lat,v4Pref.lon,v4Pref.label,'固定城市')}catch(e){if(!silent)toast('固定城市天气获取失败：'+e.message)}return}
 if(v4GPSBusy)return;v4GPSBusy=true;if(!silent)toast('正在请求设备 GPS 位置…');try{
 const pos=await v4GeoPosition();const {latitude,longitude,accuracy}=pos.coords;
 const label=await v4ReverseLocation(latitude,longitude,{full:false});
 v4Pref={mode:'auto'};localStorage.setItem(V4_CITY_KEY,JSON.stringify(v4Pref));
 await v4SetWeather(latitude,longitude,label||'GPS 已定位 · 地名待确认','GPS定位');
 if(!silent)toast(label?`已定位：${label}（精度约 ${Math.round(accuracy)} 米）`:'已取得 GPS 坐标，但地址服务没有返回地名。可手动选择城市。');
 }catch(e){if(!silent)toast(e.message||'定位失败，请选择城市');else if(!v3Weather)toast('自动定位不可用，可以手动选城市')}
 finally{v4GPSBusy=false}
};
const v4OrigCityManual=v3WeatherManual;
v3WeatherManual=function(){modal('天气地点设置',`<div class="v3-city-dialog v4-city-dialog"><div class="v4-place-intro"><strong>天气位置如何确定？</strong><p>手机定位用于获取当前设备位置；在家长期使用，也可以把天气城市固定为杭州或其他城市。所有温湿度均为室外数据。</p></div><div class="v4-place-actions"><button type="button" class="outlined-btn" data-action="v4-geo-weather">⌖ 使用手机当前位置</button><button type="button" class="outlined-btn" data-action="v4-city-hangzhou">⌂ 固定到浙江省 · 杭州市</button></div><form id="v3-city-form"><label class="field"><span>查找其他城市</span><input type="search" name="city" autofocus required placeholder="例如：杭州、宁波、上海" autocomplete="off"></label><div class="modal-actions"><button class="primary-btn" type="submit">搜索城市</button></div></form><div id="v3-city-results"></div><p class="v4-privacy">只有主动点击定位按钮才会请求手机定位权限。固定城市不需要手机位置权限。</p></div>`)};
const v4OrigSurface=v3WeatherSurface;
v3WeatherSurface=function(compact=false){let h=v4OrigSurface(compact);const mode=v4Pref.mode==='fixed'?'手动固定城市':'设备 GPS 模式';
 const status=`<div class="v4-weather-method"><span>⌖ ${esc(mode)}</span><button type="button" data-action="v3-weather-manual">切换地点</button></div>`;
 return h.replace('</section>',status+'</section>');
};

v2getLocation=async function(){const form=$('#sighting-form'),el=$('#v2-coord-state');if(!form)return;
 const button=form.querySelector('[data-action="v2-geolocate"]');if(button)button.disabled=true;
 if(el)el.textContent='正在使用 GPS 获取手机当前位置，请允许定位…';
 try{
  const pos=await v4GeoPosition();if(!form.isConnected)return;
  const {latitude,longitude,accuracy}=pos.coords;
  const lat=form.querySelector('[name=lat]'),lon=form.querySelector('[name=lon]');if(lat)lat.value=String(latitude);if(lon)lon.value=String(longitude);
  if(el)el.textContent=`✓ 坐标已获取，精度约 ${Math.round(accuracy)} 米；正在反查地点名称…`;
  const place=await v4ReverseLocation(latitude,longitude,{full:true});if(!form.isConnected)return;
  const input=form.querySelector('[name=location]');if(input){if(place)input.value=place;else input.placeholder='未查到地址，请自己填写（坐标已保存）'}
  if(el)el.textContent=place?`✓ ${place} · 定位精度约 ${Math.round(accuracy)} 米`:`✓ 已保存坐标 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}，请手动补充地点名称`;
  const hint=form.querySelector('.v4-location-map');if(hint)hint.textContent='坐标将在保存后显示在地图中';
 }catch(e){if(el)el.textContent=e.message+'；你仍可手动填写发现地点。'}finally{if(button&&button.isConnected)button.disabled=false}
};
const v4Sighting= sightingForm;
sightingForm=function(sid=null,prefill={}){v4Sighting(sid,prefill);const form=$('#sighting-form');if(!form)return;
 const box=$('#v2-coord-state');if(box&&!sid)box.textContent='请点击「使用手机定位」获取当前经纬度和地点名称。定位失败也可手动输入。';
 const row=form.querySelector('.v2-location-line');if(row){const btn=row.querySelector('button');if(btn)btn.innerHTML=ico('pin',15)+' 使用手机定位';}
 const loc=form.querySelector('[name=location]');if(loc)loc.placeholder='例如：浙江省·杭州市·西湖区·植物园';
 const note=document.createElement('small');note.className='v4-location-map';note.textContent='保存后可打开地图查看发现足迹；位置坐标不会公开到网站仓库。';row?.parentNode?.append(note);
};

const V4_HOME_GUIDES=[
 {icon:'◌',title:'先观察，再浇水',text:'到提醒日期先摸一摸盆土、看看叶片状态。不同季节与环境下，浇水间隔会变化，提醒只是检查信号。'},
 {icon:'☀',title:'光照循序渐进',text:'刚换位置或刚到家的植物不要突然暴晒。逐步增加光照，并留意叶缘焦斑、徒长或新叶大小。'},
 {icon:'⌂',title:'换盆留出适应期',text:'优先选择带排水孔的花盆。换盆后先放在通风、明亮但不过度暴晒的位置，暂缓施肥并观察一至两周。'},
 {icon:'✎',title:'用记录代替猜测',text:'把浇水、施肥、修剪和新叶变化记下来。连续记录比一次性的“万能养护表”更能说明这株植物真正的节奏。'}
];
const V4_HOME_PESTS=[
 {icon:'◉',title:'红蜘蛛',sign:'叶背有细小点状失绿、细丝或蛛网，干燥环境下更常见。',care:'先隔离，冲洗叶片正反面并擦净；连续数周复查叶背，改善通风，避免只喷一次就停止观察。'},
 {icon:'◆',title:'介壳虫',sign:'叶柄、枝条或叶背出现固定不动的褐色或白色小壳，常伴黏液。',care:'先隔离，用棉签或软布逐个清除，修剪严重部位；数日后再次检查新孵化的小虫。'},
 {icon:'●',title:'蚜虫',sign:'嫩芽和花苞处成群聚集，叶片卷曲，表面可能发黏。',care:'先用清水冲掉虫体，修剪严重嫩梢；持续检查新芽，并留意蚂蚁活动与相邻植物。'},
 {icon:'⌁',title:'小黑飞',sign:'盆土附近有小飞虫，长期潮湿的有机质土壤里更容易繁殖。',care:'减少表土持续潮湿，清理腐叶并使用黄色黏虫板监测；同时检查盆土排水和浇水频率。'}
];
function v4GreetingText(){const h=new Date().getHours();return h<5?'夜深了':h<11?'早上好！':h<14?'中午好！':h<18?'下午好！':'晚上好！'}
function v4LongestCompanion(){const values=(state.plants||[]).map(p=>dayDiff(p.acquired)).filter(n=>Number.isFinite(n)&&n>=0);return values.length?Math.max(...values):0}
function v4ConditionIcon(code,size=46){const n=Number(code);const common=`width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true" class="v4-condition-icon"`;const sun='<circle cx="18" cy="17" r="7" fill="#fff4a9" stroke="#e8aa42" stroke-width="2"/><path d="M18 5v-3M18 32v-3M6 17H3m30 0h-3M9.5 8.5 7.2 6.2m21.6 21.6-2.3-2.3m0-17 2.3-2.3M9.5 25.5l-2.3 2.3" stroke="#e8aa42" stroke-width="2.2" stroke-linecap="round"/>';const cloud='<path d="M15 37h20.5a8 8 0 0 0 .4-16 11 11 0 0 0-20.7 3.2A6.5 6.5 0 0 0 15 37Z" fill="#f5fbff" stroke="#80aaad" stroke-width="2" stroke-linejoin="round"/>';let extra='';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(n))extra='<path d="m18 40-2 4m9-4-2 4m9-4-2 4" stroke="#349bc2" stroke-width="2.3" stroke-linecap="round"/>';else if([71,73,75,77,85,86].includes(n))extra='<path d="M17 40v6m-3-3h6m8-3v6m-3-3h6" stroke="#67a9c9" stroke-width="1.8" stroke-linecap="round"/>';else if([95,96,99].includes(n))extra='<path d="m25 37-4 7h5l-2 4" stroke="#d69236" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';else if([45,48].includes(n))extra='<path d="M10 40h28M13 44h22" stroke="#88aaa6" stroke-width="2" stroke-linecap="round"/>';if(n===0)return `<svg ${common}>${sun}</svg>`;if([1,2].includes(n))return `<svg ${common}>${sun}${cloud}</svg>`;return `<svg ${common}>${cloud}${extra}</svg>`}
function v4WindDirection(value){const n=Number(value);if(!Number.isFinite(n))return '风向待更新';return ['北风','东北风','东风','东南风','南风','西南风','西风','西北风'][Math.round((((n%360)+360)%360)/45)%8]}
function v4HomeGreeting(){const featured=(state.plants||[]).find(p=>imageSrc(p.image));const avatar=featured?`<img src="${esc(imageSrc(featured.image))}" alt="${esc(featured.name||'我的植物')}">`:'<span aria-hidden="true">❧</span>';const w=v3Weather;const valid=w&&Number.isFinite(+w.temperature)&&Number.isFinite(+w.humidity);const weather=valid?v3WeatherDesc(w.code):['暂无天气',''];const wind=valid&&Number.isFinite(+w.windSpeed)?`${v4WindDirection(w.windDirection)} · ${Math.round(w.windSpeed)} km/h`:'风况待更新';const place=w?.city||'选择天气地点';return `<section class="v4-welcome" aria-label="今日植物手记与室外天气"><div class="v4-welcome-top"><div class="v4-welcome-copy"><div class="v4-avatar">${avatar}</div><div><span class="v4-overline">MY BOTANICAL CORNER</span><h1>${v4GreetingText()}</h1><p>与草木为邻，借光阴作伴</p></div></div><div class="v4-welcome-weather"><span class="v4-weather-symbol">${v4ConditionIcon(valid?w.code:1)}</span><div class="v4-weather-caption"><strong>${esc(weather[0])}</strong><small>${valid?'室外实况':'允许定位或选择城市'}</small></div><div class="v4-welcome-weather-actions"><button data-action="v3-weather-refresh" aria-label="定位并刷新天气" title="定位并刷新天气">${ico('pin',18)}</button><button data-action="v3-weather-manual" aria-label="切换天气地点" title="切换天气地点">${ico('search',18)}</button></div></div></div><div class="v4-weather-strip"><button class="v4-weather-place" data-action="v3-weather-manual">${ico('pin',21)}<span><small>地点</small><strong>${esc(place)}</strong></span></button><div>${ico('thermometer',21)}<span><small>室外温度</small><strong>${valid?`${Math.round(w.temperature)}°C`:'--°C'}</strong></span></div><div>${ico('humidity',21)}<span><small>室外湿度</small><strong>${valid?`${Math.round(w.humidity)}%`:'--%'}</strong></span></div><div>${ico('wind',21)}<span><small>风况</small><strong>${esc(wind)}</strong></span></div></div></section>`}
const v4BeforeWeatherUpdate=v3UpdateWeatherViews;
v3UpdateWeatherViews=function(){v4BeforeWeatherUpdate();const current=document.querySelector('.v4-welcome');if(current&&state){const box=document.createElement('div');box.innerHTML=v4HomeGreeting();current.replaceWith(box.firstElementChild)}};
function v4DueCount(){const plantDue=(state.plants||[]).filter(p=>p.reminder!==false&&plantStatus(p).due).length;const taskDue=(state.tasks||[]).filter(t=>!t.done&&t.date<=stamp()).length;return plantDue+taskDue}
function v4QuickHub(){const due=v4DueCount();return `<section class="v4-quick-hub" aria-label="常用功能"><button type="button" data-nav="care"><span class="v4-quick-icon peach">${ico('calendar',25)}${due?`<b class="v4-reminder-badge" aria-label="${due} 项待检查">${due>99?'99+':due}</b>`:''}</span><strong>养护日历</strong><small>${due?`${due} 项待检查`:'安排照料节奏'}</small></button><button type="button" data-action="v4-guide"><span class="v4-quick-icon mint">${ico('book',25)}</span><strong>种植手册</strong><small>四条基础原则</small></button><button type="button" data-nav="recognize"><span class="v4-quick-icon aqua">${ico('camera',25)}</span><strong>拍照识别</strong><small>认识眼前植物</small></button><button type="button" data-action="v4-pests"><span class="v4-quick-icon green">${ico('bug',25)}</span><strong>病虫害百科</strong><small>常见症状速查</small></button></section>`}
function v4KnowledgeModal(kind){const guide=kind==='guide',rows=guide?V4_HOME_GUIDES:V4_HOME_PESTS;modal(guide?'种植手册 · 先读懂植物':'病虫害百科 · 常见问题速查',`<div class="v4-knowledge-intro"><span>${guide?'PLANTING MANUAL':'PEST QUICK GUIDE'}</span><p>${guide?'这些原则适合日常观察，不替代每个物种自己的光照、温度与休眠需求。':'发现异常时先隔离、拍照并连续观察；症状相似时，不要急着把所有问题都归因于虫害。'}</p></div><div class="v4-knowledge-grid">${rows.map(x=>`<article class="v4-knowledge-card"><span class="v4-knowledge-icon" aria-hidden="true">${x.icon}</span><div><h3>${esc(x.title)}</h3>${guide?`<p>${esc(x.text)}</p>`:`<p><b>可能迹象</b>${esc(x.sign)}</p><p><b>先这样做</b>${esc(x.care)}</p>`}</div></article>`).join('')}</div>${guide?'<p class="v4-knowledge-note">每次改变养护方式时只调整一两项，给植物留出反应时间。</p>':'<p class="v4-knowledge-note">如需使用药剂，请核对植物与害虫种类，严格遵照产品标签，避免混用，并远离儿童与宠物。</p>'}`);document.querySelector('#modal-root .modal')?.classList.add('v4-knowledge-modal')}

const v4PrevAct=act;
act=async function(action,el){switch(action){
 case 'v4-city-hangzhou':await v4SetFixedCity(V4_DEFAULT_CITY);return;
 case 'v4-geo-weather':closeModal();await v3LocateWeather(false,true);render();return;
 case 'v3-weather-refresh':await v3LocateWeather(false,true);render();return;
 case 'v3-pick-city':{const x=ui.v3CityRows?.[+el.dataset.index];if(!x)return;await v4SetFixedCity(x);return;}
 case 'v4-tag-add':v4AddTag($('#v4-tag-entry')?.value);return;
 case 'v4-tag-pick':v4AddTag(el.dataset.tag);return;
 case 'v4-tag-remove':el.remove();v4PaintTags($('#plant-form'));return;
 case 'v4-guide':v4KnowledgeModal('guide');return;
 case 'v4-pests':v4KnowledgeModal('pests');return;
 case 'v4-plants-layout':ui.v4PlantLayout=el.dataset.layout==='list'?'list':'grid';render();return;
 case 'v4-add-species-plant':{const f=flora[Number(el.dataset.id)];if(!f)return;plantForm(null,{name:f.name,latin:f.latin,tags:f.family,status:'健康'});return;}
 }return v4PrevAct(action,el)};

document.addEventListener('keydown',e=>{if(e.target?.id==='v4-tag-entry'&&e.key==='Enter'){e.preventDefault();v4AddTag(e.target.value)}});

const v4Submit=handleSubmit;
handleSubmit=async function(form){if(form.id!=='plant-form')return v4Submit(form);
 v4UpdateTagHidden(form);const t=v4SplitTags(form.querySelector('[name=tags]')?.value||'');const previousTags=v4TagBank();
 await v4Submit(form);
 if(state){state.tagLibrary=v4Dedup([...previousTags,...t]);await save()}
};
const v4Import=importData;
importData=async function(file){await v4Import(file);if(state){state.tagLibrary=v4TagBank();await save()}};

const v4BeforeSettings=settingsView;
settingsView=function(){return `<section class="v4-location-settings"><strong>定位与城市 · 你可以决定使用哪一种</strong><p>目前：${esc(v4Pref.mode==='fixed'?'固定城市 '+v4Pref.label:'设备实时 GPS（需要位置权限）')}</p><div class="v4-location-controls"><button class="outlined-btn" data-action="v4-geo-weather">⌖ 重新获取手机位置</button><button class="outlined-btn" data-action="v3-weather-manual">⌂ 设置固定城市</button></div><small>应用不会通过 IP 地址猜测你所在的城市。野外发现坐标仅随个人数据保存和备份。</small></section>`+v4BeforeSettings()};

// 手机底栏沿用小程序易理解的五栏结构；养护日历仍从首页快捷入口和桌面侧栏进入。
renderNav=function(){const current=ui.tab;$('#desktop-nav').innerHTML=[...tabs,['settings','设置与备份','settings']].map(([k,t,i])=>`<button data-nav="${k}" class="nav-btn ${k===current?'active':''}">${ico(i)}<span>${t}</span></button>`).join('');const mobile=[['home','首页','home'],['atlas','图鉴','book'],['recognize','识别','camera'],['plants','一隅','plant'],['settings','我的','settings']];$('#mobile-nav').innerHTML=mobile.map(([k,t,i])=>`<button data-nav="${k}" class="${k===current?'active':''}" aria-label="${t}">${ico(i,23)}<span>${t}</span></button>`).join('')};

const v4BeforeRecognize=recognizeView;
recognizeView=function(){return `<section class="v4-recognition-modes" aria-label="识别与诊断模式"><div class="v4-mode-heading"><span>CAMERA ASSISTANT</span><strong>先选择你想解决的问题</strong></div><div class="v4-mode-buttons"><button class="selected" data-nav="recognize"><i></i>植物识别</button><button data-action="v4-pests"><i></i>病虫害诊断</button><button data-action="v4-guide"><i></i>它该怎么养</button></div><p>植物识别使用你自行配置的 Pl@ntNet；病虫害与养护入口提供本地速查，不会上传照片。</p></section>`+v4BeforeRecognize()};

ui.v4PlantLayout=ui.v4PlantLayout||'grid';
const v4BeforePlants=plantsView;
plantsView=function(){let body=v4BeforePlants();const controls=`<div class="v4-collection-tools"><span>查看方式</span><div><button data-action="v4-plants-layout" data-layout="grid" class="${ui.v4PlantLayout==='grid'?'selected':''}" aria-label="网格显示">▦</button><button data-action="v4-plants-layout" data-layout="list" class="${ui.v4PlantLayout==='list'?'selected':''}" aria-label="列表显示">☷</button></div></div>`;body=body.replace('<div class="toolbar">',controls+'<div class="toolbar">');return `<div class="v4-plants-page ${ui.v4PlantLayout==='list'?'v4-list-view':'v4-grid-view'}">${body}</div>`};

const v4BeforeSpeciesDetail=speciesDetail;
speciesDetail=function(i){v4BeforeSpeciesDetail(i);const actions=document.querySelector('#modal-root .v2-detail-actions');if(!actions)return;const button=document.createElement('button');button.className='primary-btn';button.dataset.action='v4-add-species-plant';button.dataset.id=String(Number(i));button.textContent='＋ 添加到我的一隅';actions.prepend(button);if(v2staticHosting())actions.querySelector('[data-action="v2-ai-species"]')?.remove()};

const v4SettingsWithLocation=settingsView;
settingsView=function(){const pending=(state.tasks||[]).filter(t=>!t.done).length;return `<section class="v4-me-card"><div class="v4-me-avatar">❧</div><div class="v4-me-copy"><span>MY PRIVATE JOURNAL</span><h1>我的植物手记</h1><p>无需账号 · 档案默认保存在当前浏览器</p></div><div class="v4-me-stats"><span><strong>${state.plants.length}</strong> 株植物</span><span><strong>${state.sightings.length}</strong> 条发现</span><span><strong>${pending}</strong> 项待办</span></div></section>`+v4SettingsWithLocation()};

// 首页参考移动端植物图鉴的高频操作层级，但保留一隅现有的私人档案与养护内容。
const v4BeforeHome=homeView;
homeView=function(){let body=v4BeforeHome();body=body.replace(/<section class="v3-weather[^>]*>[\s\S]*?<\/section>/,'');if(v2staticHosting())body=body.replace(/<section class="v2-ai-home">[\s\S]*?<\/section>/,'');body=body.replace('<section class="hero">',v4QuickHub()+'<section class="hero">');return `<div class="v4-home">${v4HomeGreeting()}${body}</div>`};

// v3 原版会在页面加载后主动启动天气刷新。若用户选择了固定城市，刷新它而不触发 GPS。
(function v4Startup(){const start=()=>{let waited=0;const timer=setInterval(()=>{
 if(!state&&waited++<100)return;clearInterval(timer);
 if(v4Pref.mode==='fixed'&&v4Pref.label&&(!v3Weather||v3Weather.locationMethod!=='固定城市'||v3Age(v3Weather)>30*60*1000))v4SetWeather(v4Pref.lat,v4Pref.lon,v4Pref.label,'固定城市').catch(()=>{});
 },100)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();

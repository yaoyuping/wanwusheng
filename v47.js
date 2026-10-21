/* 一隅 v4.7 · 养护日历 / AI 入口 / 野外图鉴 / 识别工作台。只扩展页面，不修改已有 IndexedDB 数据结构。 */
'use strict';

// 1. 养护待办明确提供「浇水」类型；创建和勾选待办不自动虚构一次实际浇水记录。
const v47PreviousTaskForm=v2TaskForm;
v2TaskForm=function(day){
  v47PreviousTaskForm(day);
  const select=document.querySelector('#v2-task-type');
  if(!select)return;
  if(![...select.options].some(o=>o.value==='浇水')){
    const opt=new Option('浇水','浇水'); select.insertBefore(opt,select.firstChild);
  }
  const note=document.createElement('p');note.className='v47-task-hint';
  note.textContent='「浇水」可加入待办日历；标记任务完成不会自动生成实际浇水记录，实际操作请到植物的养护记录中登记。';
  select.closest('.field')?.after(note);
};

// 2. 只在首页和日历展示天气。沿用相同的天气字段、组件及城市切换操作。
const v47PreviousSettings=settingsView;
settingsView=function(){
  const temp=document.createElement('div');temp.innerHTML=v47PreviousSettings();
  temp.querySelectorAll('.v3-weather-settings,.v4-location-settings').forEach(n=>n.remove());
  return temp.innerHTML;
};
function v47CalendarWeather(){
  const tmp=document.createElement('div');tmp.innerHTML=v4HomeGreeting();
  const current=tmp.querySelector('.v4-welcome-weather');
  const strip=tmp.querySelector('.v4-weather-strip');
  return `<section class="v47-calendar-weather" aria-label="养护日历的当地室外天气"><div class="v47-calendar-weather-head"><div><span class="v47-kicker">LOCAL WEATHER · 室外实况</span><h3>今日天气与养护环境</h3><p>与首页同步同一地点的室外天气，仅作养护参考。</p></div>${current?current.outerHTML:''}</div>${strip?strip.outerHTML:'<p>允许定位或设置城市后显示天气。</p>'}</section>`;
}
const v47PreviousCare=careView;
careView=function(){
  const tmp=document.createElement('div');tmp.innerHTML=v47PreviousCare();
  tmp.querySelectorAll('.v3-weather').forEach(n=>n.remove());
  const intro=tmp.querySelector('.v46-page-intro');
  if(intro)intro.insertAdjacentHTML('afterend',v47CalendarWeather());
  else tmp.insertAdjacentHTML('afterbegin',v47CalendarWeather());
  return tmp.innerHTML;
};
const v47PreviousWeatherUpdate=v3UpdateWeatherViews;
v3UpdateWeatherViews=function(){
  v47PreviousWeatherUpdate();
  const widget=document.querySelector('.v47-calendar-weather');
  if(widget){const temp=document.createElement('div');temp.innerHTML=v47CalendarWeather();widget.replaceWith(temp.firstElementChild)}
};

// 3. 从本地介绍直接进入 DeepSeek 辅助诊断/养护建议，并保留离线知识入口。
function v47AssistantPicker(mode){
  const disease=mode==='diagnose', title=disease?'病虫害 · AI 辅助排查':'植物养护 · AI 个性化建议';
  const plants=state?.plants||[];
  modal(title,`<div class="v47-assistant-entry"><div class="v47-assistant-hero"><span>✧ DEEPSEEK PLANT ASSISTANT</span><h3>${disease?'从症状和照片查找可能原因':'结合真实养护记录，让建议更具体'}</h3><p>${disease?'上传异常叶片照片、补充发病时间、浇水和光照变化，AI 将给出可能原因与核查步骤。':'可以分析光照、浇水、季节和养护历史。建议先检查实际植物状况，再决定操作。'}</p></div><h4>选择要分析的植物</h4><div class="v47-assistant-plants"><button data-action="v47-ai-plant" data-mode="${mode}" data-id=""><span class="v47-plant-symbol">✎</span><strong>通用问题</strong><small>不关联档案</small></button>${plants.map(p=>`<button data-action="v47-ai-plant" data-mode="${mode}" data-id="${esc(p.id)}"><span class="v47-plant-symbol">${imageSrc(p.image)?`<img src="${esc(imageSrc(p.image))}" alt="">`:'🌱'}</span><strong>${esc(p.name)}</strong><small>${esc(p.location||'我的植物')} · ${p.logs?.length||0} 条记录</small></button>`).join('')}</div><button class="outlined-btn v47-knowledge-link" data-action="v47-local-guide" data-kind="${disease?'pests':'guide'}">阅读本地${disease?'病虫害':'养护'}知识（无需 AI） →</button><p class="v47-privacy-line">仅在点击「开始 AI 分析」后，才把你的问题、主动选择的照片及该株相关养护记录发送到 DeepSeek。</p></div>`);
}
const v47PreviousAct=act;
act=async function(action,el){
  if(action==='v4-pests'||action==='v47-ai-diagnose'){v47AssistantPicker('diagnose');return}
  if(action==='v4-guide'||action==='v47-ai-care'){v47AssistantPicker('care');return}
  if(action==='v47-local-guide'){v4KnowledgeModal(el.dataset.kind==='pests'?'pests':'guide');return}
  if(action==='v47-ai-plant'){
    const mode=el.dataset.mode==='diagnose'?'diagnose':'care', pid=el.dataset.id||'';
    v2aiModal(pid,mode);
    const q=document.querySelector('#v2-ai-question');
    if(q)q.value=mode==='diagnose'?'请根据我描述的症状、近期浇水、光照和照片，列出可能原因、需要检查的证据与安全的处理顺序；信息不足时请提问，不要武断诊断。':'请结合植物品种、摆放位置、天气季节与已有养护记录，制定下周可执行的观察与养护建议，并区分“检查盆土”和“实际浇水”。';
    // 图片仍需用户显式点击「开始 AI 分析」才会上传。
    if(mode==='diagnose'&&ui.recognitionImage){ui.aiImage=ui.recognitionImage;const preview=document.querySelector('#v2-ai-photo-preview');if(preview)preview.innerHTML=`<img src="${esc(ui.aiImage)}" alt="本次已选照片，点击分析后才会上传">`}
    return;
  }
  if(action==='v47-wild-taxonomy'){await v47LookupWild(el.dataset.id);return}
  if(action==='v47-wild-ai'){await v47WildAI(el.dataset.id);return}
  return v47PreviousAct(action,el);
};
const v47PreviousHome=homeView;
homeView=function(){
  const tmp=document.createElement('div');tmp.innerHTML=v47PreviousHome();
  tmp.querySelectorAll('[data-action="v4-guide"]').forEach(button=>{const parent=button.closest('button');if(!parent)return;const s=parent.querySelector('strong'),n=parent.querySelector('small');if(s)s.textContent='AI 养护建议';if(n)n.textContent='结合植物养护历史'});
  tmp.querySelectorAll('[data-action="v4-pests"]').forEach(button=>{const s=button.querySelector('strong'),n=button.querySelector('small');if(s)s.textContent='AI 病虫害诊断';if(n)n.textContent='照片与症状排查'});
  return tmp.innerHTML;
};

// 4. 图鉴属于野外发现档案，不再独立铺开 4 张示例百科或独立 GBIF 搜索大卡片。
const v47PreviousAtlas=atlasView;
atlasView=function(){
  const tmp=document.createElement('div');tmp.innerHTML=v47PreviousAtlas();
  const headings=[...tmp.querySelectorAll('.intro-row')];
  for(const h of headings){if(h.textContent.includes('植物小百科')){const next=h.nextElementSibling;if(next?.classList.contains('catalog-grid'))next.remove();h.remove()}}
  tmp.querySelectorAll('.yiyu-species-panel').forEach(n=>n.remove());
  const stat=tmp.querySelector('.atlas-stat');
  if(stat)stat.insertAdjacentHTML('afterend','<p class="v47-atlas-explain">每一株野外发现都有自己的图鉴页：打开观察记录，可查询 GBIF 科属和六章节植物介绍，也可以请 DeepSeek 补充知识。</p>');
  return tmp.innerHTML;
};
const v47PreviousSightingDetail=sightingDetail;
sightingDetail=function(sid){
  v47PreviousSightingDetail(sid);
  const s=state.sightings.find(x=>x.id===sid),body=document.querySelector('#modal-root .v2-tab-body');if(!s||!body)return;
  // 去掉旧版『打开独立植物百科』按钮，统一在这条野外发现内部展示。
  const oldEncyclopedia=body.querySelector('[data-action="v2-species-by-name"]');
  oldEncyclopedia?.closest('.v2-subpanel')?.remove();
  const match=flora.find(x=>x.name===s.name||x.latin?.toLowerCase()===s.latin?.toLowerCase());
  const chapters=match?`<div class="v47-species-chapters">${V2_SECTIONS.map((name,i)=>`<details ${i===0?'open':''}><summary><span>${String(i+1).padStart(2,'0')}</span>${esc(name)}<span class="v47-disclosure">⌄</span></summary><p>${esc(v2speciesSection(match,name)||'暂无资料')}</p></details>`).join('')}</div>`:
    '<div class="v47-wild-prompt">当前没有该物种的本地科普资料。可点击下方 GBIF 查询分类信息，或用 DeepSeek 获取六章节简介草稿，随后核实来源。</div>';
  body.insertAdjacentHTML('beforeend',`<section class="v47-wild-knowledge" aria-label="这株野外植物的内部图鉴"><div class="v47-wild-heading"><span>FIELD GUIDE · 植物图鉴</span><h3>${esc(s.name)} · 物种介绍</h3><p>${esc(s.latin||'学名尚待核实')} · 你在野外遇见的植物</p></div>${chapters}<div class="v47-wild-actions"><button class="outlined-btn" data-action="v47-wild-taxonomy" data-id="${esc(sid)}">GBIF 科属信息 ↗</button><button class="primary-btn" data-action="v47-wild-ai" data-id="${esc(sid)}">✧ AI 六章节介绍</button></div><div class="v47-wild-remote" id="v47-wild-info" aria-live="polite"></div><p class="v47-wild-source">GBIF 用于分类学名核对；AI 生成的信息是待验证的草稿，不能作为物种确认依据。</p></section>`);
};
async function v47LookupWild(sid){
  const s=state.sightings.find(x=>x.id===sid),target=document.getElementById('v47-wild-info');if(!s||!target)return;
  const query=(s.latin||s.name||'').trim();
  if(query.length<2){target.textContent='请先为这株植物填写名称或学名';return}
  target.innerHTML='<div class="v47-loading">正在查询 GBIF 科属资料…</div>';
  try{
    const res=await v2post('/api/species',{query});const items=Array.isArray(res.results)?res.results:[];
    const match=items.find(x=>[x.canonicalName,x.scientificName].some(v=>v&&s.latin&&v.toLowerCase()===s.latin.toLowerCase()))||items[0];
    target.innerHTML=match?`<div class="v47-taxonomy-result"><b>${esc(match.canonicalName||match.scientificName||'物种名称待核对')}</b><div>科：${esc(match.family||'未收录')} · 属：${esc(match.genus||'未收录')}</div><small>分类状态：${esc(match.status||'未注明')} · ${esc(match.rank||'分类级别待核实')}</small>${match.key?`<a href="https://www.gbif.org/species/${encodeURIComponent(match.key)}" target="_blank" rel="noopener noreferrer">查看 GBIF 来源 ↗</a>`:''}<small>候选资料需和实际形态核对，不代表已识别成功。</small></div>`:'<div class="v47-wild-prompt">GBIF 没有找到明确结果，请尝试补充更完整的拉丁学名。</div>';
  }catch(err){target.innerHTML=`<div class="v47-wild-prompt">查询失败：${esc(err.message)}。请检查 AI 后端连接或网络。</div>`}
}
async function v47WildAI(sid){
  const s=state.sightings.find(x=>x.id===sid),target=document.getElementById('v47-wild-info');if(!s||!target)return;
  target.innerHTML='<div class="v47-loading">正在生成植物图鉴草稿，请稍候…</div>';
  try{
    const response=await v2post('/api/ai',{mode:'species',plant:{name:s.name,latin:s.latin||''},question:`为野外观察植物「${s.name}」（${s.latin||'学名未知'}）撰写可查证的六章节中文植物百科草稿：形态特征、分布与生境、栽培技术、主要价值、植物文化、近种区别。区分有据事实和未验证描述；若学名不确定，请明确提出需要核对的信息。不要臆造资料来源。`});
    target.innerHTML=`<div class="v47-ai-wild-result"><span>✧ DeepSeek · 待核对草稿</span><div>${esc(response.answer||'未返回内容').replace(/\n/g,'<br>')}</div></div>`;
  }catch(err){target.innerHTML=`<div class="v47-wild-prompt">AI 生成失败：${esc(err.message)}。请检查 DeepSeek 服务配置。</div>`}
}

// 5. 将识别页面改造成集中操作的图文工作台，不再拆成零散的工具区域。
const v47PreviousRecognize=recognizeView;
recognizeView=function(){
  const source=document.createElement('div');source.innerHTML=v47PreviousRecognize();
  const drop=source.querySelector('#rec-dropzone');
  const tips=source.querySelector('.v453-capture');
  const actions=source.querySelector('.recognize-actions');
  const message=source.querySelector('.recognize-small');
  const info=source.querySelector('.recognize-info');
  const results=source.querySelector('.v453-results');
  const note=source.querySelector('.v46-alert');
  const flow=source.querySelector('.v46-identify-flow');
  return `<div class="v47-recognition"><section class="v47-recognize-hero"><div><span class="v47-kicker">BOTANICAL CAMERA · 认识自然</span><h1>拍下植物，慢慢认识它。</h1><p>以照片为线索，比对相似物种，确认后再收进自己的自然图鉴。</p></div><div class="v47-mode-pills"><button class="is-active" type="button" data-nav="recognize">◎ 植物识别</button><button type="button" data-action="v47-ai-diagnose">✧ 病虫害诊断</button><button type="button" data-action="v47-ai-care">♧ 它该怎么养</button></div></section>${flow?flow.outerHTML:''}<div class="v47-recognize-grid"><section class="v47-upload-card"><div class="v47-card-overline"><span>01 · 上传植物照片</span><small>单株植物 · 最多五张</small></div>${drop?drop.outerHTML:''}<div class="v47-main-actions">${actions?actions.innerHTML:''}</div>${message?message.outerHTML:''}<div class="v47-upload-privacy">🔒 只有主动点击“开始识别植物”后才会上传所选图片。</div></section><aside class="v47-recognize-side"><div class="v47-side-intro"><span>02 · 补充观察视角</span><p>同一株植物的全株、叶片、叶柄、花或果实放在一起识别，通常更有参考价值。</p></div>${tips?tips.outerHTML:''}<div class="v47-ai-strip"><div><strong>✧ DeepSeek 辅助辨认</strong><small>对比候选物种和鉴别特征</small></div><button class="outlined-btn" data-action="v2-ai-identify">AI 看图</button></div>${info?`<details class="v46-know-details"><summary>数据来源与隐私保护</summary>${info.outerHTML}</details>`:''}</aside></div>${results?results.outerHTML:''}${note?note.outerHTML:''}</div>`;
};

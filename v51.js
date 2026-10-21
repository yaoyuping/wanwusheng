/* 万物生 v5.1 · 四项定向交互修正。保留 IndexedDB、AI 后端接口及本地知识库。 */
'use strict';

// 我的植物采用与首页相同的天气卡片，而不是旧版 v3 天气模块。
const v51PreviousPlants = plantsView;
plantsView = function(){
  const box = document.createElement('div');
  box.innerHTML = v51PreviousPlants();
  box.querySelectorAll('.v3-weather').forEach(old => {
    const holder = document.createElement('div');
    holder.className = 'v51-plants-weather';
    holder.innerHTML = v50WeatherCard();
    old.replaceWith(holder);
  });
  return box.innerHTML;
};

// 识别流程：两条独立引擎入口，状态/养护入口直接进 DeepSeek 问答。
const v51PreviousRecognize = recognizeView;
recognizeView = function(){
  const root = document.createElement('div');
  root.innerHTML = v51PreviousRecognize();
  const modes = root.querySelector('.v50-recognition-modes');
  if(modes){
    modes.querySelectorAll('button').forEach(btn=>{
      if(btn.dataset.action==='v48-local-issues'){
        btn.dataset.action='v51-ai-diagnose';
        btn.innerHTML = v50Icon('shield',18)+' 状态排查';
      }else if(btn.dataset.action==='v48-local-care'){
        btn.dataset.action='v51-ai-care';
        btn.innerHTML = v50Icon('book',18)+' 怎么养';
      }
    });
    modes.insertAdjacentHTML('afterend',`<div class="v51-engine-choices" aria-label="选择植物识别方式"><button class="v51-engine v51-engine-primary" type="button" data-action="v51-plantnet">${v50Icon('camera',23)}<span><strong>Pl@ntNet 识别</strong><small>多张照片 · 物种候选</small></span>${v50Icon('arrowright',19)}</button><button class="v51-engine v51-engine-secondary" type="button" data-action="v51-deepseek-identify">${v50Icon('sparkle',23)}<span><strong>DeepSeek AI 识别</strong><small>看图分析 · 相似种辨别</small></span>${v50Icon('arrowright',19)}</button></div>`);
  }
  // 去除旧版重复的 Pl@ntNet/DeepSeek 按钮，避免三四个入口指向同一动作。
  root.querySelectorAll('.v47-main-actions [data-action="identify"],.v47-ai-strip,.v2-ai-recognition').forEach(node=>node.remove());
  const manual = root.querySelector('.v47-main-actions [data-action="new-sighting"]');
  if(manual)manual.textContent='＋ 手动记录发现';
  const work=root.querySelector('.v50-recognition-work');
  if(work){
    const status=work.querySelector('.recognize-small');
    if(status)status.classList.add('v51-identify-status');
  }
  return root.innerHTML;
};

// 弹出 AI 工作台。可直接提问，也可选择已有植物并携带其养护记录。
function v51OpenAI(mode){
  v2aiModal('', mode);
  // Reuse a selected photo as a local preview; nothing is transmitted until Start AI Analysis.
  if(ui.recognitionImage&&mode==='diagnose'){
    ui.aiImage=ui.recognitionImage;
    const preview=document.querySelector('.v50-photo-preview');
    if(preview){preview.innerHTML='';const photo=document.createElement('img');photo.src=ui.aiImage;photo.alt='已选择的植物照片';preview.append(photo)}
    const legacy=document.querySelector('#v2-ai-photo-preview');
    if(legacy)legacy.innerHTML=`<img src="${esc(ui.aiImage)}" alt="已选择的植物照片">`;
  }
  const box = document.querySelector('#modal-root .v48-ai-text');
  const button = document.querySelector('#v2-ai-run');
  if(!box||!button)return;
  if(mode==='diagnose'||mode==='care'){
    const form=document.createElement('div');
    form.className='v51-ai-plant-select';
    const rows=(state?.plants||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.location||'未记录位置')}</option>`).join('');
    form.innerHTML=`<label for="v51-ai-plant">关联植物档案（可选）</label><select id="v51-ai-plant"><option value="">通用问题 · 不关联植物</option>${rows}</select>`;
    box.insertBefore(form,box.querySelector('.v48-ai-prompts'));
    const q=document.querySelector('#v2-ai-question');
    if(q)q.value=mode==='diagnose'?'请根据我提供的症状和照片，列出可能原因、需要优先检查的证据以及稳妥的处理顺序；不能确定时请明确说明。':'请结合我的植物品种、光照、盆土和养护记录给出观察与养护建议，并区分检查土壤和实际浇水。';
    form.querySelector('select').addEventListener('change',e=>{button.dataset.id=e.target.value;});
  }
}

const v51PreviousAct = act;
act = async function(action, el){
  if(action==='v51-plantnet'){
    // 使用既有多角度照片 Pl@ntNet 调用，不改变照片权限和上传规则。
    await identify();
    return;
  }
  if(action==='v51-deepseek-identify'){
    // 保留旧版 AI 入口的主照片预填行为。
    await v51PreviousAct('v2-ai-identify',el);
    if(ui.aiImage){
      const preview=document.querySelector('.v50-photo-preview');
      if(preview){preview.innerHTML='';const img=document.createElement('img');img.src=ui.aiImage;img.alt='已选择的待分析照片';preview.append(img)}
    }
    return;
  }
  if(action==='v51-ai-diagnose'||action==='v51-ai-care'){
    v51OpenAI(action==='v51-ai-diagnose'?'diagnose':'care');
    return;
  }
  // 从本地知识库点「深入问 AI」时，直接进问答，不再额外显示“阅读本地知识”。
  if(action==='v48-to-ai'){
    const mode=el.dataset.mode==='diagnose'?'diagnose':'care';
    if(el.dataset.id)v2aiModal(el.dataset.id,mode);
    else v51OpenAI(mode);
    return;
  }
  return v51PreviousAct(action,el);
};

// 同一模版天气数据刷新时替换首页、我的植物、日历的天气条。
const v51PreviousWeatherUpdate = v3UpdateWeatherViews;
v3UpdateWeatherViews = function(){
  v51PreviousWeatherUpdate();
  const calendar=document.querySelector('.v50-calendar-page .v47-calendar-weather');
  if(calendar&&!calendar.querySelector('.v50-weather')){calendar.innerHTML=v50WeatherCard();calendar.classList.add('v50-weather-container');}
  document.querySelectorAll('.v50-weather').forEach(card=>{
    const host=document.createElement('div');host.innerHTML=v50WeatherCard();
    const updated=host.firstElementChild;
    if(updated)card.replaceWith(updated);
  });
};

// 顶栏「收下一株植物」仅在需要时展示；首页和野外发现页删除重复按钮。
const v51PreviousRender = render;
render = function(){
  v51PreviousRender();
  const add=document.querySelector('.topbar .top-add');
  if(add){
    const visible=!['home','atlas'].includes(ui.tab);
    add.hidden=!visible;
    if(visible)add.dataset.v51Visible='1';else delete add.dataset.v51Visible;
  }
};

// 所有 DeepSeek 助手的选择面板隐藏“阅读本地知识”回跳按钮，知识库仍可从首页访问。
const v51PreviousPicker = v47AssistantPicker;
v47AssistantPicker = function(mode){
  v51PreviousPicker(mode);
  document.querySelectorAll('#modal-root .v47-knowledge-link').forEach(el=>el.remove());
};

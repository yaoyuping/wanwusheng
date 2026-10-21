/* 万物生 v5.2 · 页面顶部操作精简与 Pl@ntNet 独立折叠工作台。 */
'use strict';
const v52PreviousRecognize=recognizeView;
recognizeView=function(){
 const tmp=document.createElement('div');
 tmp.innerHTML=v52PreviousRecognize();
 const main=tmp.querySelector('.v50-recognition');
 if(!main)return tmp.innerHTML;
 const choices=main.querySelector('.v51-engine-choices');
 const work=main.querySelector('.v50-recognition-work');
 if(!choices||!work)return tmp.innerHTML;
 const open=Boolean(ui.v52PlantnetOpen);
 const trigger=choices.querySelector('[data-action="v51-plantnet"]');
 if(trigger){
  trigger.setAttribute('aria-controls','v52-plantnet-panel');
  trigger.setAttribute('aria-expanded',String(open));
  trigger.classList.toggle('v52-engine-selected',open);
  const small=trigger.querySelector('small');
  if(small)small.textContent=open?'已展开 · 上传同株植物照片':'多角度照片 · 物种候选';
  const arrow=trigger.querySelector('svg:last-child');
  if(arrow)arrow.classList.add('v52-toggle-arrow');
 }
 // 识别上传只有在 Pl@ntNet 入口展开时出现；DeepSeek 仍使用独立 AI 弹窗。
 const panel=document.createElement('section');
 panel.id='v52-plantnet-panel';
 panel.className='v52-plantnet-panel';
 panel.setAttribute('aria-label','Pl@ntNet 植物识别上传与候选结果');
 if(!open)panel.hidden=true;
 const head=document.createElement('div');
 head.className='v52-panel-heading';
 head.innerHTML=`<div><span>PL@NTNET</span><h2>从不同角度，认识同一株植物</h2></div><button type="button" data-action="v52-close-plantnet" class="v52-fold-btn" aria-label="收起 Pl@ntNet 工作台">收起 <span aria-hidden="true">⌃</span></button>`;
 panel.append(head);
 const actions=work.querySelector('.v47-main-actions');
 if(actions){
  const run=document.createElement('button');
  run.type='button';run.className='primary-btn v52-identify-run';
  run.dataset.action='v52-identify-run';
  run.disabled=Boolean(ui.recognitionLoading);
  run.innerHTML=ui.recognitionLoading?'正在识别…':`${v50Icon('camera',18)} 开始 Pl@ntNet 识别`;
  actions.prepend(run);
 }
 panel.append(work);
 // 候选卡片及提示与上传区始终属于 Pl@ntNet，不和 DeepSeek 窗口混放。
 for(const selector of ['.v50-result-head','.v453-results','.v46-alert','.v50-recognition-empty']){
  const node=main.querySelector(selector);
  if(node)panel.append(node);
 }
 choices.after(panel);
 // 内部内容只有在展开时才参与正常焦点导航。
 return tmp.innerHTML;
};
const v52PreviousAct=act;
act=async function(action,el){
 if(action==='v51-plantnet'){
  ui.v52PlantnetOpen=!Boolean(ui.v52PlantnetOpen);
  render();
  if(ui.v52PlantnetOpen){
   const panel=document.getElementById('v52-plantnet-panel');
   if(panel)panel.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }
  return;
 }
 if(action==='v52-close-plantnet'){
  ui.v52PlantnetOpen=false;render();
  const trigger=document.querySelector('[data-action="v51-plantnet"]');
  if(trigger)trigger.focus({preventScroll:true});
  return;
 }
 if(action==='v52-identify-run'){
  // 防止重复点击或部分浏览器重复派发事件而造成双重付费请求。
  if(ui.recognitionLoading||Date.now()-(ui.v52LastIdentifyAt||0)<1100)return;
  ui.v52LastIdentifyAt=Date.now();
  ui.v52PlantnetOpen=true;
  await identify();
  return;
 }
 return v52PreviousAct(action,el);
};
// 所有页面共用顶栏，但新增植物快捷按钮只在「我的植物」保留。
const v52PreviousRender=render;
render=function(){
 v52PreviousRender();
 const add=document.querySelector('.topbar .top-add');
 if(add){
  const show=ui.tab==='plants';
  add.hidden=!show;
  if(show)add.dataset.v51Visible='1';
  else delete add.dataset.v51Visible;
 }
};

/* 万物生 v5.3 · 双引擎内嵌工作台，无识别弹窗。 */
'use strict';
ui.v53DeepSeekOpen=false;
ui.v53Question='';
ui.v53AIAnswer='';
const v53PreviousRecognize=recognizeView;
recognizeView=function(){
 const root=document.createElement('div');
 root.innerHTML=v53PreviousRecognize();
 const main=root.querySelector('.v50-recognition');
 if(!main)return root.innerHTML;
 // “手动记录发现”仅在野外发现页保留，不再出现在 Pl@ntNet 上传流程。
 main.querySelectorAll('.v47-main-actions [data-action="new-sighting"]').forEach(node=>node.remove());
 const choices=main.querySelector('.v51-engine-choices');
 if(!choices)return root.innerHTML;
 const deepButton=choices.querySelector('[data-action="v51-deepseek-identify"]');
 const open=Boolean(ui.v53DeepSeekOpen);
 if(deepButton){
  deepButton.setAttribute('aria-controls','v53-deepseek-panel');
  deepButton.setAttribute('aria-expanded',String(open));
  deepButton.classList.toggle('v53-engine-selected',open);
  const label=deepButton.querySelector('small');
  if(label)label.textContent=open?'已展开 · 看图与提问':'看图分析 · 相似种辨别';
 }
 const ai=document.createElement('section');
 ai.id='v53-deepseek-panel';ai.className='v53-deepseek-panel';
 ai.setAttribute('aria-label','DeepSeek AI 植物识别工作台');
 if(!open)ai.hidden=true;
 const pic=typeof ui.aiImage==='string' && /^data:image\/(jpeg|png|webp);base64,/.test(ui.aiImage)?`<img src="${esc(ui.aiImage)}" alt="待分析的植物照片">`:'';
 const prompts=['这可能是什么植物？请比较相似种','还需要补拍哪些部位？'];
 if(open)ai.innerHTML=`<div class="v53-panel-top"><div><span>DEEPSEEK · AI IDENTIFICATION</span><h2>用照片，进一步了解它。</h2></div><button type="button" data-action="v53-close-deepseek" class="v52-fold-btn" aria-label="收起 AI 识别">收起 <span aria-hidden="true">⌃</span></button></div>
 <div class="v53-ai-body">
  <section class="v53-ai-photo"><div class="v53-step">01 · 植物照片 <small>上传一张清晰照片</small></div>
   <div class="v53-ai-photo-frame" id="v2-ai-photo-preview">${pic||`<div class="v53-photo-placeholder"><span class="v53-photo-icon">${v50Icon('camera',30)}</span><strong>拍照或选择图片</strong><small>全株、叶片、花果均可</small></div>`}</div>
   <div class="v53-ai-photo-actions"><label for="v2-ai-image" class="outlined-btn v53-upload-label">${v50Icon('plus',17)} 选择照片</label><span class="v53-file-name" id="v53-file-label">${pic?'已选择一张照片':'尚未选择照片'}</span><input type="file" id="v2-ai-image" accept="image/*" aria-label="选择要分析的植物照片"></div>
  </section>
  <section class="v53-ai-question"><div class="v53-step">02 · 补充问题 <small>可以选一个问题，也可以自己输入</small></div>
   <div class="v53-suggestions">${prompts.map(x=>`<button type="button" data-action="v48-ai-prompt" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>
   <label class="v53-question-label" for="v2-ai-question">想了解什么？</label><textarea id="v2-ai-question" rows="5" placeholder="例如：请根据照片判断可能的植物，并指出需要核对的特征。">${esc(ui.v53Question||'')}</textarea>
   <div class="v53-ai-note">仅在点击「开始 AI 识别」后发送照片与问题；结果仅供参考，不等同于物种鉴定。</div>
   <button class="primary-btn v53-run-btn" id="v2-ai-run" type="button" data-action="v2-ai-run" data-mode="identification" data-id="">${v50Icon('sparkle',18)} 开始 AI 识别</button>
  </section>
 </div><div id="v2-ai-result" class="v53-ai-result" aria-live="polite">${ui.v53AIAnswer||''}</div>`;
 choices.after(ai);
 return root.innerHTML;
};
const v53PreviousAct=act;
act=async function(action,el){
 if(action==='v51-deepseek-identify'){
  ui.v53DeepSeekOpen=!Boolean(ui.v53DeepSeekOpen);
  if(ui.v53DeepSeekOpen){
   ui.v52PlantnetOpen=false;
   if(!ui.aiImage&&ui.recognitionImage)ui.aiImage=ui.recognitionImage;
  }
  render();
  if(ui.v53DeepSeekOpen)document.getElementById('v53-deepseek-panel')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  return;
 }
 if(action==='v53-close-deepseek'){
  ui.v53DeepSeekOpen=false;render();
  document.querySelector('[data-action="v51-deepseek-identify"]')?.focus({preventScroll:true});
  return;
 }
 if(action==='v51-plantnet'){
  ui.v53DeepSeekOpen=false;
  return v53PreviousAct(action,el);
 }
 if((action==='v51-ai-diagnose'||action==='v51-ai-care')&&ui.v53DeepSeekOpen){
  // 避免同一文档里出现两个 #v2-ai-question / #v2-ai-run。
  ui.v53DeepSeekOpen=false;render();
  return v53PreviousAct(action,el);
 }
 if(action==='v48-ai-prompt' && ui.v53DeepSeekOpen && ui.tab==='recognize'){
  ui.v53Question=el.dataset.value||'';
  const box=document.getElementById('v2-ai-question');
  if(box){box.value=ui.v53Question;box.focus();}
  return;
 }
 return v53PreviousAct(action,el);
};
// 复用原来的服务端 DeepSeek 请求与响应处理；只记住这一页的答案。
const v53PreviousAiRun=v2aiRun;
v2aiRun=async function(pid,mode){
 await v53PreviousAiRun(pid,mode);
 if(ui.v53DeepSeekOpen&&ui.tab==='recognize')ui.v53AIAnswer=document.getElementById('v2-ai-result')?.innerHTML||'';
};
document.addEventListener('input',e=>{
 if(e.target?.id==='v2-ai-question'&&ui.v53DeepSeekOpen&&ui.tab==='recognize')ui.v53Question=e.target.value;
});
document.addEventListener('change',e=>{
 if(e.target?.id!=='v2-ai-image'||!ui.v53DeepSeekOpen||ui.tab!=='recognize')return;
 const file=e.target.files?.[0];
 if(!file)return;
 ui.v53AIAnswer='';
 const result=document.getElementById('v2-ai-result');if(result)result.innerHTML='';
 const label=document.getElementById('v53-file-label');if(label)label.textContent=file.name;
 const holder=document.getElementById('v2-ai-photo-preview');if(holder&&typeof v50Preview==='function')v50Preview(e.target,holder);
});

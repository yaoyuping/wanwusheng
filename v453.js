/* 一隅 v4.5.3 · 多角度识别 + 图文候选对比。保留 v4.5.2 全部既有数据结构。 */
'use strict';
ui.v453ExtraImages=ui.v453ExtraImages||[];
ui.v453PrimaryOrgan=ui.v453PrimaryOrgan||'auto';
ui.v453ReferenceCache=ui.v453ReferenceCache||Object.create(null);
const v453PreviousRecognize=recognizeView;
const v453PreviousIdentify=identify;
const v453PreviousAct=act;
const V453_ORGANS={auto:'自动识别部位',leaf:'叶片',flower:'花朵',fruit:'果实',bark:'树皮'};
function v453Option(organ,current){return Object.entries(V453_ORGANS).map(([key,name])=>`<option value="${key}"${key===current?' selected':''}>${name}</option>`).join('')}
function v453Reference(x){const p=x?.images?.[0];if(!p)return null;const u=typeof p.url==='string'?p.url:(p.url?.m||p.url?.s||p.url?.o);try{const url=new URL(u);if(url.protocol!=='https:')return null;return {...p,src:url.href}}catch{return null}}
function v453DisplayName(r){const c=(r.species?.commonNames||[]).find(x=>/[\u3400-\u9fff]/.test(x));return c||r.species?.scientificNameWithoutAuthor||'未确认植物'}
function v453Latin(r){return r.species?.scientificNameWithoutAuthor||''}
function v453Percent(r){return Math.round(Math.max(0,Math.min(1,Number(r.score)||0))*100)}
function v453Caution(r){const s=Number(r.score)||0;return s<.6?'当前证据不足，建议补拍后再判断':'模型相对匹配分数，不代表鉴定准确率'}
function v453CandidateCard(r,i){const img=v453Reference(r);const latin=v453Latin(r),pct=v453Percent(r);const family=r.species?.family?.scientificName||r.gbif?.family||'科属待核实';return `<article class="v453-species-card"><div class="v453-photo">${img?`<img loading="lazy" src="${esc(img.src)}" alt="${esc(latin)} 的参考照片" referrerpolicy="no-referrer">`:'<div class="v453-photo-empty"><span>❧</span><small>参考照片暂不可用</small></div>'}<span class="v453-photo-label">参考图 · ${img?(img.source||'Pl@ntNet / 观察者'):'待补充'}</span></div><div class="v453-species-content"><div class="v453-candidate-head"><span class="v453-rank">候选 ${i+1}</span><span class="v453-match ${pct<60?'uncertain':''}">${pct}% <small>匹配分数</small></span></div><h3>${esc(v453DisplayName(r))}</h3><p class="v453-latin">${esc(latin||'暂无学名')}</p><div class="v453-taxonomy"><span>科 · ${esc(family)}</span>${r.species?.genus?.scientificName?`<span>属 · ${esc(r.species.genus.scientificName)}</span>`:''}</div>${img?`<small class="v453-credit">${esc(img.citation||[img.author,'Pl@ntNet',img.license].filter(Boolean).join(' / ')||'来源 Pl@ntNet，版权归原作者')}</small>`:''}<p class="v453-caution">${pct<60?'△':'ⓘ'} ${v453Caution(r)}</p><button class="v453-view-btn" type="button" data-action="v453-details" data-id="${i}">查看图片与鉴别要点 <span>↗</span></button></div></article>`}
function v453Tips(){return `<section class="v453-capture panel"><div class="v453-capture-title"><span class="v453-sprig">✳</span><div><h3>多角度拍照 · 识别更有依据</h3><p>拍同一株植物的叶片特写、全株、叶柄或花果；最多五张照片共同识别。</p></div></div><div class="v453-organ-row"><label>主照片部位 <select id="v453-primary-organ" aria-label="主照片部位">${v453Option(null,ui.v453PrimaryOrgan)}</select></label><label class="v453-attach">＋ 添加其他角度 <input id="v453-add-photos" type="file" accept="image/*" multiple aria-label="添加同株植物其他角度照片" hidden></label></div><div class="v453-extras">${ui.v453ExtraImages.length?ui.v453ExtraImages.map((p,i)=>`<div class="v453-extra"><img src="${esc(p.image)}" alt="第 ${i+2} 张照片"><div><span>第 ${i+2} 张</span><select data-v453-organ="${i}" aria-label="照片 ${i+2} 部位">${v453Option(null,p.organ)}</select></div><button type="button" data-action="v453-remove-photo" data-id="${i}" aria-label="删除这张补充照片">×</button></div>`).join(''):'<p class="v453-extra-empty">目前只有一张主照片。建议补拍清晰的叶柄、叶片或花果特写。</p>'}</div><p class="v453-capture-note">照片仅在点击「开始识别植物」后发给 Pl@ntNet；不同植物不要放在同一次识别里。</p></section>`;}
recognizeView=function(){
 const results=ui.recognitionResults;
 let body='';
 try{if(results?.length)ui.recognitionResults=null;body=v453PreviousRecognize()}
 finally{ui.recognitionResults=results}
 // Reuse the existing photo picker and action buttons, replace only the old text-only result list.
 body=body.replace('<div class="recognize-actions">',v453Tips()+'<div class="recognize-actions">');
 if(results?.length){const top=Number(results[0]?.score)||0;body+=`<section class="v453-results"><div class="v453-result-head"><div><span class="v453-kicker">BOTANICAL IDENTIFICATION</span><h2>植物识别 · 候选图鉴</h2><p>对照你拍摄的植物与参考图，观察叶形、叶柄、花果及树干；不要只看第一名。</p></div><span class="v453-status ${top<.6?'uncertain':''}">${top<.6?'△ 建议补拍核对':'○ 仍需人工核对'}</span></div><div class="v453-candidates">${results.map(v453CandidateCard).join('')}</div><p class="v453-result-foot">照片由 Pl@ntNet 或公开生物多样性资料提供，署名与许可随图片显示。分数来自图片模型，并非经科学验证的正确率。</p></section>`;queueMicrotask(v453HydratePhotos)}
 return body;
};
identify=async function(){
 if(!ui.recognitionImage){toast('请先选择一张植物照片');return}
 const primary=$('#v453-primary-organ');if(primary)ui.v453PrimaryOrgan=primary.value;
 document.querySelectorAll('[data-v453-organ]').forEach(el=>{const i=Number(el.dataset.v453Organ);if(ui.v453ExtraImages[i])ui.v453ExtraImages[i].organ=el.value});
 const pics=[{image:ui.recognitionImage,organ:ui.v453PrimaryOrgan},...ui.v453ExtraImages];
 ui.recognitionLoading=true;ui.recognitionResults=null;ui.recognitionMessage=`正在比对 ${pics.length} 张照片，获取物种参考图…`;render();
 try{const j=await v2post('/api/identify',{image:ui.recognitionImage,images:pics.map(x=>x.image),organs:pics.map(x=>x.organ)});
  ui.recognitionResults=Array.isArray(j.results)?j.results:[];
  const first=ui.recognitionResults[0];ui.recognitionMessage=!first?'识别没有返回候选，请换角度或补拍特写。':(Number(first.score)||0)<.6?'已取得候选，但首位匹配分数较低。建议对照参考图或补拍，不要直接认定。':'已找到候选植物，请结合照片和特征自行核对。';
  if(pics.length>1 && Number(j.imagesUsed)!==pics.length)ui.recognitionMessage+=' 当前后端仅处理一张照片，请部署 v4.5.3 新后端以启用多图联合识别。';
 }catch(e){ui.recognitionMessage='识别失败：'+e.message}
 finally{ui.recognitionLoading=false;render()}
};
function v453Details(i){const r=ui.recognitionResults?.[Number(i)];if(!r)return;const img=v453Reference(r),latin=v453Latin(r),pct=v453Percent(r);const gallery=(r.images||[]).map(v=>v453Reference({images:[v]})).filter(Boolean).slice(0,3);
 const group=r.species?.family?.scientificName||r.gbif?.family||'未核对',genus=r.species?.genus?.scientificName||'未核对';
 const isPalm=/arecaceae|phoenix|jub[a]?ea/i.test([group,genus,latin].join(' '));const checks=isPalm?['叶片是羽状还是掌状？观察叶轴及小叶排列。','叶柄基部是否有刺、刺的形状与密度如何？','是否有树干或叶基残留？树冠和小叶姿态如何？','能否拍摄花序或果实，判断海枣属内部的区别？']:['叶片的形状、叶缘和叶脉是否与参考图一致？','叶序及叶柄连接方式是否相符？','花朵、果实、树皮是否能提供进一步证据？','有无其他形态相近但不同属种的植物？'];
 modal('植物识别 · 候选详情',`<div class="v453-detail"><div class="v453-detail-photo">${img?`<img src="${esc(img.src)}" alt="${esc(latin)} 参考照片">`:'<div class="v453-photo-empty">暂无可靠参考照片</div>'}</div>${gallery.length>1?`<div class="v453-detail-thumbnails">${gallery.map((p,j)=>`<button type="button" data-action="v453-photo" data-id="${j}" data-candidate="${Number(i)}" aria-label="查看第 ${j+1} 张参考照片"><img src="${esc(p.src)}" alt="${esc(latin)} 图片 ${j+1}"></button>`).join('')}</div>`:''}<p class="v453-credit" id="v453-photo-credit">${esc(img?.citation||'无可用照片；请点击下方植物来源查看更多观察资料。')}</p><div class="v453-detail-head"><span class="v453-rank">候选 ${Number(i)+1}</span><span class="v453-match ${pct<60?'uncertain':''}">${pct}% 匹配分数</span></div><h2>${esc(v453DisplayName(r))}</h2><em>${esc(latin)}</em><dl><div><dt>科</dt><dd>${esc(group)}</dd></div><div><dt>属</dt><dd>${esc(genus)}</dd></div><div><dt>学名来源</dt><dd>Pl@ntNet ${r.gbif?.key?'· GBIF #'+esc(r.gbif.key):''}</dd></div></dl><h3>请对照以下鉴别特征</h3><ul>${checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="v453-warning">${v453Caution(r)}。本页面列出核对要点，不代表已确认照片中的物种。</p><div class="v453-detail-actions"><button type="button" class="primary-btn" data-action="v453-save" data-id="${Number(i)}">已核对 · 保存到档案</button><button type="button" class="outlined-btn" data-action="v453-compare-ai" data-id="${Number(i)}">✧ DeepSeek 辅助比较</button>${r.gbif?.key?`<a class="outlined-btn" target="_blank" rel="noopener noreferrer" href="https://www.gbif.org/species/${encodeURIComponent(r.gbif.key)}">GBIF 学名 ↗</a>`:''}${latin?`<a class="outlined-btn" target="_blank" rel="noopener noreferrer" href="https://www.inaturalist.org/search?q=${encodeURIComponent(latin)}">更多实拍 ↗</a>`:''}</div></div>`);
}
act=async function(action,el){
 switch(action){
 case 'v453-details':v453Details(el.dataset.id);return;
 case 'v453-photo':{const r=ui.recognitionResults?.[Number(el.dataset.candidate)];const entry=r?.images?.[Number(el.dataset.id)];const ref=v453Reference({images:[entry]});if(ref){const photo=$('.v453-detail-photo img');if(photo)photo.src=ref.src;const credit=$('#v453-photo-credit');if(credit)credit.textContent=ref.citation||'参考照片来源 Pl@ntNet';}return}
 case 'v453-remove-photo':{const n=Number(el.dataset.id);if(n>=0&&n<ui.v453ExtraImages.length){ui.v453ExtraImages.splice(n,1);render()}return}
 case 'v453-save':{const i=Number(el.dataset.id),r=ui.recognitionResults?.[i];if(!r)return;if(Number(r.score)<.6&&!confirm('这只是低分候选，尚不能确认物种。仍要保存为待核实档案吗？'))return;saveIdentified(i);return}
 case 'v453-compare-ai':{const r=ui.recognitionResults?.[Number(el.dataset.id)];if(!r)return;const shortlist=(ui.recognitionResults||[]).slice(0,4).map(x=>`${v453Latin(x)} (${v453Percent(x)}%)`).join('、');v2aiModal('','identify');ui.aiImage=ui.recognitionImage;const preview=$('#v2-ai-photo-preview');if(preview)preview.innerHTML=`<img src="${esc(ui.aiImage)}" alt="需要辅助识别的照片">`;const q=$('#v2-ai-question');if(q)q.value=`请根据这张照片的叶片、叶柄与株形，审慎比较 Pl@ntNet 的候选 ${shortlist}。告诉我应该再拍摄哪些细节才能区分。不要把百分比当准确率，不能确定就明确说明。`;return}
 }
 return v453PreviousAct(action,el)
};
document.addEventListener('change',async e=>{
 if(e.target?.id==='recognize-photo'){ui.v453ExtraImages=[];ui.v453PrimaryOrgan='auto';return}
 if(e.target?.id==='v453-primary-organ'){ui.v453PrimaryOrgan=e.target.value;return}
 if(e.target?.matches?.('[data-v453-organ]')){const i=Number(e.target.dataset.v453Organ);if(ui.v453ExtraImages[i])ui.v453ExtraImages[i].organ=e.target.value;return}
 if(e.target?.id!=='v453-add-photos')return;
 const files=[...e.target.files||[]];if(!files.length)return;
 const available=Math.max(0,4-ui.v453ExtraImages.length);if(files.length>available)toast('一次最多识别五张照片，包括主照片');
 for(const file of files.slice(0,available)){try{const image=await compress(file);ui.v453ExtraImages.push({image,organ:'auto'})}catch(err){toast('图片读取失败：'+err.message)}}
 render();
},true);
// Optional reference-photo fallback for older servers that omit related images.
// Only attach photos when the scientific name matches exactly; otherwise leave a labelled placeholder.
async function v453HydratePhotos(){
 const list=ui.recognitionResults;if(!Array.isArray(list)||!list.length)return;
 for(const r of list.slice(0,5)){
  if(v453Reference(r))continue;
  const latin=v453Latin(r);if(!/^[A-Za-z][A-Za-z -]{2,100}$/.test(latin))continue;
  if(Object.prototype.hasOwnProperty.call(ui.v453ReferenceCache,latin)){
   if(ui.v453ReferenceCache[latin]&&!v453Reference(r))r.images=[ui.v453ReferenceCache[latin]];continue;
  }
  ui.v453ReferenceCache[latin]=null;
  try{
   const response=await fetch('https://api.inaturalist.org/v1/taxa?q='+encodeURIComponent(latin)+'&per_page=8',{headers:{Accept:'application/json'}});if(!response.ok)continue;
   const json=await response.json();const match=(json.results||[]).find(x=>x.name?.toLowerCase()===latin.toLowerCase());const photo=match?.default_photo;
   if(photo?.medium_url?.startsWith('https://')){
    const ref={source:'iNaturalist',url:{m:photo.medium_url},author:photo.attribution||'',license:photo.license_code||'',citation:(photo.attribution||'iNaturalist 观察者')+' · iNaturalist · '+(photo.license_code||'照片许可见来源')};
    ui.v453ReferenceCache[latin]=ref;if(ui.recognitionResults===list&&!v453Reference(r)){r.images=[ref];if(ui.tab==='recognize')render()}
   }
  }catch{/* third-party photo access is optional */}
 }
}

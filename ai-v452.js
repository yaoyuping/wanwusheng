/* 一隅 · v4.5.2 · Pl@ntNet + GBIF + DeepSeek (requires separate secret-holding API) */
'use strict';
const YIYU_AI_URL_KEY='yiyu-ai-backend-url-v452';
const YIYU_AI_PASSWORD_KEY='yiyu-ai-session-password';
ui.yiyuSpeciesQuery='';ui.yiyuSpeciesResults=null;ui.yiyuSpeciesError='';ui.yiyuSpeciesBusy=false;ui.yiyuService=null;
function yiyuAPIHost(){try{const raw=(localStorage.getItem(YIYU_AI_URL_KEY)||'').trim();if(!raw)return location.protocol==='file:'||location.hostname.endsWith('github.io')||location.hostname.endsWith('netlify.app')?null:location.origin;
 const u=new URL(raw);if(u.protocol!=='https:'&&!(u.hostname==='localhost'||u.hostname==='127.0.0.1'))return null;if(u.username||u.password||u.search||u.hash||u.pathname!=='/')return null;return u.origin;
 }catch{return null}}
function yiyuAPILink(path){const host=yiyuAPIHost();if(!host)throw Error('请先在「我的 → AI 服务连接」填写 HTTPS API 地址（或将整个网站部署在 Vercel）。');return host+path;}
function yiyuPassword(){try{return sessionStorage.getItem(YIYU_AI_PASSWORD_KEY)||''}catch{return ''}}
function yiyuApiStatusLabel(x){if(!yiyuAPIHost())return '待配置后端地址';if(!x||x.offline)return '无法连接后端';if(!x.ready)return '请先在后端设置访问口令';return [x.plantnet?'Pl@ntNet ✓':'Pl@ntNet 未启用',x.deepseek?'DeepSeek ✓':'DeepSeek 未启用',x.species?'GBIF ✓':'GBIF 未启用'].join(' · ')}
// Override earlier fixed same-origin APIs so github.io static frontend can use a secured external Vercel backend.
v2staticHosting=function(){return !yiyuAPIHost()};
v2status=async function(){
 const api=yiyuAPIHost();if(!api){ui.apiStatus={offline:true,deepseek:false,plantnet:false};return ui.apiStatus}
 try{const response=await fetch(yiyuAPILink('/api/status'),{cache:'no-store'});if(!response.ok)throw Error('无法访问服务');ui.apiStatus=await response.json();ui.apiStatus.offline=false;return ui.apiStatus}
 catch(e){ui.apiStatus={offline:true,deepseek:false,plantnet:false};return ui.apiStatus}
};
v2post=async function(endpoint,data){
 const response=await fetch(yiyuAPILink(endpoint),{method:'POST',headers:{'Content-Type':'application/json','X-Yiyu-Password':yiyuPassword()},body:JSON.stringify(data)});
 let result={};try{result=await response.json()}catch{}
 if(!response.ok)throw Error(result.error||`接口调用失败 (${response.status})`);
 return result;
};
// No browser-side API key, no direct call from GitHub Pages to Pl@ntNet.
identify=async function(){
 if(!ui.recognitionImage){toast('请先拍摄或选择植物照片');return}
 ui.recognitionLoading=true;ui.recognitionResults=null;ui.recognitionMessage='正在由 Pl@ntNet 比对植物照片…';render();
 try{const j=await v2post('/api/identify',{image:ui.recognitionImage});ui.recognitionResults=j.results||[];
 ui.recognitionMessage=ui.recognitionResults.length?`匹配完成 · 取回 ${ui.recognitionResults.length} 个候选物种。置信度不是鉴定结论，请核查叶、花、果。`:'未能确认物种，请补拍叶片、花或果实。';
 }catch(e){ui.recognitionMessage=`识别暂不可用：${e.message}`}finally{ui.recognitionLoading=false;render()}
};
// Existing care/diagnosis/identification modal and camera listener remain intact.
v2aiRun=async function(pid,mode){
 const box=$('#v2-ai-result'),button=$('#v2-ai-run');if(!box||!button)return;
 if(mode==='identification'&&!ui.aiImage){toast('请先选择植物照片');return}
 button.disabled=true;box.innerHTML='<div class="v2-ai-loading">✧ 正在分析照片与养护记录…</div>';
 const p=(state.plants||[]).find(x=>x.id===pid)||{};
 try{
  const j=await v2post('/api/ai',{mode:mode==='identification'?'identify':mode,plant:v2plantContext(p),question:$('#v2-ai-question')?.value.trim()||'',image:ui.aiImage});
  box.innerHTML=`<div class="v2-ai-answer"><div class="v2-ai-answer-title">✧ DeepSeek 辅助分析 <small>${esc(j.model||'deepseek-flash')}</small></div><div class="v2-ai-answer-text">${esc(j.answer||'未返回文本').replace(/\n/g,'<br>')}</div><button type="button" class="outlined-btn small-btn" data-action="v2-copy-ai">复制文字</button></div>`;
 }catch(e){box.innerHTML=`<div class="v2-ai-error">${esc(e.message)}<br>请核对服务地址、口令及服务端环境变量。</div>`}finally{button.disabled=false}
};
// Replace obsolete v2 settings guide: two upstream keys belong to server, never to localStorage.
v2settings=function(){const current=esc(localStorage.getItem(YIYU_AI_URL_KEY)||'');const password=esc(yiyuPassword());
 return `<section class="panel yiyu-ai-settings" aria-label="AI 服务连接"><div class="yiyu-ai-topline"><div><span class="yiyu-ai-kicker">PRIVATE BOTANICAL ASSISTANT</span><h2>AI 服务连接</h2><p>Pl@ntNet 拍照识别 · GBIF 物种检索 · DeepSeek 智能养护。</p></div><span class="yiyu-ai-orb">✧</span></div>
 <div class="yiyu-ai-fields"><label class="field"><span>后端地址 · HTTPS（与你的网站分开部署时填写）</span><input id="yiyu-api-host" type="url" value="${current}" placeholder="https://你的-ai-服务.vercel.app" autocomplete="off"></label>
 <label class="field"><span>私人访问口令 · 仅当前会话</span><input id="v2-session-password" type="password" value="${password}" autocomplete="off" placeholder="在 Vercel 设置的 APP_PASSWORD"></label></div>
 <div class="yiyu-ai-actions"><button type="button" class="primary-btn" data-action="yiyu-ai-save">保存服务配置</button><button type="button" class="outlined-btn" data-action="yiyu-ai-check">检查接口状态</button><button type="button" class="outlined-btn" data-action="yiyu-ai-clear">断开当前连接</button></div>
 <div class="yiyu-api-status" id="v2-ai-status">${esc(yiyuApiStatusLabel(ui.apiStatus))}</div>
 <p class="yiyu-ai-notice">API Key 不应填在网页上。需在 Vercel 环境变量设置 <code>PLANTNET_API_KEY</code>、<code>DEEPSEEK_API_KEY</code>、<code>APP_PASSWORD</code> 和 <code>ALLOWED_ORIGINS</code>。网站仍使用本地数据库和手动 iCloud 备份。点击识别/分析时才会发送照片或所选档案资料给相应服务。</p></section>`;
};
const yiyuPriorSettingsAI=settingsView;
settingsView=function(){
 const html=yiyuPriorSettingsAI();const temp=document.createElement('div');temp.innerHTML=html;
 for(const title of temp.querySelectorAll('.setting-title')){if(title.textContent.includes('Pl@ntNet 拍照识别'))title.closest('section.panel')?.remove()}
 return temp.innerHTML;
};
function yiyuSpeciesPanel(){const list=ui.yiyuSpeciesResults;
 return `<section class="yiyu-species-panel panel" aria-label="植物学名数据库"><div class="yiyu-species-head"><div><span class="yiyu-ai-kicker">TAXONOMY · GBIF</span><h2>全球物种学名检索</h2><p>按中文名称或拉丁学名检索 GBIF 分类学目录；本地另外保留 4 种入门示例。</p></div><span class="yiyu-species-decoration">❧</span></div>
 <form id="yiyu-species-form" class="yiyu-species-form"><input id="yiyu-species-q" type="search" required minlength="2" maxlength="100" placeholder="如 Ginkgo biloba、Monstera deliciosa" value="${esc(ui.yiyuSpeciesQuery||'')}" aria-label="查找植物学名"><button class="primary-btn" type="submit" ${ui.yiyuSpeciesBusy?'disabled':''}>${ui.yiyuSpeciesBusy?'查询中…':'检索物种'}</button></form>
 ${ui.yiyuSpeciesError?`<p class="yiyu-api-error">${esc(ui.yiyuSpeciesError)}</p>`:''}
 ${list===null?'<p class="yiyu-species-tip">建议优先输入拉丁学名。中文俗名可能有歧义或缺少数据库索引。</p>':list.length?`<div class="yiyu-species-results">${list.map((x,i)=>`<article class="yiyu-species-item"><div><b>${esc(x.canonicalName||x.scientificName||'待核对')}</b><small>${esc([x.family,x.genus,x.status].filter(Boolean).join(' · '))}</small><span class="yiyu-taxonomy">${esc(x.scientificName||'')}</span></div><div class="yiyu-species-buttons"><button class="outlined-btn small-btn" data-action="yiyu-species-detail" data-id="${i}">查看详情</button><button class="outlined-btn small-btn" data-action="yiyu-species-newplant" data-id="${i}">建档</button></div></article>`).join('')}</div>`:'<p class="yiyu-species-tip">没有找到植物分类结果。可以尝试更完整的拉丁学名或植物属名。</p>'}
 <p class="yiyu-species-credit">资料来源：GBIF 分类学名录。属于物种信息检索，不等同于 AI 图片识别；名称和分类可能随数据库更新。</p></section>`;
}
const yiyuPriorAtlasView=atlasView;
atlasView=function(){return yiyuPriorAtlasView()+yiyuSpeciesPanel()};
const yiyuPriorRecognitionView=recognizeView;
recognizeView=function(){return yiyuPriorRecognitionView()+`<section class="panel yiyu-identify-info"><h3>真实植物识别 · 不是随机命名</h3><p>Pl@ntNet 根据你的照片返回多个候选物种及相对分数，DeepSeek 可以帮助对比候选的叶形、花果、环境特征。需要在「我的」配置 API 后端才可联网识别。</p><div class="yiyu-identify-actions"><button class="outlined-btn small-btn" data-nav="settings">配置 AI 服务</button><button class="outlined-btn small-btn" data-nav="atlas">查询学名数据库</button></div></section>`};
function yiyuSpeciesDetails(i){const x=ui.yiyuSpeciesResults?.[i];if(!x)return;
 modal('植物学名档案 · GBIF',`<div class="yiyu-taxonomy-detail"><div class="yiyu-tag">GBIF TAXONOMY</div><h2>${esc(x.canonicalName||x.scientificName)}</h2><p>${esc(x.scientificName||'')}</p><dl>${[['科',x.family],['属',x.genus],['目',x.order],['分类等级',x.rank],['分类状态',x.status],['GBIF ID',x.key]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'未收录')}</dd></div>`).join('')}</dl><p class="yiyu-species-credit">GBIF 学名档案不包含保证正确的家庭养护措施。要获得针对这株植物的养护建议，可添加到「我的植物」后使用 AI 助手。</p><div class="yiyu-ai-actions"><button class="primary-btn" data-action="yiyu-species-newplant" data-id="${i}">＋ 添加到我的植物</button><button class="outlined-btn" data-action="yiyu-species-sighting" data-id="${i}">＋ 记一条野外发现</button><button class="outlined-btn" data-action="yiyu-species-ai" data-id="${i}">✧ AI 六章节简介</button>${x.key?`<a class="outlined-btn" target="_blank" rel="noopener noreferrer" href="https://www.gbif.org/species/${encodeURIComponent(x.key)}">查看 GBIF 来源 ↗</a>`:''}</div><div id="yiyu-species-ai-answer" aria-live="polite"></div></div>`);
}
const yiyuPriorActions=act;
act=async function(action,el){switch(action){
 case 'yiyu-ai-save':{
   const s=$('#yiyu-api-host')?.value.trim()||'';
   if(s){try{const url=new URL(s);if(url.protocol!=='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1')throw Error();if(url.username||url.password||url.search||url.hash||(url.pathname!=='/'&&url.pathname!==''))throw Error();localStorage.setItem(YIYU_AI_URL_KEY,url.origin)}catch{toast('请填入无路径、无账号密码的 HTTPS 后端地址');return}}
   else localStorage.removeItem(YIYU_AI_URL_KEY);
   const p=$('#v2-session-password')?.value||'';if(p)sessionStorage.setItem(YIYU_AI_PASSWORD_KEY,p);else sessionStorage.removeItem(YIYU_AI_PASSWORD_KEY);
   toast('连接设置已保存在本机；口令仅保存在当前标签页会话');const j=await v2status();render();return;
 }
 case 'yiyu-ai-check':{const j=await v2status();const statusLabel=yiyuApiStatusLabel(j);const n=$('#v2-ai-status');if(n)n.textContent=statusLabel;toast(statusLabel);return}
 case 'yiyu-ai-clear':{localStorage.removeItem(YIYU_AI_URL_KEY);sessionStorage.removeItem(YIYU_AI_PASSWORD_KEY);ui.apiStatus=null;render();toast('本机连接配置已清除');return}
 case 'yiyu-species-detail':yiyuSpeciesDetails(Number(el.dataset.id));return;
 case 'yiyu-species-ai':{
   const x=ui.yiyuSpeciesResults?.[Number(el.dataset.id)];if(!x)return;
   const display=$('#yiyu-species-ai-answer');if(!display)return;
   display.innerHTML='<p class="yiyu-species-tip">正在生成供核验的六章节简介…</p>';
   try{const j=await v2post('/api/ai',{mode:'species',plant:{name:x.canonicalName||x.scientificName,latin:x.canonicalName||x.scientificName},question:`请介绍植物 ${x.canonicalName||x.scientificName}，已知科属 ${x.family||''} / ${x.genus||''}，按六章节呈现。不确定的信息明确标为待核实。`});
   if(display.isConnected)display.innerHTML=`<h3>✧ AI 植物介绍草稿</h3><p class="yiyu-species-credit">由 DeepSeek 生成，请与植物志或权威资料核对后再采信。</p><div class="yiyu-generated-copy">${esc(j.answer||'未返回文本').replace(/\n/g,'<br>')}</div>`;
   }catch(e){if(display.isConnected)display.innerHTML=`<p class="yiyu-api-error">${esc(e.message)}</p>`}return;
 }
 case 'yiyu-species-newplant':{const x=ui.yiyuSpeciesResults?.[Number(el.dataset.id)];if(x)plantForm(null,{name:x.canonicalName||x.scientificName,latin:x.canonicalName||x.scientificName,notes:`物种来源 GBIF ID ${x.key||'未标注'}；学名需结合实物核对。`});return}
 case 'yiyu-species-sighting':{const x=ui.yiyuSpeciesResults?.[Number(el.dataset.id)];if(x)sightingForm(null,{name:x.canonicalName||x.scientificName,latin:x.canonicalName||x.scientificName});return}
 }return yiyuPriorActions(action,el)};
// Form-submit capture listener handles new lookup without touching existing plant/photo forms.
document.addEventListener('submit',async e=>{if(e.target?.id!=='yiyu-species-form')return;e.preventDefault();e.stopImmediatePropagation();
 const q=($('#yiyu-species-q')?.value||'').trim();if(q.length<2){toast('至少输入两个字符');return}
 ui.yiyuSpeciesQuery=q;ui.yiyuSpeciesBusy=true;ui.yiyuSpeciesError='';render();
 try{const r=await v2post('/api/species',{query:q});ui.yiyuSpeciesResults=r.results||[]}
 catch(err){ui.yiyuSpeciesResults=null;ui.yiyuSpeciesError=err.message}
 finally{ui.yiyuSpeciesBusy=false;render()}
},true);

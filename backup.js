/* 一隅植物手记 v4.5.1 — 仅本地存储 + iCloud Drive 手动备份。
   保持 v4.5 的 IndexedDB 与数据结构，不上传任何个人资料到云端。 */
'use strict';
const YIYU_BACKUP_MARK = 'yiyu-plant-journal';
const YIYU_BACKUP_VERSION = '4.5.1';
const YIYU_BACKUP_LAST_KEY = 'yiyu-backup-last-generated-v4.5.1';
const YIYU_BACKUP_MAX_BYTES = 150 * 1024 * 1024;
let yiyuPendingRestore = null;
const yiyuPriorSettings = settingsView;
const yiyuPriorAction = act;

function yiyuFullPhotoCount(data) {
  const list = [];
  (data.plants || []).forEach(p => {list.push(p.image);(p.logs || []).forEach(l=>list.push(l.image));});
  (data.sightings || []).forEach(s => list.push(...(Array.isArray(s.images) ? s.images : [s.image || s.photo])));
  return {embedded:list.filter(x=>typeof x==='string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(x)).length,
          linked:list.filter(x=>typeof x==='string' && x && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(x)).length};
}
function yiyuBackupStats(data) {
  const photos=yiyuFullPhotoCount(data);
  return {plants:(data.plants||[]).length,sightings:(data.sightings||[]).length,
    tasks:(data.tasks||[]).length,logs:(data.plants||[]).reduce((a,p)=>a+(p.logs||[]).length,0),
    tags:(data.tagLibrary||[]).length,photos:photos.embedded,linkedPhotos:photos.linked};
}
function yiyuBackupValidRoot(o) {
  if (!o || typeof o!=='object' || Array.isArray(o) || !Array.isArray(o.plants) || !Array.isArray(o.sightings)) throw Error('这不是有效的万物生植物档案备份');
  if (o.tasks!==undefined && !Array.isArray(o.tasks)) throw Error('养护待办结构无效');
  if(o.tagLibrary!==undefined && !Array.isArray(o.tagLibrary)) throw Error('标签库结构无效');
  if(o.plants.length>50000 || o.sightings.length>50000 || (o.tasks||[]).length>100000) throw Error('文件条目数量超出安全限制');
  for (const p of o.plants) if(!p || typeof p!=='object' || !Array.isArray(p.logs || [])) throw Error('植物养护记录格式有误');
  return o;
}
function yiyuStateSnapshot() {return JSON.parse(JSON.stringify(state));}
function yiyuTimestamp() {return new Date().toISOString().replace(/[:.]/g,'-').replace('T','_').replace(/Z$/,'');}
function yiyuBackupName(){return `万物生-完整备份-${yiyuTimestamp()}.json`;}
function yiyuReadableSize(n){return n<1024*1024?`${Math.ceil(n/1024)} KB`:`${(n/1024/1024).toFixed(1)} MB`;}
async function yiyuSHA256(textValue){
  if(!globalThis.crypto?.subtle) return null;
  const bytes=new TextEncoder().encode(textValue);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function yiyuSafeWeatherPreference(){
  try{const item=JSON.parse(localStorage.getItem(V4_CITY_KEY)||'null');
    // 仅备份明确选择的固定城市（城市中心点），不备份实时设备 GPS。
    if(item?.mode==='fixed' && Number.isFinite(+item.lat) && Number.isFinite(+item.lon)) {
      return {mode:'fixed',label:String(item.label||'').slice(0,120),lat:+item.lat,lon:+item.lon};
    }
  }catch{}
  return {mode:'auto'};
}
async function yiyuBuildFile(){
  if(!state)throw Error('植物档案尚未加载完成');
  const snapshot=yiyuBackupValidRoot(yiyuStateSnapshot());
  if(!Array.isArray(snapshot.tasks))snapshot.tasks=[];
  const stats=yiyuBackupStats(snapshot);
  const createdAt=new Date().toISOString();
  const digest=await yiyuSHA256(JSON.stringify(snapshot));
  // 根级字段兼容 v1-v4.5 原有备份恢复；元信息只用于新版本预览和校验。
  const object={...snapshot,exportedAt:createdAt,_backup:{format:YIYU_BACKUP_MARK,version:YIYU_BACKUP_VERSION,
    createdAt,stats,sha256:digest,checksumScope:'state-json'},
    _preferences:{weatherLocation:yiyuSafeWeatherPreference()}};
  const blob=new Blob([JSON.stringify(object)],{type:'application/json;charset=utf-8'});
  if(blob.size>YIYU_BACKUP_MAX_BYTES)throw Error('备份大于 150 MB，建议先整理高分辨率照片并导出较小的备份。');
  return {file:new File([blob],yiyuBackupName(),{type:'application/json'}),meta:object._backup};
}
function yiyuDownload(file){
 const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;
 a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function yiyuMarkBackup(){
 try{localStorage.setItem(YIYU_BACKUP_LAST_KEY,new Date().toISOString())}catch{}
 if(ui.tab==='settings')render();
}
async function yiyuExportOnly(){
 const {file}=await yiyuBuildFile();yiyuDownload(file);yiyuMarkBackup();toast('完整备份已生成；请把文件存入 iCloud Drive。');
}
async function yiyuShareToFiles(){
 const {file}=await yiyuBuildFile();
 if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:'万物生 · 完整备份'});yiyuMarkBackup();
     toast('请在分享菜单中选择“存储到文件”并选 iCloud Drive');}
   catch(e){if(e?.name==='AbortError')return; yiyuDownload(file);yiyuMarkBackup();toast('分享不可用，已改为下载备份文件');}
 }else{yiyuDownload(file);yiyuMarkBackup();toast('备份已下载，请通过文件 App 移入 iCloud Drive');}
}
function yiyuLastBackupText(){
 try{const iso=localStorage.getItem(YIYU_BACKUP_LAST_KEY);if(!iso)return '尚未生成';
 const d=new Date(iso);if(!Number.isFinite(+d))return '尚未生成';
 return d.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 }catch{return '尚未生成'}
}
function yiyuBackupCenter(){
 const d=yiyuBackupStats(state);
 return `<section class="yiyu-vault" aria-label="数据保险箱">
 <div class="yiyu-vault-header"><div><span class="yiyu-vault-kicker">PRIVATE DATA · LOCAL FIRST</span><h2>数据保险箱 <span>✧</span></h2><p>档案留在当前设备，定期手动存入 iCloud Drive。</p></div><span class="yiyu-vault-icon" aria-hidden="true">${ico('download',25)}</span></div>
 <div class="yiyu-vault-counters"><div><strong>${d.plants}</strong><small>植物档案</small></div><div><strong>${d.sightings}</strong><small>野外发现</small></div><div><strong>${d.logs}</strong><small>养护记录</small></div><div><strong>${d.photos}</strong><small>内嵌照片</small></div><div><strong>${d.tasks}</strong><small>日历待办</small></div></div>
 <div class="yiyu-backup-last"><span class="yiyu-dot"></span>上次生成备份：<b>${esc(yiyuLastBackupText())}</b><span class="yiyu-hint">仅代表生成，不代表已保存到 iCloud</span></div>
 <div class="yiyu-vault-actions"><button type="button" class="primary-btn" data-action="yiyu-share-backup">${ico('upload',17)} 分享至文件 / iCloud Drive</button><button type="button" class="outlined-btn" data-action="yiyu-export-backup">${ico('download',17)} 下载完整 JSON</button><button type="button" class="outlined-btn" data-action="yiyu-restore-preview">${ico('book',17)} 从备份恢复</button></div>
 <div class="yiyu-backup-howto"><span>01 · 导出完整备份</span><span>02 · 存入 iCloud Drive</span><span>03 · 换设备时导入恢复</span></div>
 <p class="yiyu-vault-note">完整 JSON 包含本地内嵌的植物照片、日志照片、观察地点及 GPS 坐标、日历待办、自定义标签和固定天气城市。${d.linkedPhotos?`另有 ${d.linkedPhotos} 张照片仅是外部引用，需另存源文件。`:``}<b>不包含识别 API Key，也不会自动上传到 iCloud。</b></p>
 </section>`;
}
settingsView = function(){
 const existing=yiyuPriorSettings();
 const cleaned=existing.replace(/<div class="setting-actions"><button class="primary-btn" data-action="export">[\s\S]*?<\/div>/,
   '<p class="setting-desc">完整导出、导入与 iCloud Drive 备份请使用上方的「数据保险箱」。</p>');
 return yiyuBackupCenter()+cleaned;
};

// 旧页面的导出动作也统一生成完整备份。
exportData=()=>yiyuExportOnly();

function yiyuRestoreModal(info){
 const stats=yiyuBackupStats(info.snapshot); const base=info.meta||{};
 const dateStr=base.createdAt||info.raw.exportedAt||'未记录';
 const formattedDate=Number.isFinite(Date.parse(dateStr))?new Date(dateStr).toLocaleString('zh-CN'):'未记录';
 const compatible=info.isEnhanced?'增强版备份':'旧版 JSON（无校验码）';
 const result=info.integrity==='verified'?'✓ 完整性校验通过':info.integrity==='unsupported'?'⚠ 当前浏览器无法执行 SHA-256 校验':info.integrity==='legacy'?'ℹ 旧版备份没有校验码':'⚠ 校验状态未知';
 const current=yiyuBackupStats(state);
 modal('恢复备份 · 先核对内容',`<div class="yiyu-import-preview"><div class="yiyu-preview-file">${ico('book',25)} <div><strong>${esc(info.file.name)}</strong><small>${yiyuReadableSize(info.file.size)} · ${esc(compatible)}</small></div></div>
 <p class="yiyu-check ${info.integrity==='verified'?'good':''}">${esc(result)}</p>
 <div class="yiyu-compare"><div><small>备份文件包含</small><strong>${stats.plants} 株植物 · ${stats.sightings} 条发现</strong><span>${stats.logs} 条养护 · ${stats.tasks} 项待办 · ${stats.photos} 张内嵌照片</span></div><div><small>本机当前数据</small><strong>${current.plants} 株植物 · ${current.sightings} 条发现</strong><span>${current.logs} 条养护 · ${current.tasks} 项待办 · ${current.photos} 张内嵌照片</span></div></div>
 <p class="yiyu-backup-date">备份生成时间：${esc(formattedDate)}</p>
 <div class="yiyu-restore-warning"><strong>注意：恢复将替换此浏览器的全部植物、照片、日历及发现记录，不能自动合并。</strong><p>建议先使用下方按钮给当前档案再做一次备份；恢复后的数据只有当前设备可见。</p></div>
 <div class="yiyu-modal-actions"><button type="button" class="outlined-btn" data-action="yiyu-export-backup">先备份当前档案</button><button type="button" class="outlined-btn" data-action="yiyu-restore-cancel">取消</button><button type="button" class="primary-btn" data-action="yiyu-restore-confirm">确认覆盖并恢复</button></div></div>`);
}
async function yiyuReadBackup(file){
 if (!file)return null;
 if(file.size>YIYU_BACKUP_MAX_BYTES)throw Error('文件超过 150 MB，当前版本无法安全导入。');
 let data;try{data=JSON.parse(await file.text())}catch{throw Error('备份文件不是合法 JSON，或已损坏。')}
 yiyuBackupValidRoot(data);
 const backup=data._backup; if(backup && backup.format!==YIYU_BACKUP_MARK)throw Error('备份标识不匹配');
 const snapshot={};for(const [k,v] of Object.entries(data))if(!['_backup','_preferences','exportedAt'].includes(k))snapshot[k]=v;
 yiyuBackupValidRoot(snapshot);
 let integrity='legacy';
 if(backup?.sha256){const digest=await yiyuSHA256(JSON.stringify(snapshot));
  if(digest && digest!==backup.sha256)throw Error('完整性校验失败：此文件可能被修改或发生损坏，已停止导入。');
  integrity=digest?'verified':'unsupported';
 }
 // 旧版备份缺少日历和标签字段时，以空值/已有标签推导；保留所有已知的额外字段。
 if(!Array.isArray(snapshot.tasks))snapshot.tasks=[];
 if(!Array.isArray(snapshot.tagLibrary))snapshot.tagLibrary=[...new Set(snapshot.plants.flatMap(p=>v4SplitTags(p.tags||'')))];
 const wp=data._preferences?.weatherLocation;
 const weatherPreference=wp?.mode==='fixed' && Number.isFinite(+wp.lat) && Number.isFinite(+wp.lon)?
  {mode:'fixed',label:String(wp.label||'').slice(0,120),lat:+wp.lat,lon:+wp.lon}:null;
 return {file,raw:data,snapshot,weatherPreference,meta:backup,isEnhanced:!!backup,integrity};
}
importData=async function(file){
 if(!file)return;
 try{const info=await yiyuReadBackup(file);if(!info)return;yiyuPendingRestore=info;yiyuRestoreModal(info)}
 catch(err){yiyuPendingRestore=null;toast('无法导入：'+err.message)}
};
function yiyuImportMatches(a,b){
 // 整体比较避免“恢复成功但照片/待办不完整”的误报。
 return JSON.stringify(a)===JSON.stringify(b);
}
async function yiyuRestoreConfirm(){
 const info=yiyuPendingRestore;if(!info)throw Error('请重新选择备份文件');
 const prev=state; const candidate=info.snapshot;state=candidate;
 try{
  await save();
  const persisted=await readSaved();
  if(!persisted || !yiyuImportMatches(candidate,persisted))throw Error('写入存储后校验不一致，可能是设备空间不足');
  if(info.weatherPreference){localStorage.setItem(V4_CITY_KEY,JSON.stringify(info.weatherPreference));v4Pref=v4ReadPref();try{localStorage.removeItem(V3_WEATHER_KEY);v3Weather=null}catch{}}
  yiyuPendingRestore=null;closeModal();go('home');toast('已完整恢复植物、照片、待办及图鉴');
 }catch(err){state=prev;throw Error('恢复未完成：'+err.message+'。请保留原备份文件，不要清理浏览器数据。')}
}
act=async function(action,el){
 try{
 switch(action){
  case 'yiyu-share-backup':await yiyuShareToFiles();return;
  case 'yiyu-export-backup':await yiyuExportOnly();return;
  case 'yiyu-restore-preview':$('#import-file')?.click();return;
  case 'yiyu-restore-confirm':await yiyuRestoreConfirm();return;
  case 'yiyu-restore-cancel':yiyuPendingRestore=null;closeModal();return;
  case 'export':await yiyuExportOnly();return;
  case 'import':$('#import-file')?.click();return;
  case 'close-modal':case 'modal-backdrop':yiyuPendingRestore=null;break;
 }
 return await yiyuPriorAction(action,el);
 }catch(err){toast('备份操作失败：'+err.message)}
};

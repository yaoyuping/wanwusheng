/* 万物生 v5.9 · 可删除的养护记录、待办与手机提醒。 */
(() => {
  'use strict';
  let undo = null;
  const checkKey = plant => `${plant.lastWatered || ''}|${Math.max(1, Number(plant.interval) || 7)}`;
  const dismissed = plant => plant.dismissedCareCheck === checkKey(plant);
  const checkLog = (plant, log, day) => log.action === '检查盆土' && log.careCheckKey === checkKey(plant) && (!day || log.date === day);
  const checked = (plant, day = stamp()) => (plant.logs || []).some(log => checkLog(plant, log, day));
  function nextCheckDate(plant) {
    const due = v2plusDate(plant.lastWatered, Math.max(1, Number(plant.interval) || 7));
    const latest = (plant.logs || []).filter(log => checkLog(plant, log) && log.date >= due).map(log => log.date).sort().at(-1);
    return latest ? v2plusDate(latest, 1) : due;
  }
  const changingTasks = new Set();
  function normalize() {
    if (!state) return false;
    let changed = false;
    for (const items of [...state.plants.map(plant => plant.logs || []), state.tasks || []]) {
      const used = new Set();
      for (const item of items) {
        if (typeof item.id !== 'string' || !item.id || used.has(item.id)) { item.id = id(); changed = true; }
        used.add(item.id);
      }
    }
    return changed;
  }
  const originalSave = save;
  save = async function() { normalize(); await originalSave(); window.yiyuPush?.scheduleSync(); };
  const originalDayTasks = v2dayTasks;
  v2dayTasks = day => originalDayTasks(day).filter(task => !task.generated || !dismissed(state.plants.find(plant => plant.id === task.plantId) || {})).map(task => task.generated ? { ...task, done: checked(state.plants.find(plant => plant.id === task.plantId) || {}, day) } : task);
  const originalDueCount = v4DueCount;
  v4DueCount = function() {
    return originalDueCount() - state.plants.filter(plant => plant.reminder !== false && plantStatus(plant).due && (dismissed(plant) || checked(plant))).length;
  };
  const originalCare = careView;
  careView = function() { if (normalize()) void save(); return originalCare(); };
  const originalDetail = plantDetail;
  plantDetail = function(pid, tab = 'info') { if (normalize()) void save(); return originalDetail(pid, tab); };
  const originalLogCard = v3LogCard;
  v3LogCard = function(log) {
    const root = document.createElement('div'); root.innerHTML = originalLogCard(log);
    const plant = state.plants.find(item => (item.logs || []).includes(log));
    if (plant) root.querySelector('.v3-log-header').insertAdjacentHTML('beforeend', `<button type="button" class="v59-delete" data-action="v59-delete-log" data-id="${esc(plant.id)}" data-log-id="${esc(log.id)}" aria-label="删除${esc(log.action || '养护')}记录">删除</button>`);
    return root.innerHTML;
  };
  function refresh(pid) {
    render();
    if (pid && document.querySelector('#modal-root .v3-profile-modal') && v3LastOpenedPlant === pid) plantDetail(pid, 'logs');
  }
  function offerUndo(message, restore) {
    const token = id(); undo = { token, restore, expires: Date.now() + 15000 };
    clearTimeout(noticeTimer);
    document.getElementById('toast-root').innerHTML = `<div class="toast v59-undo">${esc(message)}<button type="button" data-action="v59-undo" data-token="${esc(token)}">撤销</button></div>`;
    noticeTimer = setTimeout(() => { if (undo?.token === token) { undo = null; document.getElementById('toast-root').replaceChildren(); } }, 15000);
  }
  const originalAct = act;
  act = async function(action, element) {
    if (action === 'v2-toggle-task' || action === 'v59-toggle-check') {
      const day = element.dataset.day || ui.selectedDay || stamp(), token = `${action}|${element.dataset.id}|${day}`;
      if (changingTasks.has(token)) return;
      changingTasks.add(token); element.disabled = true;
      try {
        let done;
        if (action === 'v2-toggle-task') {
          const task = state.tasks?.find(item => item.id === element.dataset.id);
          if (!task) return;
          done = task.done = !task.done;
          if (done) task.completedAt = new Date().toISOString(); else delete task.completedAt;
        } else {
          const plant = state.plants.find(item => item.id === element.dataset.id);
          if (!plant) return;
          done = !checked(plant, day);
          if (done) {
            plant.logs ||= [];
            plant.logs.unshift({ id: id(), date: day, action: '检查盆土', note: '已完成盆土检查', careCheckKey: checkKey(plant) });
          } else plant.logs = plant.logs.filter(log => !checkLog(plant, log, day));
        }
        state.isDemo = false; await save(); render();
        toast(done ? action === 'v59-toggle-check' ? '已完成检查并保存养护记录' : '待办已完成' : '已恢复为待办');
      } finally { changingTasks.delete(token); element.disabled = false; }
      return;
    }
    if (action === 'v59-delete-log') {
      const plant = state.plants.find(item => item.id === element.dataset.id);
      const index = plant?.logs?.findIndex(log => log.id === element.dataset.logId) ?? -1;
      if (index < 0 || !confirm('删除这条养护记录及其照片？删除后可在提示中撤销。')) return;
      const beforeWatered = plant.lastWatered, [log] = plant.logs.splice(index, 1);
      if (log.action === '浇水' && log.date === plant.lastWatered) plant.lastWatered = plant.logs.filter(item => item.action === '浇水' && item.date).map(item => item.date).sort().at(-1) || '';
      const afterWatered = plant.lastWatered;
      await save(); refresh(plant.id);
      offerUndo('养护记录已删除', async () => {
        if (!state.plants.includes(plant) || plant.logs.some(item => item.id === log.id)) return;
        plant.logs.splice(Math.min(index, plant.logs.length), 0, log);
        if (plant.lastWatered === afterWatered) plant.lastWatered = beforeWatered;
        await save(); refresh(plant.id);
      });
      return;
    }
    if (action === 'v59-delete-task') {
      if (element.dataset.generated === '1') {
        const plant = state.plants.find(item => item.id === element.dataset.plantId);
        if (!plant || !confirm('取消本次浇水检查？植物档案会保留，下次记录浇水后会按新周期提醒。')) return;
        const previous = plant.dismissedCareCheck; plant.dismissedCareCheck = checkKey(plant);
        await save(); refresh();
        offerUndo('本次浇水检查已取消', async () => { if (previous === undefined) delete plant.dismissedCareCheck; else plant.dismissedCareCheck = previous; await save(); refresh(); });
      } else {
        const index = state.tasks?.findIndex(item => item.id === element.dataset.id) ?? -1;
        if (index < 0 || !confirm('删除这项养护待办？删除后可在提示中撤销。')) return;
        const [task] = state.tasks.splice(index, 1);
        await save(); refresh();
        offerUndo('养护待办已删除', async () => { if (!state.tasks.some(item => item.id === task.id)) state.tasks.splice(Math.min(index, state.tasks.length), 0, task); await save(); refresh(); });
      }
      return;
    }
    if (action === 'v59-undo') {
      const item = undo;
      if (!item || item.token !== element.dataset.token || item.expires < Date.now()) return;
      undo = null; clearTimeout(noticeTimer); await item.restore(); toast('已撤销删除'); return;
    }
    return originalAct(action, element);
  };
  window.yiyuCare = { checkKey, dismissed, checked, nextCheckDate };
})();

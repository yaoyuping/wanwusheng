/* 万物生 v5.9 · 可删除的养护记录、待办与手机提醒。 */
(() => {
  'use strict';
  let undo = null;
  const checkKey = plant => `${plant.lastWatered || ''}|${Math.max(1, Number(plant.interval) || 7)}`;
  const dismissed = plant => plant.dismissedCareCheck === checkKey(plant);
  const checkLog = (plant, log, day) => log.action === '检查盆土' && log.careCheckKey === checkKey(plant) && (!day || log.date === day);
  const checked = (plant, day = stamp()) => (plant.logs || []).some(log => checkLog(plant, log, day));
  const isCheckRecord = log => log.action === '检查盆土' && typeof log.careCheckKey === 'string';
  const isWaterRecord = log => log.action === '浇水' && log.careTask === 'watering';
  function correctionButton(plantId, log) {
    return isCheckRecord(log) ? `<button type="button" class="v2-text-button v59-correct-water" data-action="v59-check-to-water" data-id="${esc(plantId)}" data-log-id="${esc(log.id)}">改为浇水</button>` : '';
  }
  function recordWater(plant, log) {
    log.carePreviousWatered = plant.lastWatered && plant.lastWatered <= log.date ? plant.lastWatered : '';
    log.action = '浇水'; log.careTask = 'watering';
    if (!log.note || log.note === '已完成盆土检查') log.note = '已完成浇水';
    delete log.careCheckKey;
    if (!plant.lastWatered || log.date >= plant.lastWatered) plant.lastWatered = log.date;
  }
  function removeLog(plant, log) {
    plant.logs = plant.logs.filter(item => item.id !== log.id);
    if (log.action === '浇水' && log.date === plant.lastWatered) {
      plant.lastWatered = [...plant.logs.filter(item => item.action === '浇水').map(item => item.date), log.carePreviousWatered || ''].filter(Boolean).sort().at(-1) || '';
    }
  }
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
  v2dayTasks = day => {
    const completed = state.plants.flatMap(plant => (plant.logs || [])
      .filter(log => log.date === day && (isCheckRecord(log) || isWaterRecord(log)))
      .map(log => ({ id: `care-${log.id}`, date: day, type: log.action, name: plant.name, plantId: plant.id, logId: log.id, generated: true, done: true })));
    const pending = originalDayTasks(day).filter(task => {
      if (!task.generated) return true;
      const plant = state.plants.find(item => item.id === task.plantId);
      return plant && plant.reminder !== false && !dismissed(plant) && !completed.some(item => item.plantId === plant.id);
    });
    return [...pending, ...completed];
  };
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
    if (plant) root.querySelector('.v3-log-header').insertAdjacentHTML('beforeend', `${correctionButton(plant.id, log)}<button type="button" class="v59-delete" data-action="v59-delete-log" data-id="${esc(plant.id)}" data-log-id="${esc(log.id)}" aria-label="删除${esc(log.action || '养护')}记录">删除</button>`);
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
    if (action === 'v59-finish-care') {
      const { id: plantId, day, result, cycle } = element.dataset, token = `care|${plantId}|${day}`;
      const plant = state.plants.find(item => item.id === plantId);
      if (!plant || changingTasks.has(token) || !['water', 'check'].includes(result)) return;
      if (cycle !== checkKey(plant) || v2dayTasks(day).some(task => task.generated && task.plantId === plantId && task.done)) {
        closeModal(); render(); toast('记录已更新，请查看最新养护状态'); return;
      }
      changingTasks.add(token); element.disabled = true;
      try {
        const log = { id: id(), date: day, action: '检查盆土', note: '已完成盆土检查', careCheckKey: checkKey(plant) };
        if (result === 'water') recordWater(plant, log);
        plant.logs ||= []; plant.logs.unshift(log);
        state.isDemo = false; await save(); closeModal(); render();
        toast(result === 'water' ? '已记录浇水，下次提醒日期已更新' : '已记录盆土检查，明天继续提醒');
      } finally { changingTasks.delete(token); element.disabled = false; }
      return;
    }
    if (action === 'v59-check-to-water') {
      const plant = state.plants.find(item => item.id === element.dataset.id);
      const log = plant?.logs?.find(item => item.id === element.dataset.logId);
      if (!log || !isCheckRecord(log)) return;
      const before = { ...log }, beforeWatered = plant.lastWatered;
      recordWater(plant, log);
      const afterWatered = plant.lastWatered;
      await save(); refresh(plant.id);
      offerUndo('已改为浇水，下次提醒日期已更新', async () => {
        if (!state.plants.includes(plant) || !plant.logs.includes(log)) return;
        delete log.careTask; delete log.carePreviousWatered; Object.assign(log, before);
        if (plant.lastWatered === afterWatered) plant.lastWatered = beforeWatered;
        await save(); refresh(plant.id);
      });
      return;
    }
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
          const log = plant.logs?.find(item => item.id === element.dataset.logId);
          if (log && (isCheckRecord(log) || isWaterRecord(log))) { removeLog(plant, log); done = false; }
          else {
            if (element.dataset.logId) return;
            if (day > stamp()) { toast('请在实际养护当天记录结果'); return; }
            const attrs = `data-action="v59-finish-care" data-id="${esc(plant.id)}" data-day="${esc(day)}" data-cycle="${esc(checkKey(plant))}"`;
            modal('记录养护结果 · ' + plant.name, `<p class="subtle">请选择这次实际做的养护。</p><div class="v59-care-results"><button type="button" class="primary-btn" ${attrs} data-result="water"><strong>已浇水</strong><small>保存浇水记录，按设定间隔安排下次提醒</small></button><button type="button" class="outlined-btn" ${attrs} data-result="check"><strong>仅检查，未浇水</strong><small>保存检查盆土记录，明天继续提醒</small></button></div><div class="modal-actions"><button type="button" class="outlined-btn" data-action="close-modal">取消</button></div>`);
            return;
          }
        }
        state.isDemo = false; await save(); render();
        toast(done ? '待办已完成' : '已恢复为待办');
      } finally { changingTasks.delete(token); element.disabled = false; }
      return;
    }
    if (action === 'v59-delete-log') {
      const plant = state.plants.find(item => item.id === element.dataset.id);
      const index = plant?.logs?.findIndex(log => log.id === element.dataset.logId) ?? -1;
      if (index < 0 || !confirm('删除这条养护记录及其照片？删除后可在提示中撤销。')) return;
      const beforeWatered = plant.lastWatered, log = plant.logs[index];
      removeLog(plant, log);
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
        if (element.dataset.logId) return act('v59-delete-log', { dataset: { id: element.dataset.plantId, logId: element.dataset.logId } });
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
      undo = null; clearTimeout(noticeTimer); await item.restore(); toast('已撤销'); return;
    }
    return originalAct(action, element);
  };
  window.yiyuCare = { checkKey, dismissed, checked, nextCheckDate, correctionButton };
})();

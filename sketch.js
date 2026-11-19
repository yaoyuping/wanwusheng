/* 万物生 · 植物手账。复用已有养护保存、提醒与撤销逻辑。 */
(() => {
  'use strict';
  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
  const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(value + 'T12:00:00').getTime());
  const dateOf = day => new Date(day + 'T12:00:00');
  const weekStart = day => v2plusDate(day, -(dateOf(day).getDay() + 6) % 7);
  let monthOpen = false, pendingOnly = false, lunarFormat;
  try { lunarFormat = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric', month: 'long' }); } catch { /* Optional lunar labels. */ }
  function lunar(day) {
    if (!lunarFormat) return '';
    const parts = lunarFormat.formatToParts(dateOf(day)), n = Number(parts.find(part => part.type === 'day')?.value);
    if (!n || n > 30) return '';
    if (n === 1) return parts.find(part => part.type === 'month')?.value || '初一';
    if (n === 10) return '初十'; if (n === 20) return '二十'; if (n === 30) return '三十';
    return (n < 10 ? '初' : n < 20 ? '十' : '廿') + '一二三四五六七八九'[(n - 1) % 10];
  }
  function sprig() {
    return '<svg viewBox="0 0 70 80" class="sk-sprig" aria-hidden="true" fill="none"><path d="M24 70Q39 48 40 12" stroke="currentColor" stroke-width="1.6"/><path d="M37 47Q12 46 15 27Q38 28 37 47ZM40 29Q58 26 57 9Q38 12 40 29ZM32 60Q53 61 59 41Q39 40 32 60Z" fill="#c6d4ad" stroke="currentColor" stroke-width="1.4"/><path d="M20 33L35 44M43 25L53 14M37 55L53 46" stroke="currentColor" stroke-width=".8"/></svg>';
  }
  v50BotanicalArt = function() {
    return '<figure class="sk-botanical-plate" aria-hidden="true"><img src="assets/botanical/camellia.webp" alt="" width="933" height="1400" fetchpriority="high"><figcaption>山茶 · 草木有时</figcaption></figure>';
  };
  const illustration = kind => `<img class="fl-illustration" src="assets/botanical/${kind}.webp" alt="" aria-hidden="true" width="650" height="867">`;
  function botanicalPage(view, kind, headingSelector, kicker, description, plant) {
    return function() {
      const root = document.createElement('div'); root.innerHTML = view();
      if (kind === 'plants') root.querySelector('.v3-plants-banner')?.remove();
      const heading = root.querySelector(headingSelector);
      if (heading) {
        heading.classList.add('fl-heading');
        const copy = heading.firstElementChild;
        copy.classList.add('fl-heading-copy');
        copy.querySelectorAll('.v50-section-kicker').forEach(node => node.remove());
        copy.insertAdjacentHTML('afterbegin', `<span class="fl-eyebrow">${kicker}</span>`);
        let subtitle = copy.querySelector('p');
        if (!subtitle) { subtitle = document.createElement('p'); copy.append(subtitle); }
        subtitle.textContent = description;
        heading.querySelector('.v50-identify-badge')?.remove();
        if (kind === 'recognize') heading.querySelector('h1').innerHTML = '拍一张，<br>认识它。';
        [...heading.children].filter(node => node.tagName === 'BUTTON').forEach(button => copy.append(button));
        heading.insertAdjacentHTML('beforeend', illustration(plant));
        // Lead with the illustrated title before weather or settings panels.
        if (kind === 'settings' || kind === 'plants') root.prepend(heading);
      }
      return `<div class="fl-page fl-${kind}">${root.innerHTML}</div>`;
    };
  }
  plantsView = botanicalPage(plantsView, 'plants', '.page-heading', '草木相伴', '把每一片新叶，写进生活。', 'fern');
  atlasView = botanicalPage(atlasView, 'atlas', '.page-heading', '山野拾遗', '记下一次驻足，收藏一段相遇。', 'plum');
  recognizeView = botanicalPage(recognizeView, 'recognize', '.v50-identify-head', '识得草木', '从一张照片，认识眼前的生命。', 'camellia');
  settingsView = botanicalPage(settingsView, 'settings', '.page-heading', '手记小笺', '安放日常，也珍藏每一次记录。', 'plum');
  function tone(type) { return /浇水|盆土/.test(type) ? 'water' : /施肥|换盆/.test(type) ? 'feed' : /病|虫/.test(type) ? 'health' : 'note'; }
  function preview(plant, type) {
    return imageSrc(plant?.image) ? imgTag(plant.image, plant.name) : `<span class="sk-photo-placeholder">${v50Icon(tone(type) === 'water' ? 'drop' : 'sprout', 29)}</span>`;
  }
  function taskCard(task, day) {
    const plant = state.plants.find(item => item.id === task.plantId), action = task.generated ? 'v59-toggle-check' : 'v2-toggle-task';
    const name = plant?.name || task.name || '', type = task.type || '养护待办', late = !task.done && day < stamp();
    const attrs = `data-action="${action}" data-id="${esc(task.generated ? task.plantId : task.id)}" data-day="${esc(day)}" data-log-id="${esc(task.logId || '')}"`;
    const label = task.done ? '恢复' : task.generated ? '记录结果' : '完成';
    return `<article class="sk-task sk-${tone(type)} ${task.done ? 'is-done' : ''} ${late ? 'is-overdue' : ''}">
      <div class="sk-task-main"><div class="sk-task-photo">${preview(plant, type)}</div><div class="sk-task-copy"><h3>${esc(type)}${name ? ` <span>·</span> ${esc(name)}` : ''}</h3><div class="sk-task-meta">${task.time ? `<time>${esc(task.time)}</time>` : ''}<span class="sk-status">${task.done ? '已完成' : late ? '待补做' : '待完成'}</span>${late ? '<small>已过计划日期</small>' : task.generated && !task.done ? '<small>先看看盆土</small>' : ''}</div>${task.note ? `<p>${esc(task.note)}</p>` : ''}</div></div>
      <div class="sk-task-actions"><button type="button" class="v59-task-check" role="checkbox" aria-checked="${Boolean(task.done)}" aria-label="${esc(label + name + '的' + type)}" ${attrs}>${task.done ? '✓' : ''}</button><button type="button" class="v2-text-button sk-task-complete" ${attrs}>${label}</button>${plant ? `<button type="button" class="sk-plant-link" data-action="v2-open-plant" data-id="${esc(plant.id)}">查看植物 ↗</button>` : ''}<button type="button" class="v59-delete sk-task-delete" data-action="v59-delete-task" data-id="${esc(task.id)}" data-plant-id="${esc(task.plantId || '')}" data-generated="${task.generated ? '1' : '0'}" data-log-id="${esc(task.logId || '')}" aria-label="删除${esc(type)}待办">删除</button></div>
    </article>`;
  }
  function logCard(log, plant) {
    const photo = imageSrc(log.image) ? `<button type="button" class="sk-log-photo" data-action="v57-view-plant-photo" data-id="${esc(plant.id)}" data-log-id="${esc(log.id)}" aria-label="查看养护照片大图">${imgTag(log.image, plant.name)}</button>` : '';
    return `<article class="sk-log"><span class="sk-log-symbol">${v50Icon(tone(log.action || '') === 'water' ? 'drop' : 'leaf', 20)}</span><div class="sk-log-copy"><b>${esc(log.action || '养护')} · ${esc(plant.name)}</b>${log.time ? `<time>${esc(log.time)}</time>` : ''}${log.note ? `<p>${esc(log.note)}</p>` : ''}${photo}${window.yiyuCare.correctionButton(plant.id, log)}</div><button type="button" class="v59-delete" data-action="v59-delete-log" data-id="${esc(plant.id)}" data-log-id="${esc(log.id)}" aria-label="删除${esc(plant.name)}的养护记录">删除</button></article>`;
  }
  function monthGrid(selected, taskDays, logDays) {
    const month = ui.calendarMonth || selected.slice(0, 7), first = month + '-01', start = weekStart(first);
    const d = dateOf(first), length = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const cells = Math.ceil(((d.getDay() + 6) % 7 + length) / 7) * 7;
    return `<section class="sk-month-panel" id="sk-month-panel" ${monthOpen ? '' : 'hidden'}><div class="sk-month-controls"><button type="button" data-action="v2-month-prev" aria-label="上个月">‹</button><label>选择月份<input type="month" id="sk-month-input" value="${esc(month)}" aria-label="选择月份"></label><button type="button" data-action="v2-month-next" aria-label="下个月">›</button></div><div class="sk-month-grid">${weekdays.map(day => `<span>${day}</span>`).join('')}${Array.from({ length: cells }, (_, i) => {
      const day = v2plusDate(start, i), count = (taskDays.get(day) || []).length + (logDays.get(day) || []).length;
      return `<button type="button" class="${day.slice(0, 7) !== month ? 'outside' : ''} ${day === selected ? 'selected' : ''}" data-action="v2-select-day" data-day="${day}" aria-label="${day}${count ? '，有养护安排' : ''}" aria-pressed="${day === selected}">${Number(day.slice(-2))}${count ? '<i></i>' : ''}</button>`;
    }).join('')}</div></section>`;
  }
  careView = function() {
    if (window.yiyuCare.normalize()) void save();
    const selected = validDay(ui.selectedDay) ? ui.selectedDay : stamp(), start = weekStart(selected), end = v2plusDate(start, 6);
    const days = Array.from({ length: 7 }, (_, i) => v2plusDate(start, i));
    const taskDays = new Map(), logDays = new Map();
    for (const plant of state.plants) for (const log of plant.logs || []) {
      if (!validDay(log.date)) continue;
      if (!logDays.has(log.date)) logDays.set(log.date, []);
      logDays.get(log.date).push({ log, plant });
    }
    // Include overdue manual tasks before the visible week when viewing today.
    const overdueDays = selected === stamp() ? [...new Set((state.tasks || []).filter(task => !task.done && validDay(task.date) && task.date < start).map(task => task.date))].sort() : [];
    const month = ui.calendarMonth || selected.slice(0, 7), gridStart = weekStart(month + '-01');
    for (const day of new Set([...days, ...overdueDays, ...Array.from({ length: 42 }, (_, i) => v2plusDate(gridStart, i))])) taskDays.set(day, v2dayTasks(day));
    const visible = [...overdueDays, ...days];
    const taskCount = visible.reduce((n, day) => n + (taskDays.get(day) || []).filter(task => !task.done).length, 0);
    const groups = visible.map(day => {
      const tasks = (taskDays.get(day) || []).filter(task => (!overdueDays.includes(day) || !task.done) && (!pendingOnly || !task.done));
      const logs = pendingOnly || overdueDays.includes(day) ? [] : (logDays.get(day) || []).slice().sort((a, b) => (b.log.time || '').localeCompare(a.log.time || ''));
      if (!tasks.length && !logs.length && day !== selected) return '';
      const date = dateOf(day);
      return `<section class="sk-day ${day === selected ? 'is-selected' : ''}" id="sk-day-${day}" data-day="${day}"><div class="sk-date-label"><span>周${weekdays[(date.getDay() + 6) % 7]}</span><strong>${date.getDate()}</strong><small>${date.getMonth() + 1}月</small>${day === stamp() ? '<em>今天</em>' : ''}</div><div class="sk-day-content">${tasks.map(task => taskCard(task, day)).join('')}${logs.length ? `<div class="sk-record-heading">${v50Icon('book', 16)} 养护记录 <span>${logs.length}</span></div>${logs.map(({ log, plant }) => logCard(log, plant)).join('')}` : ''}${!tasks.length && !logs.length ? `<div class="sk-day-empty">${sprig()}<b>${pendingOnly ? '这天暂无未完成待办' : '这一天，留点时间看看叶子'}</b><p>记录一点变化，就是照料的开始。</p><button type="button" data-action="v2-new-task" data-day="${day}">＋ 添一项养护</button></div>` : ''}</div></section>`;
    }).join('');
    return `<div class="sk-care"><header class="sk-care-heading fl-heading"><div class="fl-heading-copy"><span class="fl-eyebrow">草木岁时</span><h1>养护日历</h1><p>浇水、修枝，慢慢照料四季。</p></div>${illustration('fern')}<button type="button" class="sk-round" data-nav="home" aria-label="返回首页">${ico('home', 20)}</button></header>
      <div class="sk-calendar ${monthOpen ? 'is-expanded' : ''}"><div class="sk-calendar-top"><button type="button" class="sk-month-title" data-action="sk-toggle-month" aria-expanded="${monthOpen}" aria-controls="sk-month-panel">${Number(selected.slice(0, 4))}年${Number(selected.slice(5, 7))}月 <span>${monthOpen ? '⌃' : '⌄'}</span></button><div class="sk-week-actions"><button type="button" data-action="sk-prev-week" aria-label="上一周">‹</button><button type="button" data-action="v2-month-today">今天</button><button type="button" data-action="sk-next-week" aria-label="下一周">›</button></div></div>
      ${monthGrid(selected, taskDays, logDays)}
      <div class="sk-week" aria-label="本周日期">${days.map((day, i) => `<button type="button" class="sk-week-day ${day === selected ? 'selected' : ''} ${day === stamp() ? 'is-today' : ''}" data-action="v2-select-day" data-day="${day}" aria-label="${day}，星期${weekdays[i]}" aria-pressed="${day === selected}"><span>${weekdays[i]}</span><strong>${Number(day.slice(-2))}</strong><small>${esc(lunar(day))}</small><i class="${(taskDays.get(day) || []).length || (logDays.get(day) || []).length ? 'has-activity' : ''}"></i></button>`).join('')}</div></div>
      <div class="sk-agenda-heading"><div><h2>本周的照料</h2><p>${v2date(start)} — ${v2date(end)} · ${taskCount} 项待完成${overdueDays.length ? '，含之前未完成的待办' : ''}</p></div><button type="button" class="sk-filter ${pendingOnly ? 'active' : ''}" data-action="sk-filter-pending" aria-pressed="${pendingOnly}">${v50Icon('check', 16)} 只看待办</button></div>
      <div class="sk-agenda">${groups}</div>
      <details class="sk-care-roster"><summary>${v50Icon('sprout', 21)} 植物养护清单 <span>${state.plants.length} 株</span></summary><div class="care-list">${state.plants.length ? state.plants.map(careItem).join('') : '<p>添一株植物，把照料的日常记在这里。</p>'}</div></details>
      <p class="sk-care-note">${sprig()} 每次检查后，记下「已浇水」或「仅检查」，让下一次提醒更贴近植物的节奏。</p>
      <button type="button" class="sk-add-task" data-action="v2-new-task" data-day="${selected}" aria-label="添加养护待办">${ico('plus', 26)}<span>记一项养护</span></button>
    </div>`;
  };
  const oldAct = act;
  act = async function(action, element) {
    if (action === 'sk-toggle-month') { monthOpen = !monthOpen; ui.calendarMonth = (ui.selectedDay || stamp()).slice(0, 7); render(); return; }
    if (action === 'sk-filter-pending') { pendingOnly = !pendingOnly; render(); return; }
    if (action === 'sk-prev-week' || action === 'sk-next-week') {
      ui.selectedDay = v2plusDate(ui.selectedDay || stamp(), action === 'sk-prev-week' ? -7 : 7);
      ui.calendarMonth = ui.selectedDay.slice(0, 7); monthOpen = false; render(); return;
    }
    if (action === 'v2-select-day' && ui.tab === 'care') {
      if (!validDay(element.dataset.day)) return;
      ui.selectedDay = element.dataset.day; ui.calendarMonth = ui.selectedDay.slice(0, 7); monthOpen = false; render();
      document.getElementById('sk-day-' + ui.selectedDay)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    if (action === 'v2-month-today') { monthOpen = false; pendingOnly = false; }
    return oldAct(action, element);
  };
  document.addEventListener('change', event => {
    if (event.target.id !== 'sk-month-input' || !/^\d{4}-\d{2}$/.test(event.target.value)) return;
    ui.calendarMonth = event.target.value; render();
  });
  const oldRender = render;
  render = function() {
    document.body.classList.toggle('sk-care-open', ui.tab === 'care');
    oldRender();
  };
})();

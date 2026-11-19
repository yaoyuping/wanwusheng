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
  function tone(type) { return /浇水|盆土/.test(type) ? 'water' : /施肥|换盆/.test(type) ? 'feed' : /病|虫/.test(type) ? 'health' : /修剪/.test(type) ? 'prune' : 'note'; }
  // Small pen-and-wash drawings, shared by care categories and navigation.
  function inkIcon(kind, size = 24) {
    const drawings = {
      water: 'M13 24Q23 22 32 24L30 39Q22 42 15 38ZM14 27C2 17 2 39 15 35M31 29L39 18L44 20L32 35M19 23L19 18L27 18L28 23M40 26L39 29M45 29L44 32M17 27Q22 25 28 27',
      health: 'M33 29C48 9 19 2 12 15C3 33 28 42 35 27M33 33L43 43M20 29Q15 18 29 15Q32 27 20 29M18 32L27 18M21 26L21 21M23 23L28 22',
      feed: 'M13 26Q23 24 35 26L32 40Q23 43 16 39ZM12 24L36 24L36 29L13 29ZM24 23Q23 12 29 7M25 16Q14 18 13 9Q23 8 25 16M26 13Q29 3 37 6Q36 15 26 13M20 33L20 37',
      prune: 'M16 28Q3 26 7 37Q11 44 19 36Q22 28 15 28M29 29Q41 24 42 34Q43 43 33 40Q26 37 29 29M19 31L36 7Q36 17 25 29M29 32L12 9Q12 20 22 29M23 28L24 29',
      note: 'M9 9L24 12L39 8L40 37L25 41L9 37ZM24 13L25 40M14 16L19 17M14 21L19 22M30 30Q25 18 36 17Q37 28 30 30M28 33L34 21',
      home: 'M5 22L23 6L43 22M10 19L11 40L37 40L38 19M18 39L18 27L28 27L29 39M15 20L23 13L31 20M7 24L6 38',
      camera: 'M7 17L16 17L20 10L29 11L33 17L42 18L41 38L7 39ZM30 28C31 17 15 17 16 28C16 39 32 36 30 27M35 21L37 21M10 19L14 19',
      leaf: 'M10 37C1 12 28 5 40 7C40 30 26 42 12 35M8 43Q18 24 34 13M17 29L15 21M22 23L31 24M27 18L27 13'
    };
    return `<svg class="sk-ink-icon" viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" aria-hidden="true"><path d="M8 18Q12 6 29 9Q43 9 39 28Q37 42 19 39Q4 37 8 18Z" fill="currentColor" opacity=".09"/><path d="${drawings[kind] || drawings.note}" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function preview(plant, type) {
    return imageSrc(plant?.image) ? imgTag(plant.image, plant.name) : `<span class="sk-photo-placeholder">${careDrawing(type, 36)}</span>`;
  }
  const careDrawing = (type, size) => inkIcon(/拍照/.test(type) ? 'camera' : /观察|黄叶/.test(type) ? 'leaf' : tone(type), size);
  const previousHome = homeView;
  homeView = function() {
    const root = document.createElement('div'); root.innerHTML = previousHome();
    const home = root.querySelector('.v50-home');
    if (!home) return root.innerHTML;
    home.classList.add('fl-home-folio');
    home.querySelector('.v50-hero').insertAdjacentHTML('afterbegin', '<span class="fl-book-spine" aria-hidden="true">草木日常</span>');
    home.querySelector('.v50-hero-meta').innerHTML = `<span class="fl-red-seal" aria-hidden="true">草木</span><span>${esc(v50TodayStr())}</span>`;
    const chapters = [['一', '照料今日'], ['二', '窗边草木'], ['三', '山野与日常']];
    home.querySelectorAll('.v50-section-head').forEach((heading, index) => {
      const [number, label] = chapters[index] || ['·', '草木手记'];
      heading.insertAdjacentHTML('afterbegin', `<span class="fl-chapter-number" aria-hidden="true">${number}</span>`);
      heading.querySelector('.v50-section-kicker').textContent = label;
    });
    home.querySelectorAll('.v50-care-item').forEach(button => {
      button.querySelector('.v50-task-symbol').innerHTML = careDrawing(button.textContent, 32);
    });
    const descriptions = ['识得一片叶，认识一株植物', '翻一页，了解草木的习性', '留意叶片，记录细微变化', '把偶遇的草木收进手账'];
    home.querySelectorAll('.v50-shortcuts>button').forEach((button, index) => {
      const title = button.querySelector('strong'), copy = document.createElement('span');
      copy.className = 'fl-shortcut-copy'; title.before(copy); copy.append(title);
      const detail = document.createElement('small'); detail.textContent = descriptions[index]; copy.append(detail);
    });
    return root.innerHTML;
  };
  // Keep the original field values and edit actions; only compose the paper sheets.
  const previousProfileInfo = v3ProfileInfo;
  v3ProfileInfo = function(plant) {
    const root = document.createElement('div'); root.innerHTML = previousProfileInfo(plant);
    const rows = [...root.querySelectorAll('.v3-info-row')];
    const fields = new Map(v3Fields.map((field, index) => [field[1], rows[index]]));
    const sections = [
      { title: '草木名笺', note: '认识这位植物伙伴', art: 'plum', icon: 'leaf', keys: ['name', 'status', 'tags'] },
      { title: '安居与养护', note: '找到适合它的生活节奏', art: 'fern', icon: 'water', keys: ['location', 'light', 'interval', 'reminder'] },
      { title: '入园小记', note: '收藏相遇时的点滴', art: 'camellia', icon: 'note', keys: ['acquired', 'price', 'source'] }
    ];
    const icons = { name: 'leaf', status: 'health', tags: 'note', location: 'home', light: 'leaf', interval: 'water', reminder: 'note', acquired: 'note', price: 'feed', source: 'home' };
    const sheets = sections.map((section, index) => {
      const content = section.keys.map(key => {
        const row = fields.get(key);
        if (!row) return '';
        row.dataset.field = key;
        if (['name', 'status', 'tags', 'interval', 'reminder', 'source'].includes(key)) row.classList.add('fl-info-wide');
        row.querySelector('.v3-info-icon').innerHTML = inkIcon(icons[key], 28);
        return row.outerHTML;
      }).join('');
      return `<section class="v3-info-card fl-info-sheet fl-sheet-${section.art}" aria-label="${section.title}"><header class="fl-sheet-heading"><span class="fl-chapter-number" aria-hidden="true">${['一', '二', '三'][index]}</span><div><h3>${section.title}</h3><p>${section.note}</p></div>${inkIcon(section.icon, 36)}</header><div class="fl-info-grid">${content}</div></section>`;
    }).join('');
    root.querySelector('.v3-info-card')?.remove();
    return `<div class="fl-profile-sheets">${sheets}</div>${root.innerHTML}`;
  };
  const previousPlantDetail = plantDetail;
  plantDetail = function(...args) {
    const result = previousPlantDetail(...args);
    const page = document.querySelector('.v3-plant-detail');
    if (page) {
      page.classList.add('fl-plant-folio');
      const label = page.querySelector('.v3-detail-cover-label');
      if (label) label.textContent = '草木相伴 · 植物档案';
      const symbol = page.querySelector('.v3-insight>span');
      if (symbol) symbol.innerHTML = inkIcon('water', 36);
    }
    return result;
  };
  const previousSightingDetail = sightingDetail;
  sightingDetail = function(...args) {
    const result = previousSightingDetail(...args);
    const page = document.querySelector('.v56-record-page');
    if (page) {
      page.classList.add('fl-record-folio');
      page.querySelector('.v56-record-cover>span').textContent = '山野拾遗 · 发现手账';
      page.querySelectorAll('.v56-section-title').forEach((heading, index) => {
        heading.insertAdjacentHTML('afterbegin', `<span class="fl-chapter-number" aria-hidden="true">${index ? '二' : '一'}</span>`);
      });
    }
    return result;
  };
  const previousLogCard = v3LogCard;
  v3LogCard = function(log) {
    const root = document.createElement('div'); root.innerHTML = previousLogCard(log);
    root.querySelector('.v3-log-card')?.classList.add('sk-' + tone(log.action || ''));
    const symbol = root.querySelector('.v3-log-symbol');
    if (symbol) symbol.innerHTML = careDrawing(log.action || '', 30);
    return root.innerHTML;
  };
  const previousModal = modal;
  modal = function(...args) {
    const result = previousModal(...args);
    document.querySelectorAll('.v3-action-grid>button,.v2-care-option').forEach(option => {
      const type = option.dataset.type || option.querySelector('input')?.value;
      const symbol = option.querySelector('span');
      if (type && symbol) symbol.innerHTML = careDrawing(type, 32);
    });
    return result;
  };
  function careCard(plant, task, day, log) {
    const name = plant?.name || task?.name || '', type = log?.action || task?.type || '养护记录';
    const late = task && !task.done && day < stamp(), done = Boolean(log || task?.done);
    const action = task?.generated ? 'v59-toggle-check' : 'v2-toggle-task';
    const attrs = task ? `data-action="${action}" data-id="${esc(task.generated ? task.plantId : task.id)}" data-day="${esc(day)}" data-log-id="${esc(task.logId || '')}"` : '';
    const label = task?.done ? '恢复' : task?.generated ? '记录结果' : '完成';
    const note = log?.note || task?.note, time = log?.time || task?.time;
    const photo = log && imageSrc(log.image) ? `<button type="button" class="sk-log-photo" data-action="v57-view-plant-photo" data-id="${esc(plant.id)}" data-log-id="${esc(log.id)}" aria-label="查看养护照片大图">${imgTag(log.image, plant.name)}</button>` : '';
    const weather = log ? [log.weather, log.temperature, log.humidity].filter(Boolean).map(esc).join(' · ') : '';
    const deletion = task ? `data-action="v59-delete-task" data-id="${esc(task.id)}" data-plant-id="${esc(task.plantId || '')}" data-generated="${task.generated ? '1' : '0'}" data-log-id="${esc(task.logId || '')}"` : `data-action="v59-delete-log" data-id="${esc(plant.id)}" data-log-id="${esc(log.id)}"`;
    return `<article class="sk-care-card ${task ? 'sk-task' : 'sk-log'} sk-${tone(type)} ${done ? 'is-done' : ''} ${late ? 'is-overdue' : ''}" ${log ? `data-record-key="${esc(JSON.stringify([plant.id, log.id]))}"` : ''}>
      <span class="sk-card-drawing" aria-hidden="true">${careDrawing(type, 68)}</span>
      <div class="sk-task-main"><div class="sk-task-photo">${preview(plant, type)}</div><div class="sk-task-copy"><span class="sk-care-kind">${esc(type)}</span><h3>${esc(name || '养护手记')}</h3><div class="sk-task-meta">${time ? `<time>${esc(time)}</time>` : ''}<span class="sk-status">${task ? task.done ? '已完成' : late ? '待补做' : '待完成' : '已记录'}</span>${late ? '<small>已过计划日期</small>' : task?.generated && !done ? '<small>先看看盆土</small>' : ''}</div></div></div>
      ${note || photo || weather ? `<div class="sk-care-entry">${note ? `<p>${esc(note)}</p>` : ''}${photo}${weather ? `<small>${weather}</small>` : ''}</div>` : ''}
      ${log ? window.yiyuCare.correctionButton(plant.id, log) : ''}
      <div class="sk-task-actions">${task ? `<span class="sk-completion-control"><button type="button" class="v59-task-check" role="checkbox" aria-checked="${Boolean(task.done)}" aria-label="${esc(label + name + '的' + type)}" ${attrs}>${task.done ? '✓' : ''}</button><button type="button" class="v2-text-button sk-task-complete" ${attrs}>${label}</button></span>` : ''}${plant ? `<button type="button" class="sk-plant-link" data-action="v2-open-plant" data-id="${esc(plant.id)}">查看植物 ↗</button>` : ''}<button type="button" class="v59-delete sk-task-delete" ${deletion} aria-label="删除${esc(type)}${log ? '记录' : '待办'}">删除</button></div>
    </article>`;
  }
  function taskCard(task, day, log = null) {
    return careCard(state.plants.find(item => item.id === task.plantId), task, day, log);
  }
  function logCard(log, plant) {
    return careCard(plant, null, log.date, log);
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
      const dayTasks = (taskDays.get(day) || []).filter(task => (!overdueDays.includes(day) || !task.done) && (!pendingOnly || !task.done));
      const logs = pendingOnly || overdueDays.includes(day) ? [] : (logDays.get(day) || []).slice().sort((a, b) => (b.log.time || '').localeCompare(a.log.time || ''));
      // A completed automatic task and its log refer to the same care event.
      // Render it once in the records section, without modifying saved history.
      const linkedTask = (plant, log) => dayTasks.find(task => task.generated && task.done && task.plantId === plant.id && task.logId === log.id);
      const tasks = dayTasks.filter(task => !logs.some(({ plant, log }) => task === linkedTask(plant, log)));
      const recordCards = logs.map(({ log, plant }) => {
        const linked = linkedTask(plant, log);
        return linked ? taskCard(linked, day, log) : logCard(log, plant);
      }).join('');
      if (!tasks.length && !logs.length && day !== selected) return '';
      const date = dateOf(day);
      return `<section class="sk-day ${day === selected ? 'is-selected' : ''}" id="sk-day-${day}" data-day="${day}"><div class="sk-date-label"><span>周${weekdays[(date.getDay() + 6) % 7]}</span><strong>${date.getDate()}</strong><small>${date.getMonth() + 1}月</small>${day === stamp() ? '<em>今天</em>' : ''}</div><div class="sk-day-content">${tasks.map(task => taskCard(task, day)).join('')}${logs.length ? `<div class="sk-record-heading">${v50Icon('book', 16)} 养护记录 <span>${logs.length}</span></div>${recordCards}` : ''}${!tasks.length && !logs.length ? `<div class="sk-day-empty">${sprig()}<b>${pendingOnly ? '这天暂无未完成待办' : '这一天，留点时间看看叶子'}</b><p>记录一点变化，就是照料的开始。</p><button type="button" data-action="v2-new-task" data-day="${day}">＋ 添一项养护</button></div>` : ''}</div></section>`;
    }).join('');
    return `<div class="sk-care"><header class="sk-care-heading fl-heading"><div class="fl-heading-copy"><span class="fl-eyebrow">草木岁时</span><h1>养护日历</h1><p>浇水、修枝，慢慢照料四季。</p></div>${illustration('fern')}<button type="button" class="sk-round" data-nav="home" aria-label="返回首页">${ico('home', 20)}</button></header>
      <div class="sk-calendar ${monthOpen ? 'is-expanded' : ''}"><div class="sk-calendar-top"><button type="button" class="sk-month-title" data-action="sk-toggle-month" aria-expanded="${monthOpen}" aria-controls="sk-month-panel">${Number(selected.slice(0, 4))}年${Number(selected.slice(5, 7))}月 <span>${monthOpen ? '⌃' : '⌄'}</span></button><div class="sk-week-actions"><button type="button" data-action="sk-prev-week" aria-label="上一周">‹</button><button type="button" data-action="v2-month-today">今天</button><button type="button" data-action="sk-next-week" aria-label="下一周">›</button></div></div>
      ${monthGrid(selected, taskDays, logDays)}
      <div class="sk-week" aria-label="本周日期">${days.map((day, i) => `<button type="button" class="sk-week-day ${day === selected ? 'selected' : ''} ${day === stamp() ? 'is-today' : ''}" data-action="v2-select-day" data-day="${day}" aria-label="${day}，星期${weekdays[i]}" aria-pressed="${day === selected}"><span>${weekdays[i]}</span><strong>${Number(day.slice(-2))}</strong><small>${esc(lunar(day))}</small><i class="${(taskDays.get(day) || []).length || (logDays.get(day) || []).length ? 'has-activity' : ''}"></i></button>`).join('')}</div></div>
      <div class="sk-agenda-heading"><div><h2>本周的照料</h2><p>${v2date(start)} — ${v2date(end)} · ${taskCount} 项待完成${overdueDays.length ? '，含之前未完成的待办' : ''}</p></div><div class="sk-agenda-tools"><button type="button" class="sk-filter ${pendingOnly ? 'active' : ''}" data-action="sk-filter-pending" aria-pressed="${pendingOnly}">${v50Icon('check', 16)} 只看待办</button><button type="button" class="sk-add-task" data-action="v2-new-task" data-day="${selected}" aria-label="添加养护待办">${ico('plus', 18)}<span>新增待办</span></button></div></div>
      <div class="sk-agenda">${groups}</div>
      <details class="sk-care-roster"><summary>${v50Icon('sprout', 21)} 植物养护清单 <span>${state.plants.length} 株</span></summary><div class="care-list">${state.plants.length ? state.plants.map(careItem).join('') : '<p>添一株植物，把照料的日常记在这里。</p>'}</div></details>
      <p class="sk-care-note">${sprig()} 每次检查后，记下「已浇水」或「仅检查」，让下一次提醒更贴近植物的节奏。</p>
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
    const navIcons = { home: 'home', atlas: 'note', recognize: 'camera', plants: 'leaf', care: 'water' };
    document.querySelectorAll('#desktop-nav [data-nav], #mobile-nav [data-nav]').forEach(button => {
      const kind = navIcons[button.dataset.nav], icon = button.querySelector('svg');
      if (kind && icon) icon.outerHTML = inkIcon(kind, 28);
    });
    document.querySelectorAll('.v50-shortcuts>button').forEach(button => {
      const kind = button.dataset.nav === 'recognize' ? 'camera' : button.dataset.action === 'v48-local-issues' ? 'health' : button.dataset.action === 'new-sighting' ? 'leaf' : 'note';
      const symbol = button.querySelector('.v50-action-illustration');
      if (symbol) symbol.innerHTML = inkIcon(kind, 36);
    });
  };
})();

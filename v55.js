/* 万物生 v5.5 · 自定义植物选项、标签筛选与简洁拍照识别。 */
(() => {
  'use strict';
  const keys = ['interval', 'location', 'source', 'status'];
  const labels = { interval: '浇水间隔（天）', location: '摆放位置', source: '购买渠道', status: '植物状态' };

  function normalized(key, raw) {
    const value = String(raw || '').trim().replace(/\s+/g, ' ');
    if (key === 'interval') {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 3650) throw Error('浇水间隔请输入 1–3650 天的整数');
      return String(Number(value));
    }
    if (!value || value.length > 30) throw Error(`${labels[key]}请输入 1–30 个字`);
    return value;
  }

  function installOption(form, key, value, isNew = false) {
    const select = form.querySelector(`select[name="${key}"]`);
    if (!select || !value) return;
    let option = [...select.options].find(item => item.value === value);
    if (!option) {
      option = new Option(key === 'interval' ? `${value}天` : value, value);
      select.add(option);
      const segments = select.closest('.field')?.querySelector('.v46-segment-row');
      if (segments) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'v46-segment';
        button.dataset.action = 'v46-pick'; button.dataset.key = key; button.dataset.value = value;
        button.setAttribute('aria-pressed', 'false');
        const symbol = document.createElement('span'); symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = key === 'interval' ? '◷' : '✦';
        const tick = document.createElement('span'); tick.className = 'tick'; tick.setAttribute('aria-hidden', 'true'); tick.textContent = '✓';
        button.append(symbol, document.createTextNode(option.textContent), tick); segments.append(button);
      }
    }
    if (isNew) option.dataset.v55New = '1';
    if (isNew) {
      select.value = value;
      select.closest('.field')?.querySelectorAll('.v46-segment').forEach(button => {
        const active = button.dataset.value === value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  const oldPlantForm = plantForm;
  plantForm = function(pid = null, prefill = {}) {
    oldPlantForm(pid, prefill);
    const form = document.getElementById('plant-form');
    if (!form) return;
    for (const key of keys) {
      const select = form.querySelector(`select[name="${key}"]`);
      if (!select) continue;
      const saved = Array.isArray(state.optionLibrary?.[key]) ? state.optionLibrary[key] : [];
      for (const value of [...saved, ...state.plants.map(plant => plant[key])]) {
        try { installOption(form, key, normalized(key, value)); } catch { /* ignore invalid legacy options */ }
      }
      const row = document.createElement('div'); row.className = 'v55-custom-option';
      const input = document.createElement('input'); input.type = key === 'interval' ? 'number' : 'text';
      input.inputMode = key === 'interval' ? 'numeric' : 'text';
      input.id = `v55-custom-${key}`; input.maxLength = 30;
      if (key === 'interval') { input.min = '1'; input.max = '3650'; input.step = '1'; }
      input.placeholder = key === 'interval' ? '自定义天数' : `自定义${labels[key]}`;
      input.setAttribute('aria-label', input.placeholder);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'outlined-btn';
      button.dataset.action = 'v55-add-option'; button.dataset.key = key; button.textContent = '＋ 添加选项';
      row.append(input, button);
      select.closest('.field')?.append(row);
    }
  };

  const oldSubmit = handleSubmit;
  handleSubmit = async function(form) {
    if (form.id !== 'plant-form') return oldSubmit(form);
    const added = Object.fromEntries(keys.map(key => [key, [...form.querySelectorAll(`select[name="${key}"] option[data-v55-new]`)].map(option => option.value)]));
    await oldSubmit(form);
    if (Object.values(added).every(values => !values.length)) return;
    const library = state.optionLibrary && typeof state.optionLibrary === 'object' && !Array.isArray(state.optionLibrary) ? state.optionLibrary : {};
    for (const key of keys) library[key] = [...new Set([...(Array.isArray(library[key]) ? library[key] : []), ...added[key]])].slice(0, 100);
    state.optionLibrary = library;
    await save();
  };

  const oldAct = act;
  act = async function(action, element) {
    if (action === 'v55-add-option') {
      const key = element.dataset.key, form = element.closest('#plant-form');
      if (!form || !keys.includes(key)) return;
      const input = form.querySelector(`#v55-custom-${key}`);
      try { installOption(form, key, normalized(key, input?.value), true); input.value = ''; }
      catch (error) { toast(error.message); input?.focus(); }
      return;
    }
    return oldAct(action, element);
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target?.id?.startsWith('v55-custom-')) {
      event.preventDefault();
      event.target.parentElement?.querySelector('[data-action="v55-add-option"]')?.click();
    }
  });

  const oldRecognize = recognizeView;
  recognizeView = function() {
    // The simple camera flow always sends the one photo the user can see.
    ui.v453ExtraImages = []; ui.v453PrimaryOrgan = 'auto';
    const root = document.createElement('div'); root.innerHTML = oldRecognize();
    const plantnet = root.querySelector('#v52-plantnet-panel');
    plantnet?.querySelector('.v453-capture')?.remove();
    plantnet?.querySelector('.v47-recognize-side')?.remove();
    const plantnetHint = plantnet?.querySelector('.v47-card-overline small');
    if (plantnetHint) plantnetHint.textContent = '拍摄或选择一张清晰照片';
    const deepseek = root.querySelector('#v53-deepseek-panel');
    const photo = deepseek?.querySelector('.v53-ai-photo');
    const question = deepseek?.querySelector('.v53-ai-question');
    if (photo && question) {
      const step = photo.querySelector('.v53-step');
      if (step) step.innerHTML = '植物照片 <small>拍摄或选择一张清晰照片</small>';
      const note = question.querySelector('.v53-ai-note');
      if (note) { note.textContent = '点击「开始 AI 识别」后才会发送照片；候选物种与百科草稿仍需核对。'; photo.append(note); }
      const run = question.querySelector('#v2-ai-run');
      if (run) photo.append(run);
      question.remove();
    }
    const deepseekLabel = root.querySelector('[data-action="v51-deepseek-identify"] small');
    if (deepseekLabel) deepseekLabel.textContent = ui.v53DeepSeekOpen ? '已展开 · 上传照片' : '拍照识别 · 百科介绍';
    return root.innerHTML;
  };
})();
